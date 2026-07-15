"use client";
import { useRouter } from "next/navigation";
import { useI18n } from "./I18nProvider";
import { LOCALES, LOCALE_COOKIE, LOCALE_NAMES, type Locale } from "@/lib/i18n/config";

export default function LanguageSwitcher({ className = "input" }: { className?: string }) {
  const router = useRouter();
  const { locale, t } = useI18n();

  function change(next: Locale) {
    // 1-year cookie; server components read it on the next request.
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  return (
    <select
      className={className}
      aria-label={t("nav.language")}
      value={locale}
      onChange={(e) => change(e.target.value as Locale)}
    >
      {LOCALES.map((l) => (
        <option key={l} value={l}>{LOCALE_NAMES[l]}</option>
      ))}
    </select>
  );
}
