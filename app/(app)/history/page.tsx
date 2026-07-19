import Link from "next/link";
import { getAllSheep } from "@/lib/flock";
import { hasSupabaseConfig } from "@/lib/supabase";
import SetupNotice from "@/components/SetupNotice";
import { IconChevR } from "@/components/icons";
import { fmtDate, fmtMoney, view, type Sheep } from "@/lib/sheep";
import { getServerT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

/** Newest exit first; undated rows sink to the bottom, tag as tiebreaker. */
function byExitDate(dateOf: (s: Sheep) => string | null) {
  return (a: Sheep, b: Sheep) => {
    const da = dateOf(a);
    const db = dateOf(b);
    if (da !== db) return (db ?? "").localeCompare(da ?? "");
    return a.tag.localeCompare(b.tag);
  };
}

export default async function HistoryPage() {
  if (!hasSupabaseConfig()) return <SetupNotice />;
  const { locale, t } = await getServerT();
  const today = new Date();
  const all = await getAllSheep();

  const sold = all.filter((s) => s.status === "Sold").sort(byExitDate((s) => s.sale_date));
  const died = all.filter((s) => s.status === "Died").sort(byExitDate((s) => s.death_date));
  const salesTotal = sold.reduce((a, s) => a + (s.sale_price != null ? Number(s.sale_price) : 0), 0);

  return (
    <>
      <div className="pagehead">
        <h1>{t("history.title")}</h1>
        <p>{t("history.subtitle")}</p>
      </div>

      <div className="panel">
        <div className="panel-h">
          <h2>{t("history.soldTitle")}</h2>
          <span className="count">
            {t("history.soldCount", { count: sold.length, total: fmtMoney(salesTotal) })} {t("money.currency")}
          </span>
        </div>
        <div className="liste">
          {sold.map((s) => {
            const v = view(s, today, locale);
            return (
              <Link key={s.id} href={`/sheep/${s.id}`} className="lrow">
                <span className="ltag">{v.tag}</span>
                <span className="lmeta">{v.sexLabel} · {v.breed}</span>
                <span className="tag tag-neutral">
                  {s.sale_price != null ? `${fmtMoney(Number(s.sale_price))} ${t("money.currency")}` : t("history.noPrice")}
                  {s.sale_date ? ` · ${fmtDate(s.sale_date, locale)}` : ""}
                </span>
                <span className="chev"><IconChevR /></span>
              </Link>
            );
          })}
          {sold.length === 0 && <div className="empty">{t("history.emptySold")}</div>}
        </div>
      </div>

      <div className="panel" style={{ marginTop: 22 }}>
        <div className="panel-h">
          <h2>{t("history.diedTitle")}</h2>
          <span className="count">{died.length}</span>
        </div>
        <div className="liste">
          {died.map((s) => {
            const v = view(s, today, locale);
            return (
              <Link key={s.id} href={`/sheep/${s.id}`} className="lrow">
                <span className="ltag">{v.tag}</span>
                <span className="lmeta">{v.sexLabel} · {v.breed}</span>
                {s.death_date ? (
                  <span className="tag tag-neutral">{fmtDate(s.death_date, locale)}</span>
                ) : (
                  <span />
                )}
                <span className="chev"><IconChevR /></span>
              </Link>
            );
          })}
          {died.length === 0 && <div className="empty">{t("history.emptyDied")}</div>}
        </div>
      </div>

      <p className="text-muted" style={{ marginTop: 22, fontSize: 13 }}>
        {t("history.note")}
      </p>
    </>
  );
}
