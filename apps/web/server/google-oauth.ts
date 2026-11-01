import { createHash, randomBytes } from "crypto";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import { config, googleOAuthConfigured } from "./config.js";
import { isSiteAdminEmail, signToken, syncSiteAdmin } from "./auth.js";
import { HttpError } from "./http.js";
import { Conversation, ReadState, User } from "./models.js";
import { meDto } from "./present.js";
import { assertUsername } from "./social.js";

const STATE_PURPOSE = "google_oauth_state";
const EXCHANGE_PURPOSE = "google_oauth_exchange";

export function googleClient() {
  if (!googleOAuthConfigured()) {
    throw new HttpError(503, "Google sign-in is not configured yet.");
  }
  return new OAuth2Client(config.googleClientId, config.googleClientSecret, config.googleRedirectUri);
}

export function googleAuthUrl() {
  const client = googleClient();
  const state = jwt.sign({ purpose: STATE_PURPOSE, n: randomBytes(16).toString("hex") }, config.jwtSecret, { expiresIn: "10m" });
  return client.generateAuthUrl({
    access_type: "online",
    prompt: "select_account",
    scope: ["openid", "email", "profile"],
    state,
  });
}

export function verifyGoogleState(state: string | undefined) {
  if (!state) throw new HttpError(400, "Google sign-in was cancelled or incomplete.");
  try {
    const payload = jwt.verify(state, config.jwtSecret) as { purpose?: string };
    if (payload.purpose !== STATE_PURPOSE) throw new Error("bad purpose");
  } catch {
    throw new HttpError(400, "Google sign-in expired. Try again.");
  }
}

export function signExchangeCode(userId: string) {
  return jwt.sign({ purpose: EXCHANGE_PURPOSE, sub: userId }, config.jwtSecret, { expiresIn: "5m" });
}

export async function exchangeGoogleCode(code: string) {
  try {
    const payload = jwt.verify(code, config.jwtSecret) as { purpose?: string; sub?: string };
    if (payload.purpose !== EXCHANGE_PURPOSE || !payload.sub) throw new Error("bad purpose");
    const user = await User.findById(payload.sub);
    if (!user || user.suspended) throw new HttpError(401, "Sign in required");
    await syncSiteAdmin(user);
    return { token: signToken(String(user._id)), user: meDto(user) };
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, "Google sign-in expired. Try again.");
  }
}

type GoogleProfile = {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
  picture: string | null;
};

export async function loadGoogleProfile(code: string): Promise<GoogleProfile> {
  const client = googleClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.id_token) throw new HttpError(400, "Google did not return a usable sign-in token.");
  const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: config.googleClientId });
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email) throw new HttpError(400, "Google did not share an email address.");
  if (payload.email_verified === false) throw new HttpError(400, "Verify your Google email, then try again.");
  return {
    sub: payload.sub,
    email: payload.email.toLowerCase(),
    emailVerified: true,
    name: (payload.name || payload.email.split("@")[0] || "Member").slice(0, 40),
    picture: payload.picture || null,
  };
}

function usernameSeed(email: string, name: string) {
  const fromEmail = email
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 16);
  if (fromEmail.length >= 3) return fromEmail;
  const fromName = name
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 16);
  if (fromName.length >= 3) return fromName;
  return `user${createHash("sha1").update(email).digest("hex").slice(0, 8)}`;
}

async function uniqueUsername(email: string, name: string) {
  const seed = usernameSeed(email, name);
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const candidate = attempt === 0 ? seed : `${seed.slice(0, 12)}${attempt + 1}`.slice(0, 20);
    try {
      assertUsername(candidate);
    } catch {
      continue;
    }
    const taken = await User.findOne({ username: candidate });
    if (!taken) return candidate;
  }
  return `u${createHash("sha1").update(`${email}:${Date.now()}`).digest("hex").slice(0, 12)}`;
}

async function seedTopicReads(userId: unknown) {
  const topics = await Conversation.find({ type: "topic" });
  if (!topics.length) return;
  await ReadState.insertMany(
    topics.map((topic) => ({ user: userId, conversation: topic._id, lastReadAt: new Date() })),
    { ordered: false },
  ).catch(() => undefined);
}

/** Find, link, or create a profile from a verified Google identity. */
export async function upsertGoogleUser(profile: GoogleProfile) {
  let user = await User.findOne({ googleSub: profile.sub });
  if (!user) user = await User.findOne({ email: profile.email });

  if (user) {
    if (user.suspended) throw new HttpError(403, "This account is suspended.");
    if (!user.googleSub) {
      user.googleSub = profile.sub;
      if (!user.avatarUrl && profile.picture) user.avatarUrl = profile.picture;
      if (!user.acceptedTermsAt) user.acceptedTermsAt = new Date();
      await user.save();
    }
    await syncSiteAdmin(user);
    return user;
  }

  const username = await uniqueUsername(profile.email, profile.name);
  const created = await User.create({
    email: profile.email,
    username,
    displayName: profile.name,
    passwordHash: null,
    googleSub: profile.sub,
    avatarUrl: profile.picture,
    acceptedTermsAt: new Date(),
    role: isSiteAdminEmail(profile.email) ? "admin" : "user",
  });
  if (!created) throw new HttpError(500, "Could not create the account.");
  await seedTopicReads(created._id);
  return created;
}
