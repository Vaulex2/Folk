import { describe, expect, it } from "vitest";
import {
  buildLedger,
  categoryTotals,
  categoryType,
  EXPENSE_CATEGORIES,
  filterYear,
  INCOME_CATEGORIES,
  ledgerTotals,
  ledgerYears,
  monthlyBreakdown,
  sheepProfitability,
  TX_CATEGORIES,
  type Transaction,
} from "@/lib/finance";
import type { Sheep } from "@/lib/sheep";

function s(id: number, patch: Partial<Sheep> = {}): Sheep {
  return {
    id,
    tag: `t${id}`,
    sex: "Ewe",
    birth: "2024-01-01",
    breed: "Suffolk",
    color: "White",
    weight: 60,
    mother_id: null,
    father_id: null,
    health: "Healthy",
    due_date: null,
    vaccination_date: null,
    status: "Active",
    photo_url: null,
    purchase_price: null,
    purchase_date: null,
    sale_price: null,
    sale_date: null,
    death_date: null,
    ...patch,
  };
}

function tx(id: number, patch: Partial<Transaction> = {}): Transaction {
  return {
    id,
    category: "feed",
    amount: 100_000,
    date: "2026-03-10",
    note: null,
    sheep_id: null,
    ...patch,
  };
}

describe("categoryType", () => {
  it("classifies every category as income or expense", () => {
    for (const c of EXPENSE_CATEGORIES) expect(categoryType(c)).toBe("expense");
    for (const c of INCOME_CATEGORIES) expect(categoryType(c)).toBe("income");
    expect(TX_CATEGORIES).toHaveLength(EXPENSE_CATEGORIES.length + INCOME_CATEGORIES.length);
  });
});

describe("buildLedger", () => {
  it("maps transactions and derives sheep purchases and sales", () => {
    const flock = [
      s(1, { purchase_price: 900_000, purchase_date: "2026-01-05" }),
      s(2, { status: "Sold", sale_price: 1_500_000, sale_date: "2026-02-01" }),
    ];
    const ledger = buildLedger([tx(7, { category: "wool", amount: 50_000 })], flock);

    expect(ledger.map((e) => e.key).sort()).toEqual(["purchase-1", "sale-2", "tx-7"]);
    const sale = ledger.find((e) => e.key === "sale-2")!;
    expect(sale).toMatchObject({ type: "income", category: "sheep_sale", amount: 1_500_000, sheepId: 2, txId: null });
    const purchase = ledger.find((e) => e.key === "purchase-1")!;
    expect(purchase).toMatchObject({ type: "expense", category: "sheep_purchase", amount: 900_000 });
    const wool = ledger.find((e) => e.key === "tx-7")!;
    expect(wool).toMatchObject({ type: "income", txId: 7 });
  });

  it("skips sold sheep without a price and ignores sale fields on non-sold sheep", () => {
    const flock = [
      s(1, { status: "Sold", sale_price: null }),
      s(2, { status: "Active", sale_price: 999, sale_date: "2026-01-01" }),
    ];
    expect(buildLedger([], flock)).toEqual([]);
  });

  it("sorts newest first with undated entries last", () => {
    const flock = [s(1, { purchase_price: 100 })]; // no purchase_date
    const ledger = buildLedger([tx(1, { date: "2026-01-01" }), tx(2, { date: "2026-06-01" })], flock);
    expect(ledger.map((e) => e.key)).toEqual(["tx-2", "tx-1", "purchase-1"]);
    expect(ledger[2].date).toBeNull();
  });

  it("coerces string amounts from the database", () => {
    const flock = [s(1, { purchase_price: "500" as unknown as number, purchase_date: "2026-01-01" })];
    const ledger = buildLedger([tx(1, { amount: "250" as unknown as number })], flock);
    expect(ledger.reduce((a, e) => a + e.amount, 0)).toBe(750);
  });
});

describe("ledgerYears", () => {
  it("dedupes years, sorts descending, and always includes the current year", () => {
    const ledger = buildLedger(
      [tx(1, { date: "2024-05-01" }), tx(2, { date: "2024-08-01" }), tx(3, { date: "2026-01-01" })],
      []
    );
    expect(ledgerYears(ledger, 2026)).toEqual([2026, 2024]);
    expect(ledgerYears([], 2026)).toEqual([2026]);
  });

  it("ignores undated entries", () => {
    const ledger = buildLedger([], [s(1, { purchase_price: 100 })]);
    expect(ledgerYears(ledger, 2026)).toEqual([2026]);
  });
});

describe("filterYear", () => {
  it("keeps only entries dated within the year, excluding undated", () => {
    const ledger = buildLedger(
      [tx(1, { date: "2025-12-31" }), tx(2, { date: "2026-01-01" })],
      [s(1, { purchase_price: 100 })]
    );
    expect(filterYear(ledger, 2026).map((e) => e.key)).toEqual(["tx-2"]);
  });
});

describe("ledgerTotals", () => {
  it("sums income and expenses into a net", () => {
    const ledger = buildLedger(
      [tx(1, { category: "wool", amount: 300 }), tx(2, { category: "feed", amount: 100 })],
      [s(1, { status: "Sold", sale_price: 1000, sale_date: "2026-01-01" })]
    );
    expect(ledgerTotals(ledger)).toEqual({ income: 1300, expense: 100, net: 1200 });
  });
});

describe("monthlyBreakdown", () => {
  it("always returns 12 rows and buckets by month", () => {
    const ledger = buildLedger(
      [
        tx(1, { date: "2026-01-15", category: "feed", amount: 100 }),
        tx(2, { date: "2026-01-20", category: "wool", amount: 400 }),
        tx(3, { date: "2026-12-05", category: "vet", amount: 50 }),
      ],
      []
    );
    const rows = monthlyBreakdown(ledger);
    expect(rows).toHaveLength(12);
    expect(rows[0]).toEqual({ month: 0, income: 400, expense: 100 });
    expect(rows[11]).toEqual({ month: 11, income: 0, expense: 50 });
    expect(rows[5]).toEqual({ month: 5, income: 0, expense: 0 });
  });
});

describe("categoryTotals", () => {
  it("aggregates per category with counts, sorted by total descending", () => {
    const ledger = buildLedger(
      [
        tx(1, { category: "feed", amount: 100 }),
        tx(2, { category: "feed", amount: 200 }),
        tx(3, { category: "vet", amount: 500 }),
      ],
      []
    );
    expect(categoryTotals(ledger)).toEqual([
      { category: "vet", type: "expense", total: 500, count: 1 },
      { category: "feed", type: "expense", total: 300, count: 2 },
    ]);
  });
});

describe("sheepProfitability", () => {
  it("attributes linked transactions and computes net per head", () => {
    const flock = [
      s(1, { status: "Sold", purchase_price: 900, sale_price: 1500, sale_date: "2026-02-01" }),
      s(2, { purchase_price: 800 }),
    ];
    const txs = [
      tx(1, { sheep_id: 1, category: "vet", amount: 100 }),
      tx(2, { sheep_id: 1, category: "wool", amount: 50 }),
      tx(3, { sheep_id: null, category: "feed", amount: 999 }), // overhead, not allocated
    ];
    const rows = sheepProfitability(txs, flock);
    expect(rows).toEqual([
      { sheepId: 1, purchase: 900, expenses: 100, extraIncome: 50, sale: 1500, sold: true, net: 550 },
      { sheepId: 2, purchase: 800, expenses: 0, extraIncome: 0, sale: null, sold: false, net: -800 },
    ]);
  });

  it("omits sheep with no money facts and sorts sold before unsold", () => {
    const flock = [
      s(1), // nothing — omitted
      s(2, { purchase_price: 100 }),
      s(3, { status: "Sold", sale_price: 700, sale_date: "2026-01-01" }),
    ];
    const rows = sheepProfitability([], flock);
    expect(rows.map((r) => r.sheepId)).toEqual([3, 2]);
  });

  it("treats a sold sheep without a price as unrealized (sale null)", () => {
    const rows = sheepProfitability([], [s(1, { status: "Sold", purchase_price: 100 })]);
    expect(rows[0].sale).toBeNull();
    expect(rows[0].net).toBe(-100);
  });

  it("includes a sheep whose only money fact is a linked transaction", () => {
    const rows = sheepProfitability([tx(1, { sheep_id: 5, category: "medicine", amount: 40 })], [s(5)]);
    expect(rows).toEqual([
      { sheepId: 5, purchase: 0, expenses: 40, extraIncome: 0, sale: null, sold: false, net: -40 },
    ]);
  });
});
