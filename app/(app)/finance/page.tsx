import Link from "next/link";
import { getAllSheep, getTransactions } from "@/lib/flock";
import { hasSupabaseConfig } from "@/lib/supabase";
import SetupNotice from "@/components/SetupNotice";
import { IconChevL, IconChevR } from "@/components/icons";
import { byTag, fmtDate, fmtMoney } from "@/lib/sheep";
import {
  buildLedger,
  categoryTotals,
  filterYear,
  ledgerTotals,
  ledgerYears,
  monthlyBreakdown,
  sheepProfitability,
  yearOf,
} from "@/lib/finance";
import { getServerT } from "@/lib/i18n/server";
import { getMessages } from "@/lib/i18n/messages";
import AddTransactionForm from "./AddTransactionForm";
import TransactionRow from "./TransactionRow";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

/** Signed thousands-grouped amount, e.g. "+1 500 000" / "−250 000". */
function signed(amount: number, income: boolean): string {
  return `${income ? "+" : "−"}${fmtMoney(amount)}`;
}

/** Clamp a 1-based page number into range and slice out its rows. */
function paginate<T>(items: T[], requestedPage: number) {
  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, requestedPage), pageCount);
  return { rows: items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), page, pageCount };
}

function Pager({
  page,
  pageCount,
  prevHref,
  nextHref,
  prevLabel,
  nextLabel,
  infoLabel,
}: {
  page: number;
  pageCount: number;
  prevHref: string;
  nextHref: string;
  prevLabel: string;
  nextLabel: string;
  infoLabel: string;
}) {
  if (pageCount <= 1) return null;
  const disabledStyle = { opacity: 0.45, pointerEvents: "none" as const };
  return (
    <div className="pager">
      {page > 1 ? (
        <Link href={prevHref} className="btn btn-secondary"><IconChevL />{prevLabel}</Link>
      ) : (
        <span className="btn btn-secondary" aria-disabled="true" style={disabledStyle}><IconChevL />{prevLabel}</span>
      )}
      <span className="pager-info">{infoLabel}</span>
      {page < pageCount ? (
        <Link href={nextHref} className="btn btn-secondary">{nextLabel}<IconChevR size={16} /></Link>
      ) : (
        <span className="btn btn-secondary" aria-disabled="true" style={disabledStyle}>{nextLabel}<IconChevR size={16} /></span>
      )}
    </div>
  );
}

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; entriesPage?: string; profitPage?: string }>;
}) {
  if (!hasSupabaseConfig()) return <SetupNotice />;
  const { locale, t } = await getServerT();
  const { year: yearRaw, entriesPage: entriesPageRaw, profitPage: profitPageRaw } = await searchParams;

  const [txs, flock] = await Promise.all([getTransactions(), getAllSheep()]);
  const ledger = buildLedger(txs, flock);

  const currentYear = new Date().getFullYear();
  const years = ledgerYears(ledger, currentYear);
  const parsedYear = parseInt(yearRaw ?? "", 10);
  const year = years.includes(parsedYear) ? parsedYear : currentYear;

  const inYear = filterYear(ledger, year);
  const totals = ledgerTotals(inYear);
  const byMonth = monthlyBreakdown(inYear);
  const monthMax = Math.max(...byMonth.map((m) => Math.max(m.income, m.expense)));
  const cats = categoryTotals(inYear);
  const incomeCats = cats.filter((c) => c.type === "income");
  const expenseCats = cats.filter((c) => c.type === "expense");
  const incomeCatMax = Math.max(1, ...incomeCats.map((c) => c.total));
  const expenseCatMax = Math.max(1, ...expenseCats.map((c) => c.total));
  const soldCount = flock.filter((s) => s.status === "Sold" && yearOf(s.sale_date) === year).length;
  const profit = sheepProfitability(txs, flock);

  const {
    rows: entriesRows,
    page: entriesPage,
    pageCount: entriesPageCount,
  } = paginate(inYear, parseInt(entriesPageRaw ?? "1", 10) || 1);
  const {
    rows: profitRows,
    page: profitPage,
    pageCount: profitPageCount,
  } = paginate(profit, parseInt(profitPageRaw ?? "1", 10) || 1);

  // Preserves the year filter and the *other* list's page when paginating one.
  const pageHref = (overrides: { entriesPage?: number; profitPage?: number }) => {
    const params = new URLSearchParams();
    if (year !== currentYear) params.set("year", String(year));
    const ep = overrides.entriesPage ?? entriesPage;
    const pp = overrides.profitPage ?? profitPage;
    if (ep > 1) params.set("entriesPage", String(ep));
    if (pp > 1) params.set("profitPage", String(pp));
    const qs = params.toString();
    return qs ? `/finance?${qs}` : "/finance";
  };

  const months = getMessages(locale).months;
  const currency = t("money.currency");
  const sheepById = new Map(flock.map((s) => [s.id, s]));
  const sheepOptions = flock
    .filter((s) => s.status === "Active")
    .sort(byTag)
    .map((s) => ({ value: String(s.id), label: s.tag }));
  const catLabel = (c: string) => t(`finance.cat.${c}`);

  return (
    <>
      <div className="pagehead">
        <h1>{t("finance.title")}</h1>
        <p>{t("finance.subtitle")}</p>
      </div>

      {years.length > 1 && (
        <div className="filters">
          {years.map((y) => (
            <Link
              key={y}
              href={y === currentYear ? "/finance" : `/finance?year=${y}`}
              className={`btn ${y === year ? "btn-primary" : "btn-ghost"}`}
            >
              {y}
            </Link>
          ))}
        </div>
      )}

      <div className="stats">
        <div className="stat">
          <span className="stat-num">{fmtMoney(totals.income)}</span>
          <span className="stat-lab">{t("finance.income")}</span>
          <span className="stat-sub">{currency}</span>
        </div>
        <div className="stat">
          <span className="stat-num">{fmtMoney(totals.expense)}</span>
          <span className="stat-lab">{t("finance.expenses")}</span>
          <span className="stat-sub">{currency}</span>
        </div>
        <div className="stat">
          <span className="stat-num">
            {totals.net < 0 ? "−" : ""}
            {fmtMoney(Math.abs(totals.net))}
          </span>
          <span className="stat-lab">{t("finance.net")}</span>
          <span className="stat-sub">{currency}</span>
        </div>
        <div className="stat">
          <span className="stat-num">{soldCount}</span>
          <span className="stat-lab">{t("finance.sold")}</span>
          <span className="stat-sub">{t("finance.soldSub")}</span>
        </div>
      </div>

      <div className="cols">
        <div className="panel">
          <div className="panel-h">
            <h2>{t("finance.incomeByCat")}</h2>
            <span className="count">{year}</span>
          </div>
          <div className="catlist">
            {incomeCats.map((c) => (
              <div key={c.category} className="catrow is-income">
                <span className="cat-name">
                  {catLabel(c.category)} <span className="cat-count">×{c.count}</span>
                </span>
                <span className="cat-amount">{fmtMoney(c.total)} {currency}</span>
                <span className="cat-track">
                  <span className="cat-bar" style={{ width: `${(c.total / incomeCatMax) * 100}%` }} />
                </span>
              </div>
            ))}
            {incomeCats.length === 0 && <div className="empty">{t("finance.emptyCat")}</div>}
          </div>
        </div>

        <div className="panel">
          <div className="panel-h">
            <h2>{t("finance.expenseByCat")}</h2>
            <span className="count">{year}</span>
          </div>
          <div className="catlist">
            {expenseCats.map((c) => (
              <div key={c.category} className="catrow is-expense">
                <span className="cat-name">
                  {catLabel(c.category)} <span className="cat-count">×{c.count}</span>
                </span>
                <span className="cat-amount">{fmtMoney(c.total)} {currency}</span>
                <span className="cat-track">
                  <span className="cat-bar" style={{ width: `${(c.total / expenseCatMax) * 100}%` }} />
                </span>
              </div>
            ))}
            {expenseCats.length === 0 && <div className="empty">{t("finance.emptyCat")}</div>}
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 22 }}>
        <div className="panel-h">
          <h2>{t("finance.monthlyTitle")}</h2>
          <span className="count">{t("finance.monthlySub")}</span>
        </div>
        <div className="barchart-legend">
          <span className="bc-key"><i className="bc-swatch bc-income" />{t("finance.income")}</span>
          <span className="bc-key"><i className="bc-swatch bc-expense" />{t("finance.expenses")}</span>
        </div>
        <div className="bc-plot">
          {byMonth.map((m) => (
            <div key={m.month} className="bc-col">
              <div className="bc-stem">
                <div className="bc-half bc-half-up">
                  {m.income > 0 && (
                    <span
                      className="bc-bar bc-up"
                      style={{ height: monthMax > 0 ? `${(m.income / monthMax) * 100}%` : 0 }}
                      title={`${months[m.month]}: +${fmtMoney(m.income)} ${currency}`}
                    >
                      <span className="bc-val">+{fmtMoney(m.income)}</span>
                    </span>
                  )}
                </div>
                <div className="bc-baseline" />
                <div className="bc-half bc-half-down">
                  {m.expense > 0 && (
                    <span
                      className="bc-bar bc-down"
                      style={{ height: monthMax > 0 ? `${(m.expense / monthMax) * 100}%` : 0 }}
                      title={`${months[m.month]}: −${fmtMoney(m.expense)} ${currency}`}
                    >
                      <span className="bc-val">−{fmtMoney(m.expense)}</span>
                    </span>
                  )}
                </div>
              </div>
              <span className="bc-lab">{months[m.month]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="panel" style={{ marginTop: 22 }}>
        <div className="panel-h">
          <h2>{t("finance.entriesTitle")}</h2>
          <span className="count">{t("finance.entriesCount", { count: inYear.length })}</span>
        </div>
        <AddTransactionForm sheepOptions={sheepOptions} todayISO={new Date().toISOString().slice(0, 10)} />
        <div className="ledger" style={{ marginTop: 14 }}>
          {entriesRows.map((e) => {
            const sheep = e.sheepId != null ? sheepById.get(e.sheepId) : undefined;
            if (e.source === "tx") {
              return (
                <TransactionRow
                  key={e.key}
                  txId={e.txId!}
                  income={e.type === "income"}
                  amountLabel={`${signed(e.amount, e.type === "income")} ${currency}`}
                  categoryLabel={catLabel(e.category)}
                  note={e.note}
                  dateLabel={e.date ? fmtDate(e.date, locale) : null}
                  linkedSheep={sheep ? { id: sheep.id, tag: sheep.tag } : null}
                />
              );
            }
            return (
              <Link
                key={e.key}
                href={`/sheep/${e.sheepId}`}
                className={`lgrow ${e.type === "income" ? "is-income" : "is-expense"}`}
              >
                <span className="lg-dot" aria-hidden="true" />
                <span className="lg-desc">
                  <span className="lg-cat">{catLabel(e.category)}</span>
                  <span className="lg-meta">
                    {sheep ? `${sheep.tag} · ` : ""}
                    {t("finance.autoEntry")}
                  </span>
                </span>
                <span className="lg-date">{e.date ? fmtDate(e.date, locale) : ""}</span>
                <span className={`lg-amount ${e.type === "income" ? "is-income" : "is-expense"}`}>
                  {signed(e.amount, e.type === "income")} {currency}
                </span>
                <span className="lg-trail"><IconChevR /></span>
              </Link>
            );
          })}
          {inYear.length === 0 && <div className="empty">{t("finance.emptyEntries")}</div>}
        </div>
        <Pager
          page={entriesPage}
          pageCount={entriesPageCount}
          prevHref={pageHref({ entriesPage: entriesPage - 1 })}
          nextHref={pageHref({ entriesPage: entriesPage + 1 })}
          prevLabel={t("list.prevPage")}
          nextLabel={t("list.nextPage")}
          infoLabel={t("list.pageOf", { page: entriesPage, pages: entriesPageCount })}
        />
      </div>

      <div className="panel fin-tight" style={{ marginTop: 22 }}>
        <div className="panel-h">
          <h2>{t("finance.profitTitle")}</h2>
          <span className="count">{t("finance.profitSub")}</span>
        </div>
        <div className="liste">
          {profitRows.map((p) => {
            const sheep = sheepById.get(p.sheepId);
            if (!sheep) return null;
            return (
              <Link key={p.sheepId} href={`/sheep/${p.sheepId}`} className="lrow">
                <span className="ltag">{sheep.tag}</span>
                <span className="lmeta">
                  {t("finance.profitMeta", {
                    spent: fmtMoney(p.purchase + p.expenses),
                    earned: fmtMoney((p.sale ?? 0) + p.extraIncome),
                  })}
                  {!p.sold ? ` · ${t("finance.notSoldYet")}` : ""}
                </span>
                <span className={`tag ${p.net >= 0 ? "tag-accent-2" : "tag-accent"}`}>
                  {p.net < 0 ? "−" : "+"}{fmtMoney(Math.abs(p.net))} {currency}
                </span>
                <span className="chev"><IconChevR /></span>
              </Link>
            );
          })}
          {profit.length === 0 && <div className="empty">{t("finance.emptyEntries")}</div>}
        </div>
        <Pager
          page={profitPage}
          pageCount={profitPageCount}
          prevHref={pageHref({ profitPage: profitPage - 1 })}
          nextHref={pageHref({ profitPage: profitPage + 1 })}
          prevLabel={t("list.prevPage")}
          nextLabel={t("list.nextPage")}
          infoLabel={t("list.pageOf", { page: profitPage, pages: profitPageCount })}
        />
      </div>

      <p className="text-muted" style={{ marginTop: 22, fontSize: 13 }}>
        {t("finance.overheadHint")}
      </p>
    </>
  );
}
