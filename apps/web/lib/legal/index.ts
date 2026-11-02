import type { Locale } from "../i18n";
import { privacyEn } from "./privacy-en";
import { privacyZhHK } from "./privacy-zh-HK";
import { termsEn } from "./terms-en";
import { termsZhHK } from "./terms-zh-HK";
export type { LegalBlock, LegalDoc, LegalSection } from "./types";

export function getTerms(locale: Locale) {
  return locale === "zh-HK" ? termsZhHK : termsEn;
}

export function getPrivacy(locale: Locale) {
  return locale === "zh-HK" ? privacyZhHK : privacyEn;
}
