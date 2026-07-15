import "server-only";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "./config";
import { getMessages } from "./messages";
import { makeT, type TFunc } from "./translate";

/** Read the locale from the cookie (server components / actions). */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const v = store.get(LOCALE_COOKIE)?.value;
  return isLocale(v) ? v : DEFAULT_LOCALE;
}

/** Convenience: locale + messages + t for a server component or action. */
export async function getServerT(): Promise<{ locale: Locale; t: TFunc }> {
  const locale = await getLocale();
  return { locale, t: makeT(getMessages(locale)) };
}
