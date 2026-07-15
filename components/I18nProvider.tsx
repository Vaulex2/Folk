"use client";
import { createContext, useContext, useMemo } from "react";
import type { Locale } from "@/lib/i18n/config";
import type { Messages } from "@/lib/i18n/messages";
import { makeT, type TFunc } from "@/lib/i18n/translate";

interface I18nValue {
  locale: Locale;
  m: Messages;
  t: TFunc;
}

const I18nContext = createContext<I18nValue | null>(null);

export default function I18nProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Messages;
  children: React.ReactNode;
}) {
  const value = useMemo<I18nValue>(
    () => ({ locale, m: messages, t: makeT(messages) }),
    [locale, messages]
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

export function useT(): TFunc {
  return useI18n().t;
}
