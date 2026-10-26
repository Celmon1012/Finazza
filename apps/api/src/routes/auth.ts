import { Router } from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { config } from "../config.js";
import { requireAuth, signToken } from "../auth.js";
import { sendPasswordReset } from "../email.js";
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
    const match = await bcrypt.compare(body.password, user.passwordHash);
    if (!match) throw new HttpError(401, "Email or password is incorrect");
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
