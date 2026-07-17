import { redirect } from "next/navigation";
import { hasSupabaseConfig } from "@/lib/supabase";
import { getUserOrNull } from "@/lib/auth/server";
import SetupNotice from "@/components/SetupNotice";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { getServerT } from "@/lib/i18n/server";
import { FLOCK_NAME } from "@/lib/flockName";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (!hasSupabaseConfig()) {
    return (
      <main className="main" style={{ padding: 24 }}>
        <SetupNotice />
      </main>
    );
  }

  // proxy.ts already bounces signed-in visitors, but it's optimistic — check here too.
  if (await getUserOrNull()) redirect("/");

  const { t } = await getServerT();

  return (
    <main className="signin-scene">
      <LanguageSwitcher className="input signin-lang" />

      {/* The card as the focal node of a pedigree: parents above, lambs below. */}
      <div className="signin-tree">
        <ul className="tree-row parents" aria-hidden>
          <li>
            <span className="node mini signin-pnode">
              <span className="node-tag">
                <span className="node-dot" style={{ background: "var(--color-accent-2-500)" }} />
                {t("sex.Ram")}
              </span>
            </span>
          </li>
          <li>
            <span className="node mini signin-pnode">
              <span className="node-tag">
                <span className="node-dot" style={{ background: "var(--color-accent-400)" }} />
                {t("sex.Ewe")}
              </span>
            </span>
          </li>
        </ul>
        <div className="up-stem" aria-hidden />

        <div className="focal-wrap has-drop">
          <div className="panel signin-card">
            <span className="eartag">{FLOCK_NAME}</span>
            <h1>{t("auth.title")}</h1>
            <p className="text-muted signin-sub">{t("auth.subtitle")}</p>
            <LoginForm />
          </div>
        </div>

        <ul className="tree-row kids signin-lambs" aria-hidden>
          <li><span className="lamb" /></li>
          <li><span className="lamb" /></li>
          <li><span className="lamb" /></li>
        </ul>
      </div>
    </main>
  );
}
