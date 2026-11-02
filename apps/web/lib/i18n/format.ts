import type { MessageKey } from "./messages/en";

type Translate = (key: MessageKey, vars?: Record<string, string | number>) => string;

const PROOF_LABEL_EN = "Proof uploaded — not verified by the platform";
const KG_TO_TROY_OZ = 32.1507;

type SnapshotItem = {
  assetName: string;
  assetClass: string;
  recordType: string;
  quantity: number;
  unit: string;
  buyPrice: number;
  buyPriceApproximate?: boolean;
  priceUnit: string;
  returnPercent: number | null;
  snapshotLabel?: string;
};

export function formatNotificationText(
  item: { type: string; text: string; actor?: { displayName?: string } | null },
  t: Translate,
) {
  const name = item.actor?.displayName || t("admin.someone");
  const raw = item.text || "";

  if (item.type === "like") return t("notifications.text.like", { name });
  if (item.type === "reply") return t("notifications.text.reply", { name });
  if (item.type === "follow") return t("notifications.text.follow", { name });
  if (item.type === "mention") {
    const room = raw.match(/#([a-z0-9-]+)/i)?.[1];
    return room ? t("notifications.text.mentionRoom", { name, room }) : t("notifications.text.mention", { name });
  }
  if (item.type === "repost") {
    if (/quoted/i.test(raw)) return t("notifications.text.quote", { name });
    return t("notifications.text.repost", { name });
  }
  if (item.type === "chat") {
    const group = raw.match(/in (.+)$/i)?.[1];
    if (/sent you a message/i.test(raw)) return t("notifications.text.message", { name });
    if (group) return t("notifications.text.groupMessage", { name, group });
  }
  return raw;
}

export function formatProofLabel(label: string | null | undefined, t: Translate) {
  if (!label) return t("portfolio.proofLabel");
  if (label === PROOF_LABEL_EN || label.includes("not verified by the platform")) {
    return t("portfolio.proofLabel");
  }
  return label;
}

export function formatChatPreview(text: string | null | undefined, t: Translate) {
  if (!text) return "";
  if (text === "Sent a voice message" || text === "__voice__") return t("chat.sentVoice");
  if (text === "Sent an image" || text === "__image__") return t("chat.sentImage");
  return text;
}

function priced(buyPrice: number, approximate?: boolean) {
  return `${approximate ? "~" : ""}$${buyPrice}`;
}

export function formatSnapshotLabel(item: SnapshotItem, t: Translate) {
  if (item.recordType === "trade" && item.returnPercent != null) {
    const rounded = Math.round(item.returnPercent);
    return t("portfolio.tradeLabel", {
      name: item.assetName,
      change: `${rounded > 0 ? "+" : ""}${rounded}%`,
    });
  }
  if (item.recordType === "holding" && item.assetClass === "commodity") {
    const priceUnit = item.priceUnit.toLowerCase() === "troy oz" ? "oz" : item.priceUnit;
    return t("portfolio.commodityLabel", {
      name: item.assetName,
      quantity: item.quantity,
      unit: item.unit,
      price: priced(item.buyPrice, item.buyPriceApproximate),
      priceUnit,
    });
  }
  if (item.recordType === "holding") {
    return t("portfolio.boughtLabel", {
      name: item.assetName,
      price: priced(item.buyPrice, item.buyPriceApproximate),
    });
  }
  return item.snapshotLabel || item.assetName;
}

export function formatComparisonNote(
  item: { quantity: number; unit: string; priceUnit: string; comparisonNote?: string | null },
  t: Translate,
) {
  if (!item.comparisonNote) return null;
  const unitKey = item.unit.toLowerCase();
  const priceKey = item.priceUnit.toLowerCase();
  if (unitKey === "kg" && (priceKey === "troy oz" || priceKey === "ozt")) {
    const ounces = Number((item.quantity * KG_TO_TROY_OZ).toFixed(2));
    return t("portfolio.comparisonKgOz", { quantity: item.quantity, ounces });
  }
  return item.comparisonNote;
}
