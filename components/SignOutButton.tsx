"use client";
import { signOut } from "@/app/auth/actions";
import { useT } from "./I18nProvider";

export default function SignOutButton() {
  const t = useT();
  return (
    <form action={signOut}>
      <button className="btn btn-secondary" type="submit" title={t("auth.signOut")}>
        {t("auth.signOut")}
      </button>
    </form>
  );
}
