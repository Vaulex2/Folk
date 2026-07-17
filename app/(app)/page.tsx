import Link from "next/link";
import { getActiveSheep } from "@/lib/flock";
import { hasSupabaseConfig } from "@/lib/supabase";
import SetupNotice from "@/components/SetupNotice";
import HealthPill from "@/components/HealthPill";
import { IconChevR } from "@/components/icons";
import { ageYears, fmtDate, view } from "@/lib/sheep";
import { getServerT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  if (!hasSupabaseConfig()) return <SetupNotice />;
  const { locale, t } = await getServerT();
  const today = new Date();
  const all = await getActiveSheep();

  const ewes = all.filter((s) => s.sex === "Ewe");
  const rams = all.filter((s) => s.sex === "Ram");
  const lambs = all.filter((s) => ageYears(s.birth, today) < 1);
  const avg = all.length ? all.reduce((a, s) => a + ageYears(s.birth, today), 0) / all.length : 0;

  const alerts = all
    .filter((s) => s.health === "Under treatment" || s.health === "Needs attention")
    .sort(
      (a, b) =>
        (a.health === "Under treatment" ? 0 : 1) - (b.health === "Under treatment" ? 0 : 1) ||
        a.tag.localeCompare(b.tag)
    );

  // Upcoming reminders: lambing (due_date) + scheduled vaccinations (vaccination_date).
  const upcoming = all
    .flatMap((s) => {
      const items: { id: number; tag: string; date: string; kind: string }[] = [];
      if (s.due_date) items.push({ id: s.id, tag: s.tag, date: s.due_date, kind: t("dashboard.lambingDue") });
      if (s.vaccination_date) items.push({ id: s.id, tag: s.tag, date: s.vaccination_date, kind: t("dashboard.vaccinationDue") });
      return items;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 6);

  const breedCount = new Set(all.map((s) => s.breed)).size;

  return (
    <>
      <div className="pagehead">
        <h1>{t("dashboard.title")}</h1>
        <p>{t("dashboard.subtitle", { date: fmtDate(today.toISOString(), locale) })}</p>
      </div>

      <div className="stats">
        <div className="stat">
          <span className="stat-num">{all.length}</span>
          <span className="stat-lab">{t("dashboard.totalHead")}</span>
          <span className="stat-sub">{t("dashboard.split", { ewes: ewes.length, rams: rams.length })}</span>
        </div>
        <div className="stat">
          <span className="stat-num">{lambs.length}</span>
          <span className="stat-lab">{t("dashboard.lambs")}</span>
          <span className="stat-sub">{t("dashboard.lambsSub")}</span>
        </div>
        <div className="stat">
          <span className="stat-num">{avg.toFixed(1)}</span>
          <span className="stat-lab">{t("dashboard.avgAge")}</span>
          <span className="stat-sub">{t("dashboard.avgAgeSub")}</span>
        </div>
        <div className="stat alert">
          <span className="stat-num">{alerts.length}</span>
          <span className="stat-lab">{t("dashboard.healthAlerts")}</span>
          <span className="stat-sub">{t("dashboard.healthAlertsSub")}</span>
        </div>
      </div>

      <div className="cols">
        <div className="panel">
          <div className="panel-h">
            <h2>{t("dashboard.needsAttention")}</h2>
            <span className="count">{t("dashboard.flagged", { count: alerts.length })}</span>
          </div>
          <div className="liste">
            {alerts.map((s) => {
              const v = view(s, today, locale);
              return (
                <Link key={s.id} href={`/sheep/${s.id}`} className="lrow">
                  <span className="ltag">{v.tag}</span>
                  <span className="lmeta">{v.metaShort} · {v.breed}</span>
                  <HealthPill health={v.health} label={v.healthLabel} />
                  <span className="chev"><IconChevR /></span>
                </Link>
              );
            })}
            {alerts.length === 0 && <div className="empty">{t("dashboard.allHealthy")}</div>}
          </div>
        </div>

        <div className="panel">
          <div className="panel-h">
            <h2>{t("dashboard.upcoming")}</h2>
            <span className="count">{t("dashboard.upcomingSub")}</span>
          </div>
          <div className="liste">
            {upcoming.map((u) => (
              <Link key={`${u.id}-${u.kind}`} href={`/sheep/${u.id}`} className="lrow">
                <span className="ltag">{u.tag}</span>
                <span className="lmeta">{u.kind}</span>
                <span className="tag tag-neutral">{fmtDate(u.date, locale)}</span>
                <span className="chev"><IconChevR /></span>
              </Link>
            ))}
            {upcoming.length === 0 && <div className="empty">{t("dashboard.nothingCalendar")}</div>}
          </div>
        </div>
      </div>

      <p className="text-muted" style={{ marginTop: 22, fontSize: 13 }}>
        {t("dashboard.tracking", { count: all.length, breeds: breedCount })}
      </p>
    </>
  );
}
