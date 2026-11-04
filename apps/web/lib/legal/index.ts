import type { Locale } from "@/lib/i18n";
import { privacyEn } from "@/lib/legal/privacy-en";
import { privacyZhHK } from "@/lib/legal/privacy-zh-HK";
import { termsEn } from "@/lib/legal/terms-en";
import { termsZhHK } from "@/lib/legal/terms-zh-HK";
export type { LegalBlock, LegalDoc, LegalSection } from "@/lib/legal/types";

export function getTerms(locale: Locale) {
  return locale === "zh-HK" ? termsZhHK : termsEn;
}

export function getPrivacy(locale: Locale) {
  return locale === "zh-HK" ? privacyZhHK : privacyEn;
}
