import { describe, expect, it } from "vitest";
import {
  DEFAULT_LAMB_WEIGHT,
  DEFAULT_WEIGHTS,
  validateHealthNote,
  validateLambingInput,
  validateSheepInput,
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
