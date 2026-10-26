import { createHash, randomBytes } from "crypto";
import { KG_TO_TROY_OZ } from "./config.js";
import { HttpError } from "./http.js";
import { Follow, User, sameId } from "./models.js";

const RESERVED = new Set(["admin", "support", "finazza", "help", "system", "moderator", "everyone", "me"]);

const BLOCKED_PATTERNS = [/\bfree money\b/i, /\bguaranteed returns\b/i, /\bwire me\b/i, /\bdouble your money\b/i];

export function assertCleanText(text: string) {
  if (BLOCKED_PATTERNS.some((pattern) => pattern.test(text))) {
    throw new HttpError(400, "That text was blocked by the basic spam filter.");
  }
}

export function extractMentions(text: string) {
  return [...new Set([...text.matchAll(/@([a-zA-Z0-9_]{3,20})/g)].map((match) => match[1].toLowerCase()))];
}

export function assertUsername(username: string) {
  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    throw new HttpError(400, "Username must be 3–20 characters: letters, numbers, or underscores.");
  }
  if (RESERVED.has(username)) throw new HttpError(400, "That username is reserved.");
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function newToken() {
  return randomBytes(32).toString("hex");
}

export function trimNum(value: number) {
  return Number(value.toFixed(2)).toString();
}

export function computeReturn(buyPrice: number, sellPrice: number | null, recordType: string) {
  if (recordType !== "trade" || sellPrice == null || buyPrice <= 0) {
    return { returnPercent: null, profitPerUnit: null };
  }
  return {
    returnPercent: ((sellPrice - buyPrice) / buyPrice) * 100,
    profitPerUnit: sellPrice - buyPrice,
  };
}

export function snapshotLabel(input: {
  assetName: string;
  assetClass: string;
  recordType: string;
  quantity: number;
  unit: string;
  buyPrice: number;
  priceUnit: string;
  returnPercent: number | null;
}) {
  if (input.recordType === "trade" && input.returnPercent != null) {
    const rounded = Math.round(input.returnPercent);
    const sign = rounded > 0 ? "+" : "";
    return `${input.assetName} trade • ${sign}${rounded}%`;
  }
  if (input.recordType === "holding" && input.assetClass === "commodity") {
    const priceUnit = input.priceUnit.toLowerCase() === "troy oz" ? "oz" : input.priceUnit;
    return `${input.assetName} ${trimNum(input.quantity)} ${input.unit} • $${trimNum(input.buyPrice)}/${priceUnit}`;
  }
  if (input.recordType === "holding" && input.assetClass === "collectible") {
    return `${input.assetName} • holding`;
  }
  if (input.recordType === "holding") {
    return `${input.assetName} • bought $${trimNum(input.buyPrice)}`;
  }
  return input.assetName;
}

export function comparisonNote(quantity: number, unit: string, priceUnit: string) {
  const unitKey = unit.toLowerCase();
  const priceKey = priceUnit.toLowerCase();
  if (unitKey === "kg" && (priceKey === "troy oz" || priceKey === "ozt")) {
    const ounces = quantity * KG_TO_TROY_OZ;
    return `${trimNum(quantity)} kg ≈ ${trimNum(ounces)} troy oz using the fixed comparison rate (1 kg = 32.1507 troy oz). The saved record is unchanged.`;
  }
  return null;
}

export async function excludedAuthorIds(viewer: { _id: unknown; blockedUserIds?: unknown[]; mutedUserIds?: unknown[] }) {
  const blockers = await User.find({ blockedUserIds: viewer._id }).distinct("_id");
  const suspended = await User.find({ suspended: true }).distinct("_id");
  return [...(viewer.blockedUserIds || []), ...(viewer.mutedUserIds || []), ...blockers, ...suspended].map(String);
}

export async function isBlockedEitherWay(a: any, b: any) {
  if (!a || !b) return false;
  const aBlocks = (a.blockedUserIds || []).some((id: unknown) => sameId(id, b._id));
  const bBlocks = (b.blockedUserIds || []).some((id: unknown) => sameId(id, a._id));
  return aBlocks || bBlocks;
}

export async function canMessage(sender: any, recipient: any, mode: "invite" | "send" = "invite") {
  if (sameId(sender._id, recipient._id)) throw new HttpError(400, "You cannot message yourself.");
  if (await isBlockedEitherWay(sender, recipient)) {
    throw new HttpError(403, "Messaging is blocked between these accounts.");
  }
  if (mode === "invite" && recipient.messagePrivacy === "followers") {
    const follows = await Follow.exists({ follower: recipient._id, following: sender._id });
    if (!follows) {
      throw new HttpError(403, `@${recipient.username} only accepts messages and invites from people they follow.`);
    }
  }
}

export function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
