import { Router } from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { config, googleOAuthConfigured, staffLoginConfigured } from "../config.js";
import { isSiteAdminEmail, requireAuth, signToken, syncSiteAdmin } from "../auth.js";
import { sendPasswordReset } from "../email.js";
import {
  exchangeGoogleCode,
  googleAuthUrl,
  loadGoogleProfile,
  signExchangeCode,
  upsertGoogleUser,
  verifyGoogleState,
} from "../google-oauth.js";
import { HttpError, wrap } from "../http.js";
import { Conversation, ReadState, User } from "../models.js";
import { meDto } from "../present.js";
import { assertUsername, hashToken, newToken } from "../social.js";

const router = Router();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Try again later." },
});

const registerSchema = z.object({
  email: z.string().email("Enter a valid email"),
  username: z.string().trim().toLowerCase(),
  displayName: z.string().trim().min(1).max(40),
  password: z.string().min(8, "Password must be at least 8 characters"),
  acceptedTerms: z.literal(true, { errorMap: () => ({ message: "Accept the terms to create an account" }) }),
});

router.post(
  "/register",
  limiter,
  wrap(async (req, res) => {
    const body = registerSchema.parse(req.body);
    assertUsername(body.username);
    const existing = await User.findOne({ $or: [{ email: body.email.toLowerCase() }, { username: body.username }] });
    if (existing) throw new HttpError(409, "That email or username is already in use");

    const user = await User.create({
      email: body.email.toLowerCase(),
      username: body.username,
      displayName: body.displayName,
      passwordHash: await bcrypt.hash(body.password, 12),
      acceptedTermsAt: new Date(),
      role: isSiteAdminEmail(body.email) ? "admin" : "user",
    });

    const topics = await Conversation.find({ type: "topic" });
    if (topics.length) {
      await ReadState.insertMany(
        topics.map((topic) => ({ user: user._id, conversation: topic._id, lastReadAt: new Date() })),
        { ordered: false },
      ).catch(() => undefined);
    }

    res.status(201).json({ token: signToken(String(user._id)), user: meDto(user) });
  }),
);

router.post(
  "/login",
  limiter,
  wrap(async (req, res) => {
    const body = z
      .object({
        email: z.string().email(),
        password: z.string().min(1),
      })
      .parse(req.body);
    const user = await User.findOne({ email: body.email.toLowerCase() }).select("+passwordHash");
    if (!user) throw new HttpError(401, "Email or password is incorrect");
    if (!user.passwordHash) throw new HttpError(401, "This account uses Google sign-in. Continue with Google instead.");
    const match = await bcrypt.compare(body.password, user.passwordHash);
    if (!match) throw new HttpError(401, "Email or password is incorrect");
    if (user.suspended) throw new HttpError(403, "You are currently suspended");
    await syncSiteAdmin(user);
    res.json({ token: signToken(String(user._id)), user: meDto(user) });
  }),
);

function authFailRedirect(res: { redirect: (url: string) => void }, message: string, path = "/login") {
  const target = new URL(path, config.appUrl);
  target.searchParams.set("error", message);
  res.redirect(target.toString());
}

function friendlyGoogleError(error: unknown) {
  const raw = error instanceof Error ? error.message : "Google sign-in failed.";
  if (/google_sub|password_hash|null value|schema cache|column/i.test(raw)) {
    return "Database is not ready for Google sign-in. Run apps/api/supabase/google-auth-migration.sql in Supabase.";
  }
  if (/invalid_grant|redirect_uri_mismatch|invalid_client/i.test(raw)) {
    return "Google OAuth settings are wrong. Check Client ID, secret, and redirect URIs.";
  }
  return raw.slice(0, 180);
}

router.get(
  "/google",
  limiter,
  wrap(async (_req, res) => {
    if (!googleOAuthConfigured()) {
      authFailRedirect(res, "Google sign-in is not configured yet. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET on Vercel, then redeploy.");
      return;
    }
    res.redirect(googleAuthUrl());
  }),
);

router.get(
  "/google/callback",
  limiter,
  wrap(async (req, res) => {
    try {
      if (!googleOAuthConfigured()) {
        authFailRedirect(res, "Google sign-in is not configured yet.", "/auth/callback");
        return;
      }
      if (typeof req.query.error === "string") {
        authFailRedirect(
          res,
          req.query.error === "access_denied" ? "Google sign-in was cancelled." : "Google sign-in failed.",
          "/auth/callback",
        );
        return;
      }
      verifyGoogleState(typeof req.query.state === "string" ? req.query.state : undefined);
      const code = typeof req.query.code === "string" ? req.query.code : "";
      if (!code) {
        authFailRedirect(res, "Google sign-in was incomplete.", "/auth/callback");
        return;
      }
      const profile = await loadGoogleProfile(code);
      const user = await upsertGoogleUser(profile);
      const target = new URL("/auth/callback", config.appUrl);
      target.searchParams.set("code", signExchangeCode(String(user._id)));
      res.redirect(target.toString());
    } catch (error) {
      authFailRedirect(res, friendlyGoogleError(error), "/auth/callback");
    }
  }),
);

router.post(
  "/google/exchange",
  limiter,
  wrap(async (req, res) => {
    const body = z.object({ code: z.string().min(20) }).parse(req.body);
    res.json(await exchangeGoogleCode(body.code));
  }),
);

/** One-tap targets on /login2: site owners first, then seeded demo personas for the feed. */
const STAFF_SWITCH_ACCOUNTS = [
  { id: "ibneyousaf86@gmail.com", email: "ibneyousaf86@gmail.com", username: null as string | null, displayName: "Site owner", blurb: "ibneyousaf86@gmail.com", kind: "staff" as const },
  { id: "waikintse2@ln.hk", email: "waikintse2@ln.hk", username: null as string | null, displayName: "Site owner", blurb: "waikintse2@ln.hk", kind: "staff" as const },
  { id: "alex", email: "alex@finazza.dev", username: "alex", displayName: "Alex Morgan", blurb: "Demo · portfolio & markets", kind: "demo" as const },
  { id: "jordan", email: "jordan@finazza.dev", username: "jordan", displayName: "Jordan Lee", blurb: "Demo · charts & chat", kind: "demo" as const },
  { id: "sam", email: "sam@finazza.dev", username: "sam", displayName: "Sam Rivera", blurb: "Demo · collectibles", kind: "demo" as const },
  { id: "admin", email: "admin@finazza.dev", username: "admin", displayName: "FINAZZA Admin", blurb: "Demo · moderation", kind: "demo" as const },
];

const staffLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many staff login attempts. Try again later." },
});

async function staffUserFromAuthHeader(req: { headers: { authorization?: string } }) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  try {
    const payload = jwt.verify(header.slice(7), config.jwtSecret) as { sub: string };
    const user = await User.findById(payload.sub);
    if (!user || user.suspended) return null;
    await syncSiteAdmin(user);
    return user;
  } catch {
    return null;
  }
}

/** Site owners (ibneyousaf86@gmail.com / waikintse2@ln.hk) or STAFF_LOGIN_SECRET. */
async function assertStaffAccess(req: { headers: { authorization?: string } }, key?: unknown) {
  const user = await staffUserFromAuthHeader(req);
  if (user && isSiteAdminEmail(String(user.email || ""))) return { via: "admin" as const, user };
  if (staffLoginConfigured() && typeof key === "string" && key === config.staffLoginSecret) {
    return { via: "secret" as const, user: null };
  }
  if (user) {
    throw new HttpError(403, "Staff login is only for site owners. Sign in as ibneyousaf86@gmail.com or waikintse2@ln.hk.");
  }
  if (staffLoginConfigured()) throw new HttpError(403, "Wrong staff key. Or sign in with a staff email first.");
  throw new HttpError(403, "Sign in with ibneyousaf86@gmail.com or waikintse2@ln.hk, then open /login2.");
}

router.get(
  "/staff/status",
  wrap(async (req, res) => {
    const user = await staffUserFromAuthHeader(req);
    const asAdmin = Boolean(user && isSiteAdminEmail(String(user.email || "")));
    res.json({
      enabled: asAdmin || staffLoginConfigured(),
      asAdmin,
      secretEnabled: staffLoginConfigured(),
      staffEmails: config.siteAdminEmails,
    });
  }),
);

router.get(
  "/staff/accounts",
  staffLimiter,
  wrap(async (req, res) => {
    await assertStaffAccess(req, req.query.key);
    const accounts = [];
    for (const entry of STAFF_SWITCH_ACCOUNTS) {
      const row = await User.findOne({ email: entry.email });
      accounts.push({
        id: entry.id,
        email: entry.email,
        username: row?.username || entry.username || entry.email.split("@")[0],
        displayName: row?.displayName || entry.displayName,
        blurb: entry.blurb,
        kind: entry.kind,
        ready: Boolean(row && !row.suspended),
      });
    }
    res.json({ accounts });
  }),
);

router.post(
  "/staff/login",
  staffLimiter,
  wrap(async (req, res) => {
    const body = z
      .object({
        key: z.string().optional(),
        id: z.string().trim().min(1),
      })
      .parse(req.body);
    await assertStaffAccess(req, body.key);
    const target = STAFF_SWITCH_ACCOUNTS.find((account) => account.id === body.id || account.email === body.id.toLowerCase());
    if (!target) throw new HttpError(404, "That account is not on the staff switch list.");

    // Impersonation is allowed only after staff access was verified (owner session or secret).
    const user = await User.findOne({ email: target.email });
    if (!user || user.suspended) {
      throw new HttpError(
        401,
        target.kind === "staff"
          ? `No FINAZZA account for ${target.email} yet. Sign up / Google login with that email once, then try again.`
          : "Demo account is missing or suspended. Re-run the seed SQL.",
      );
    }
    await syncSiteAdmin(user);
    res.json({ token: signToken(String(user._id)), user: meDto(user) });
  }),
);

router.get(
  "/me",
  requireAuth,
  wrap(async (req, res) => {
    res.json({ user: meDto(req.user) });
  }),
);

router.post(
  "/forgot-password",
  limiter,
  wrap(async (req, res) => {
    const body = z.object({ email: z.string().email() }).parse(req.body);
    const user = await User.findOne({ email: body.email.toLowerCase() }).select("+resetTokenHash +resetTokenExpires");
    const response: { message: string; devResetUrl?: string } = {
      message: "If an account exists for that email, a reset link is on its way.",
    };
    if (user && !user.suspended) {
      const token = newToken();
      user.set("resetTokenHash", hashToken(token));
      user.set("resetTokenExpires", new Date(Date.now() + 60 * 60 * 1000));
      await user.save();
      const resetUrl = `${config.appUrl}/reset-password?token=${token}`;
      await sendPasswordReset(user.email, resetUrl);
      if (!config.isProd) response.devResetUrl = resetUrl;
    }
    res.json(response);
  }),
);

router.post(
  "/reset-password",
  limiter,
  wrap(async (req, res) => {
    const body = z
      .object({
        token: z.string().min(20),
        password: z.string().min(8, "Password must be at least 8 characters"),
      })
      .parse(req.body);
    const user = await User.findOne({
      resetTokenHash: hashToken(body.token),
      resetTokenExpires: { $gt: new Date() },
    }).select("+passwordHash +resetTokenHash +resetTokenExpires");
    if (!user) throw new HttpError(400, "This reset link is invalid or expired");
    user.passwordHash = await bcrypt.hash(body.password, 12);
    user.set("resetTokenHash", undefined);
    user.set("resetTokenExpires", undefined);
    await user.save();
    res.json({ ok: true });
  }),
);

export default router;
