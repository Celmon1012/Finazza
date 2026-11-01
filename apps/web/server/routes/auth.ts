import { Router } from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
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
    if (!user || user.suspended) throw new HttpError(401, "Email or password is incorrect");
    if (!user.passwordHash) throw new HttpError(401, "This account uses Google sign-in. Continue with Google instead.");
    const match = await bcrypt.compare(body.password, user.passwordHash);
    if (!match) throw new HttpError(401, "Email or password is incorrect");
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

/** Seeded demo personas only — staff one-tap login on /login2. */
const STAFF_DEMO_ACCOUNTS = [
  { username: "alex", email: "alex@finazza.dev", displayName: "Alex Morgan", blurb: "Portfolio & markets" },
  { username: "jordan", email: "jordan@finazza.dev", displayName: "Jordan Lee", blurb: "Charts & chat" },
  { username: "sam", email: "sam@finazza.dev", displayName: "Sam Rivera", blurb: "Collectibles" },
  { username: "admin", email: "admin@finazza.dev", displayName: "FINAZZA Admin", blurb: "Moderation" },
] as const;

const staffLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many staff login attempts. Try again later." },
});

function assertStaffKey(key: unknown) {
  if (!staffLoginConfigured()) throw new HttpError(503, "Staff login is not enabled. Set STAFF_LOGIN_SECRET on the server.");
  if (typeof key !== "string" || key !== config.staffLoginSecret) {
    throw new HttpError(403, "Wrong staff key.");
  }
}

router.get(
  "/staff/status",
  wrap(async (_req, res) => {
    res.json({ enabled: staffLoginConfigured() });
  }),
);

router.get(
  "/staff/accounts",
  staffLimiter,
  wrap(async (req, res) => {
    assertStaffKey(req.query.key);
    res.json({
      accounts: STAFF_DEMO_ACCOUNTS.map(({ username, displayName, blurb }) => ({ username, displayName, blurb })),
    });
  }),
);

router.post(
  "/staff/login",
  staffLimiter,
  wrap(async (req, res) => {
    const body = z
      .object({
        key: z.string().min(1),
        username: z.string().trim().toLowerCase(),
      })
      .parse(req.body);
    assertStaffKey(body.key);
    const demo = STAFF_DEMO_ACCOUNTS.find((account) => account.username === body.username);
    if (!demo) throw new HttpError(404, "That demo account is not on the staff list.");

    const user = await User.findOne({ email: demo.email }).select("+passwordHash");
    if (!user || user.suspended) throw new HttpError(401, "Demo account is missing or suspended. Re-run the seed SQL.");
    if (!user.passwordHash) throw new HttpError(401, "Demo account has no password hash.");
    const match = await bcrypt.compare(config.demoPassword, user.passwordHash);
    if (!match) throw new HttpError(401, "Demo password does not match. Check DEMO_PASSWORD or re-seed accounts.");
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
