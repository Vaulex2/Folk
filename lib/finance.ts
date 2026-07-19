// Framework-free finance domain: the transactions ledger plus pure report
// helpers. Sheep sales/purchases live on the sheep table (purchase_price/
// purchase_date, sale_price/sale_date) and are merged into the ledger here —
// never duplicated into the transactions table.

import type { Sheep } from "./sheep";

export type ExpenseCategory =
  | "feed"
  | "vet"
  | "medicine"
  | "shearing"
  | "equipment"
  | "labor"
  | "transport"
  | "other_expense";
export type IncomeCategory = "wool" | "milk" | "other_income";
export type TxCategory = ExpenseCategory | IncomeCategory;
export type TxType = "income" | "expense";

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "feed",
  "vet",
  "medicine",
  "shearing",
  "equipment",
  "labor",
  "transport",
  "other_expense",
];
export const INCOME_CATEGORIES: IncomeCategory[] = ["wool", "milk", "other_income"];
export const TX_CATEGORIES: TxCategory[] = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

/** Income vs expense is implied by the category — there is no stored type. */
export function categoryType(c: TxCategory): TxType {
  return (INCOME_CATEGORIES as TxCategory[]).includes(c) ? "income" : "expense";
}

export interface Transaction {
  id: number;
  category: TxCategory;
  amount: number;
  date: string; // ISO yyyy-mm-dd
  note: string | null;
  sheep_id: number | null;
}

/** Ledger rows add the two kinds derived from the sheep table. */
export type LedgerCategory = TxCategory | "sheep_sale" | "sheep_purchase";

export interface LedgerEntry {
  key: string; // unique across sources: "tx-1" | "sale-1" | "purchase-1"
  source: "tx" | "sale" | "purchase";
  txId: number | null; // set only for source "tx" — enables delete
  type: TxType;
  category: LedgerCategory;
  amount: number;
  date: string | null; // null = sheep price recorded without a date
  note: string | null;
  sheepId: number | null;
}

export const yearOf = (iso: string | null): number | null =>
  iso ? new Date(iso + "T00:00:00").getFullYear() : null;

/**
 * Merge manual transactions with auto-derived sheep purchases and sales.
 * Sold animals without a sale price are skipped (amount unknown, same as the
 * old dashboard). Newest first; undated entries sort last.
 */
export function buildLedger(transactions: Transaction[], flock: Sheep[]): LedgerEntry[] {
  const entries: LedgerEntry[] = transactions.map((tx) => ({
    key: `tx-${tx.id}`,
    source: "tx",
    txId: tx.id,
    type: categoryType(tx.category),
    category: tx.category,
    amount: Number(tx.amount),
    date: tx.date,
    note: tx.note,
    sheepId: tx.sheep_id,
  }));
  for (const s of flock) {
    if (s.purchase_price != null) {
      entries.push({
        key: `purchase-${s.id}`,
        source: "purchase",
        txId: null,
        type: "expense",
        category: "sheep_purchase",
        amount: Number(s.purchase_price),
        date: s.purchase_date,
        note: null,
        sheepId: s.id,
      });
    }
    if (s.status === "Sold" && s.sale_price != null) {
      entries.push({
        key: `sale-${s.id}`,
        source: "sale",
        txId: null,
        type: "income",
        category: "sheep_sale",
        amount: Number(s.sale_price),
        date: s.sale_date,
        note: null,
        sheepId: s.id,
      });
    }
  }
  return entries.sort((a, b) => {
    if (a.date === b.date) return 0;
    if (a.date == null) return 1;
    if (b.date == null) return -1;
    return a.date < b.date ? 1 : -1;
  });
}

/** Distinct ledger years, descending; always contains `currentYear`. */
export function ledgerYears(ledger: LedgerEntry[], currentYear: number): number[] {
  const years = new Set<number>([currentYear]);
  for (const e of ledger) {
    const y = yearOf(e.date);
    if (y != null) years.add(y);
  }
  return [...years].sort((a, b) => b - a);
}

/** Entries dated within `year`; undated entries are excluded. */
export function filterYear(ledger: LedgerEntry[], year: number): LedgerEntry[] {
  return ledger.filter((e) => yearOf(e.date) === year);
}

export interface Totals {
  income: number;
  expense: number;
  net: number;
}

export function ledgerTotals(entries: LedgerEntry[]): Totals {
  let income = 0;
  let expense = 0;
  for (const e of entries) {
    if (e.type === "income") income += e.amount;
    else expense += e.amount;
  }
  return { income, expense, net: income - expense };
}

/** Income/expense per calendar month — always 12 rows (month 0–11). */
export function monthlyBreakdown(
  entries: LedgerEntry[]
): { month: number; income: number; expense: number }[] {
  const months = Array.from({ length: 12 }, (_, month) => ({ month, income: 0, expense: 0 }));
  for (const e of entries) {
    if (!e.date) continue;
    const m = months[new Date(e.date + "T00:00:00").getMonth()];
    if (e.type === "income") m.income += e.amount;
    else m.expense += e.amount;
  }
  return months;
}

export interface CategoryTotal {
  category: LedgerCategory;
  type: TxType;
  total: number;
  count: number;
}

/** Per-category totals, largest first. Callers split by type for display. */
export function categoryTotals(entries: LedgerEntry[]): CategoryTotal[] {
  const map = new Map<LedgerCategory, CategoryTotal>();
  for (const e of entries) {
    const row = map.get(e.category) ?? { category: e.category, type: e.type, total: 0, count: 0 };
    row.total += e.amount;
    row.count += 1;
    map.set(e.category, row);
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

export interface SheepProfit {
  sheepId: number;
  purchase: number; // purchase_price ?? 0
  expenses: number; // expense transactions linked to this sheep
  extraIncome: number; // income transactions linked to this sheep (its wool…)
  sale: number | null; // sale price when Sold with a price recorded
  sold: boolean;
  net: number; // (sale ?? 0) + extraIncome - purchase - expenses
}

/**
 * Lifetime profit & loss per animal (dates are ignored). Only sheep with at
 * least one money fact appear. Transactions without a sheep link are farm
 * overhead and are not allocated to any animal.
 */
export function sheepProfitability(transactions: Transaction[], flock: Sheep[]): SheepProfit[] {
  const linked = new Map<number, { expenses: number; extraIncome: number }>();
  for (const tx of transactions) {
    if (tx.sheep_id == null) continue;
    const row = linked.get(tx.sheep_id) ?? { expenses: 0, extraIncome: 0 };
    if (categoryType(tx.category) === "income") row.extraIncome += Number(tx.amount);
    else row.expenses += Number(tx.amount);
    linked.set(tx.sheep_id, row);
  }
  const rows: SheepProfit[] = [];
  for (const s of flock) {
    const tx = linked.get(s.id);
    const sold = s.status === "Sold";
    const sale = sold && s.sale_price != null ? Number(s.sale_price) : null;
    if (s.purchase_price == null && sale == null && !tx) continue;
    const purchase = s.purchase_price != null ? Number(s.purchase_price) : 0;
    const expenses = tx?.expenses ?? 0;
    const extraIncome = tx?.extraIncome ?? 0;
    rows.push({
      sheepId: s.id,
      purchase,
      expenses,
      extraIncome,
      sale,
      sold,
      net: (sale ?? 0) + extraIncome - purchase - expenses,
    });
  }
  return rows.sort((a, b) => (a.sold === b.sold ? b.net - a.net : a.sold ? -1 : 1));
}
