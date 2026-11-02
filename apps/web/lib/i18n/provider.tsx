"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  LOCALE_STORAGE_KEY,
  detectLocale,
  formatMoney,
  formatTimeAgo,
  htmlLang,
  translate,
  type Locale,
  type MessageKey,
} from "./index";

type I18nValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
  money: (value: number) => string;
  timeAgo: (iso?: string | null) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const next = detectLocale();
    setLocaleState(next);
    document.documentElement.lang = htmlLang(next);
    setReady(true);
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    localStorage.setItem(LOCALE_STORAGE_KEY, next);
    document.documentElement.lang = htmlLang(next);
  }, []);

  const value = useMemo<I18nValue>(
    () => ({
      locale,
      setLocale,
      t: (key, vars) => translate(locale, key, vars),
      money: (amount) => formatMoney(amount, locale),
      timeAgo: (iso) => formatTimeAgo(iso, locale),
    }),
    [locale, setLocale],
  );

  // Avoid flashing English labels before the saved locale loads.
  if (!ready) {
    return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
  }

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
