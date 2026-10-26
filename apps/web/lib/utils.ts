export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function timeAgo(iso?: string | null) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString();
}

export function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
}

export function percent(value: number) {
  const sign = value > 0 ? "+" : "";
  const digits = Math.abs(value) >= 10 ? 0 : 1;
  return `${sign}${value.toFixed(digits)}%`;
}

export function dateInput(iso?: string | null) {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(0, 10);
}

export const DISCLAIMER =
  "Posts are user opinions, not financial advice. Proof is user-submitted and is not verified by FINAZZA.";
