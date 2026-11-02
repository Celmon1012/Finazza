import { en, type MessageKey } from "./messages/en";
import { zhHK } from "./messages/zh-HK";

export type Locale = "en" | "zh-HK";
export type { MessageKey };

export const LOCALES: Locale[] = ["en", "zh-HK"];
export const LOCALE_STORAGE_KEY = "finazza_locale";

const catalogs: Record<Locale, Record<MessageKey, string>> = {
  en,
  "zh-HK": zhHK,
};

export function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "zh-HK";
}

export function detectLocale(): Locale {
  if (typeof window === "undefined") return "en";
  const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
  if (isLocale(saved)) return saved;
  const nav = (navigator.language || "").toLowerCase();
  if (nav.startsWith("zh-hk") || nav.startsWith("zh-tw") || nav.startsWith("zh-hant") || nav === "zh") {
    return "zh-HK";
  }
  return "en";
}

export function htmlLang(locale: Locale) {
  return locale === "zh-HK" ? "zh-HK" : "en";
}

export function translate(locale: Locale, key: MessageKey, vars?: Record<string, string | number>) {
  const template = catalogs[locale][key] || en[key] || key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => (vars[name] != null ? String(vars[name]) : `{${name}}`));
}

export function formatMoney(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "zh-HK" ? "zh-HK" : "en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatTimeAgo(iso: string | null | undefined, locale: Locale) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return translate(locale, "common.now");
  if (minutes < 60) return translate(locale, "time.minutes", { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return translate(locale, "time.hours", { count: hours });
  const days = Math.floor(hours / 24);
  if (days < 7) return translate(locale, "time.days", { count: days });
  return new Date(iso).toLocaleDateString(locale === "zh-HK" ? "zh-HK" : "en-US");
}
