import { describe, expect, it } from "vitest";
import {
  DEFAULT_LAMB_WEIGHT,
  DEFAULT_WEIGHTS,
  parsePrice,
  validateBulkAdd,
  validateHealthNote,
  validateLambingInput,
  validateSheepInput,
  validateTask,
  validateTransaction,
  validateWeightRecord,
} from "@/lib/validation";

const validSheep = {
  tag: "26-001",
  sex: "Ewe",
  birth: "2026-01-01",
  weight: "70",
  breed: "Suffolk",
  color: "White",
  mother_id: "",
  father_id: "",
  health: "Healthy",
  vaccination_date: "",
  due_date: "",
  purchase_price: "",
  purchase_date: "",
};

describe("validateSheepInput", () => {
  it("accepts a complete record", () => {
    const r = validateSheepInput(validSheep);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.tag).toBe("26-001");
      expect(r.data.weight).toBe(70);
      expect(r.data.mother_id).toBeNull();
    }
  });

  it.each([
    ["missing tag", { tag: "" }, "form.errTagRequired"],
    ["missing birth", { birth: "" }, "form.errDob"],
    ["bad sex", { sex: "Goat" }, "form.errSex"],
    ["bad health", { health: "Vibing" }, "form.errHealth"],
  ])("rejects %s", (_name, patch, error) => {
    const r = validateSheepInput({ ...validSheep, ...patch });
    expect(r).toEqual({ ok: false, error });
  });

  it("defaults weight by sex when omitted", () => {
    const ewe = validateSheepInput({ ...validSheep, weight: "" });
    const ram = validateSheepInput({ ...validSheep, sex: "Ram", weight: "" });
    if (ewe.ok) expect(ewe.data.weight).toBe(DEFAULT_WEIGHTS.Ewe);
    if (ram.ok) expect(ram.data.weight).toBe(DEFAULT_WEIGHTS.Ram);
  });

  it("normalizes blank optionals to null and parses parent ids", () => {
    const r = validateSheepInput({
      ...validSheep,
      breed: "",
      color: "",
      mother_id: "12",
      father_id: "13",
      vaccination_date: "",
      due_date: "2026-06-02",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.breed).toBeNull();
      expect(r.data.color).toBeNull();
      expect(r.data.mother_id).toBe(12);
      expect(r.data.father_id).toBe(13);
      expect(r.data.vaccination_date).toBeNull();
      expect(r.data.due_date).toBe("2026-06-02");
    }
  });
});

describe("validateHealthNote", () => {
  const valid = { sheepId: 1, date: "2026-07-01", status: "Healthy", note: "Looks well" };

  it("accepts a note with a status", () => {
    const r = validateHealthNote(valid);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.status).toBe("Healthy");
  });

  it("treats an unrecognized status as no status change", () => {
    const r = validateHealthNote({ ...valid, status: "" });
    if (r.ok) expect(r.data.status).toBeNull();
  });

  it.each([
    ["missing sheep", { sheepId: NaN }, "notes.errMissingSheep"],
    ["missing date", { date: "" }, "notes.errDate"],
    ["empty note", { note: "" }, "notes.errNote"],
  ])("rejects %s", (_name, patch, error) => {
    expect(validateHealthNote({ ...valid, ...patch })).toEqual({ ok: false, error });
  });
});

describe("validateWeightRecord", () => {
  const valid = { sheepId: 1, date: "2026-07-01", weightKg: 62.5 };

  it("accepts a positive weight", () => {
    const r = validateWeightRecord(valid);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.weight_kg).toBe(62.5);
  });

  it.each([
    ["missing sheep", { sheepId: NaN }, "notes.errMissingSheep"],
    ["missing date", { date: "" }, "notes.errDate"],
    ["zero weight", { weightKg: 0 }, "weights.errWeight"],
    ["negative weight", { weightKg: -5 }, "weights.errWeight"],
    ["non-numeric weight", { weightKg: NaN }, "weights.errWeight"],
  ])("rejects %s", (_name, patch, error) => {
    expect(validateWeightRecord({ ...valid, ...patch })).toEqual({ ok: false, error });
  });
});

describe("validateLambingInput", () => {
  const lamb = { tag: "26-100", sex: "Ewe", weight: 4.2 };

  it("accepts a litter and rounds weights", () => {
    const r = validateLambingInput({ birth: "2026-06-02", lambs: [lamb] });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.lambs[0].weight).toBe(4);
  });

  it("defaults a missing birth weight", () => {
    const r = validateLambingInput({ birth: "2026-06-02", lambs: [{ ...lamb, weight: NaN }] });
    if (r.ok) expect(r.data.lambs[0].weight).toBe(DEFAULT_LAMB_WEIGHT);
  });

  it("rejects duplicate tags within the litter, case-insensitively", () => {
    const r = validateLambingInput({
      birth: "2026-06-02",
      lambs: [lamb, { ...lamb, tag: "26-100" }],
    });
    expect(r).toEqual({ ok: false, error: "form.errTagInUse" });

    const mixedCase = validateLambingInput({
      birth: "2026-06-02",
      lambs: [{ ...lamb, tag: "26-abc" }, { ...lamb, tag: "26-ABC" }],
    });
    expect(mixedCase).toEqual({ ok: false, error: "form.errTagInUse" });
  });

  it.each([
    ["missing birth", { birth: "", lambs: [lamb] }, "form.errDob"],
    ["no lambs", { birth: "2026-06-02", lambs: [] }, "lambing.errNoLambs"],
    ["untagged lamb", { birth: "2026-06-02", lambs: [{ ...lamb, tag: "" }] }, "form.errTagRequired"],
    ["bad sex", { birth: "2026-06-02", lambs: [{ ...lamb, sex: "" }] }, "form.errSex"],
  ])("rejects %s", (_name, input, error) => {
    expect(validateLambingInput(input)).toEqual({ ok: false, error });
  });
});

describe("parsePrice", () => {
  it("treats an empty string as no price", () => {
    expect(parsePrice("")).toEqual({ value: null, invalid: false });
  });

  it("parses a plain number", () => {
    expect(parsePrice("1500000")).toEqual({ value: 1500000, invalid: false });
  });

  it.each(["-5", "abc", "Infinity"])("flags %s as invalid", (raw) => {
    expect(parsePrice(raw).invalid).toBe(true);
  });
});

describe("validateSheepInput purchase fields", () => {
  const base = {
    tag: "26-001",
    sex: "Ewe",
    birth: "2026-01-01",
    weight: "70",
    breed: "Suffolk",
    color: "White",
    mother_id: "",
    father_id: "",
    health: "Healthy",
    vaccination_date: "",
    due_date: "",
    purchase_price: "",
    purchase_date: "",
  };

  it("keeps a valid price and its date", () => {
    const r = validateSheepInput({ ...base, purchase_price: "1200000", purchase_date: "2026-03-01" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.purchase_price).toBe(1200000);
      expect(r.data.purchase_date).toBe("2026-03-01");
    }
  });

  it("drops the purchase date when there is no price", () => {
    const r = validateSheepInput({ ...base, purchase_date: "2026-03-01" });
    if (r.ok) expect(r.data.purchase_date).toBeNull();
  });

  it("rejects a negative price", () => {
    const r = validateSheepInput({ ...base, purchase_price: "-100" });
    expect(r).toEqual({ ok: false, error: "money.errPrice" });
  });
});

describe("validateTask", () => {
  it("accepts a task with due date and sheep", () => {
    const r = validateTask({ title: "Shearing", dueDate: "2026-08-01", sheepId: "12" });
    expect(r).toEqual({
      ok: true,
      data: { title: "Shearing", due_date: "2026-08-01", sheep_id: 12 },
    });
  });

  it("accepts a bare title", () => {
    const r = validateTask({ title: "Buy feed", dueDate: "", sheepId: "" });
    expect(r).toEqual({ ok: true, data: { title: "Buy feed", due_date: null, sheep_id: null } });
  });

  it("rejects a missing title", () => {
    expect(validateTask({ title: "", dueDate: "", sheepId: "" })).toEqual({
      ok: false,
      error: "tasks.errTitle",
    });
  });
});

describe("validateTransaction", () => {
  const valid = { category: "feed", amount: "150000", date: "2026-07-01", note: "Hay", sheepId: "" };

  it("accepts a complete expense", () => {
    const r = validateTransaction(valid);
    expect(r).toEqual({
      ok: true,
      data: { category: "feed", amount: 150000, date: "2026-07-01", note: "Hay", sheep_id: null },
    });
  });

  it("normalizes blank note and parses a sheep link", () => {
    const r = validateTransaction({ ...valid, note: "", sheepId: "12" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.note).toBeNull();
      expect(r.data.sheep_id).toBe(12);
    }
  });

  it.each([
    ["unknown category", { category: "casino" }, "finance.errCategory"],
    ["empty amount", { amount: "" }, "money.errPrice"],
    ["zero amount", { amount: "0" }, "money.errPrice"],
    ["negative amount", { amount: "-100" }, "money.errPrice"],
    ["non-numeric amount", { amount: "abc" }, "money.errPrice"],
    ["missing date", { date: "" }, "notes.errDate"],
  ])("rejects %s", (_name, patch, error) => {
    expect(validateTransaction({ ...valid, ...patch })).toEqual({ ok: false, error });
  });
});

describe("validateBulkAdd", () => {
  const base = {
    count: "78",
    sex: "Ewe",
    breed: "Jaydari",
    color: "White",
    avgAge: "2",
    avgWeight: "",
    price: "2500000",
    purchaseDate: "2026-06-15",
    health: "Pregnant",
    dueDate: "2026-11-15",
    startTag: "3",
  };

  it("accepts a full group profile and defaults weight by sex", () => {
    const r = validateBulkAdd(base);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.count).toBe(78);
      expect(r.data.weight).toBe(68);
      expect(r.data.purchase_price).toBe(2500000);
      expect(r.data.due_date).toBe("2026-11-15");
      expect(r.data.start_num).toBe(3);
    }
  });

  it("drops the purchase date when no price is given", () => {
    const r = validateBulkAdd({ ...base, price: "" });
    if (r.ok) {
      expect(r.data.purchase_price).toBeNull();
      expect(r.data.purchase_date).toBeNull();
    }
  });

  it.each([
    ["zero count", { count: "0" }, "bulk.errCount"],
    ["oversized count", { count: "500" }, "bulk.errCount"],
    ["bad sex", { sex: "Goat" }, "form.errSex"],
    ["zero age", { avgAge: "0" }, "bulk.errAge"],
    ["absurd age", { avgAge: "30" }, "bulk.errAge"],
    ["bad start", { startTag: "0" }, "bulk.errStart"],
    ["bad health", { health: "Vibing" }, "form.errHealth"],
    ["negative price", { price: "-1" }, "money.errPrice"],
  ])("rejects %s", (_name, patch, error) => {
    expect(validateBulkAdd({ ...base, ...patch })).toEqual({ ok: false, error });
  });
});
