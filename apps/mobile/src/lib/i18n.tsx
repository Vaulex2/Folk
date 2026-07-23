import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DEFAULT_LOCALE, getMessages, isLocale, makeT, type Locale, type TFunc } from "../core";

// Locale context. Wraps the shared i18n catalogue (../../lib/i18n) with a React
// provider and persists the chosen language on-device. The `t` function is the
// same dot-path resolver the web app uses.

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: TFunc;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);
const LOCALE_KEY = "flock.locale";

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    AsyncStorage.getItem(LOCALE_KEY).then((v) => {
      if (isLocale(v)) setLocaleState(v);
    });
  }, []);

  function setLocale(l: Locale) {
    setLocaleState(l);
    AsyncStorage.setItem(LOCALE_KEY, l);
  }

  const t = useMemo(() => makeT(getMessages(locale)), [locale]);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>{children}</I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
