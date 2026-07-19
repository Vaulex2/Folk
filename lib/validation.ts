// Framework-free validation for the server actions in app/actions.ts.
// Pure input -> result functions so the rules are unit-testable; DB-dependent
// checks (tag uniqueness against the flock, pair validity) stay in the actions.
// Error strings are i18n keys, same convention as FormState.error.

import { HEALTH_STATUSES, type HealthStatus, type Sex } from "./sheep";
import { TX_CATEGORIES, type TxCategory } from "./finance";

export type Validated<T> = { ok: true; data: T } | { ok: false; error: string };

export interface SheepRecord {
  tag: string;
  sex: Sex;
  birth: string;
  breed: string | null;
  color: string | null;
  weight: number;
  mother_id: number | null;
  father_id: number | null;
  health: HealthStatus;
  vaccination_date: string | null;
  due_date: string | null;
  purchase_price: number | null;
  purchase_date: string | null;
}

/** Defaults applied when no weight is given: typical adult ram/ewe. */
export const DEFAULT_WEIGHTS: Record<Sex, number> = { Ram: 90, Ewe: 68 };

/** Newborn default when a lamb's birth weight is missing/invalid. */
export const DEFAULT_LAMB_WEIGHT = 4;

export function validateSheepInput(raw: {
  tag: string;
  sex: string;
  birth: string;
  weight: string;
  breed: string;
  color: string;
  mother_id: string;
  father_id: string;
  health: string;
  vaccination_date: string;
  due_date: string;
  purchase_price: string;
  purchase_date: string;
}): Validated<SheepRecord> {
  if (!raw.tag) return { ok: false, error: "form.errTagRequired" };
  if (!raw.birth) return { ok: false, error: "form.errDob" };
  if (raw.sex !== "Ewe" && raw.sex !== "Ram") return { ok: false, error: "form.errSex" };
  if (!HEALTH_STATUSES.includes(raw.health as HealthStatus)) {
    return { ok: false, error: "form.errHealth" };
  }
  const price = parsePrice(raw.purchase_price);
  if (price.invalid) return { ok: false, error: "money.errPrice" };

  const sex = raw.sex as Sex;
  const w = parseInt(raw.weight, 10);
  return {
    ok: true,
    data: {
      tag: raw.tag,
      sex,
      birth: raw.birth,
      breed: raw.breed || null,
      color: raw.color || null,
      weight: Number.isNaN(w) ? DEFAULT_WEIGHTS[sex] : w,
      mother_id: raw.mother_id ? parseInt(raw.mother_id, 10) : null,
      father_id: raw.father_id ? parseInt(raw.father_id, 10) : null,
      health: raw.health as HealthStatus,
      vaccination_date: raw.vaccination_date || null,
      due_date: raw.due_date || null,
      purchase_price: price.value,
      purchase_date: price.value != null ? raw.purchase_date || null : null,
    },
  };
}

/** Empty string means "no price"; anything else must parse to a number ≥ 0. */
export function parsePrice(raw: string): { value: number | null; invalid: boolean } {
  if (!raw) return { value: null, invalid: false };
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return { value: null, invalid: true };
  return { value: n, invalid: false };
}

export interface BulkAddInput {
  count: number;
  sex: Sex;
  breed: string | null;
  color: string | null;
  age_years: number;
  weight: number;
  purchase_price: number | null;
  purchase_date: string | null;
  health: HealthStatus;
  due_date: string | null;
  start_num: number;
}

export const BULK_MAX = 200;

/** Validate the bulk-add form: one shared profile applied to `count` animals. */
export function validateBulkAdd(raw: {
  count: string;
  sex: string;
  breed: string;
  color: string;
  avgAge: string;
  avgWeight: string;
  price: string;
  purchaseDate: string;
  health: string;
  dueDate: string;
  startTag: string;
}): Validated<BulkAddInput> {
  const count = parseInt(raw.count, 10);
  if (!Number.isFinite(count) || count < 1 || count > BULK_MAX) {
    return { ok: false, error: "bulk.errCount" };
  }
  if (raw.sex !== "Ewe" && raw.sex !== "Ram") return { ok: false, error: "form.errSex" };
  const sex = raw.sex as Sex;

  const age = Number(raw.avgAge);
  if (!Number.isFinite(age) || age <= 0 || age > 20) return { ok: false, error: "bulk.errAge" };

  const startNum = parseInt(raw.startTag, 10);
  if (!Number.isFinite(startNum) || startNum < 1) return { ok: false, error: "bulk.errStart" };

  if (!HEALTH_STATUSES.includes(raw.health as HealthStatus)) {
    return { ok: false, error: "form.errHealth" };
  }

  const price = parsePrice(raw.price);
  if (price.invalid) return { ok: false, error: "money.errPrice" };

  const w = parseInt(raw.avgWeight, 10);
  return {
    ok: true,
    data: {
      count,
      sex,
      breed: raw.breed || null,
      color: raw.color || null,
      age_years: age,
      weight: Number.isFinite(w) && w > 0 ? w : DEFAULT_WEIGHTS[sex],
      purchase_price: price.value,
      purchase_date: price.value != null ? raw.purchaseDate || null : null,
      health: raw.health as HealthStatus,
      due_date: raw.dueDate || null,
      start_num: startNum,
    },
  };
}

export interface TaskInput {
  title: string;
  due_date: string | null;
  sheep_id: number | null;
}

export function validateTask(raw: {
  title: string;
  dueDate: string;
  sheepId: string;
}): Validated<TaskInput> {
  if (!raw.title) return { ok: false, error: "tasks.errTitle" };
  const sheepId = raw.sheepId ? parseInt(raw.sheepId, 10) : null;
  if (sheepId != null && !Number.isFinite(sheepId)) {
    return { ok: false, error: "notes.errMissingSheep" };
  }
  return {
    ok: true,
    data: { title: raw.title, due_date: raw.dueDate || null, sheep_id: sheepId },
  };
}

export interface TransactionInput {
  category: TxCategory;
  amount: number;
  date: string;
  note: string | null;
  sheep_id: number | null;
}

export function validateTransaction(raw: {
  category: string;
  amount: string;
  date: string;
  note: string;
  sheepId: string;
}): Validated<TransactionInput> {
  if (!TX_CATEGORIES.includes(raw.category as TxCategory)) {
    return { ok: false, error: "finance.errCategory" };
  }
  const price = parsePrice(raw.amount);
  if (price.invalid || price.value == null || price.value <= 0) {
    return { ok: false, error: "money.errPrice" };
  }
  if (!raw.date) return { ok: false, error: "notes.errDate" };
  const sheepId = raw.sheepId ? parseInt(raw.sheepId, 10) : null;
  if (sheepId != null && !Number.isFinite(sheepId)) {
    return { ok: false, error: "notes.errMissingSheep" };
  }
  return {
    ok: true,
    data: {
      category: raw.category as TxCategory,
      amount: price.value,
      date: raw.date,
      note: raw.note || null,
      sheep_id: sheepId,
    },
  };
}

export interface HealthNoteInput {
  sheep_id: number;
  date: string;
  status: HealthStatus | null;
  note: string;
}

export function validateHealthNote(raw: {
  sheepId: number;
  date: string;
  status: string;
  note: string;
}): Validated<HealthNoteInput> {
  if (!Number.isFinite(raw.sheepId)) return { ok: false, error: "notes.errMissingSheep" };
  if (!raw.date) return { ok: false, error: "notes.errDate" };
  if (!raw.note) return { ok: false, error: "notes.errNote" };
  const status = HEALTH_STATUSES.includes(raw.status as HealthStatus)
    ? (raw.status as HealthStatus)
    : null;
  return { ok: true, data: { sheep_id: raw.sheepId, date: raw.date, status, note: raw.note } };
}

export interface WeightRecordInput {
  sheep_id: number;
  date: string;
  weight_kg: number;
}

export function validateWeightRecord(raw: {
  sheepId: number;
  date: string;
  weightKg: number;
}): Validated<WeightRecordInput> {
  if (!Number.isFinite(raw.sheepId)) return { ok: false, error: "notes.errMissingSheep" };
  if (!raw.date) return { ok: false, error: "notes.errDate" };
  if (!Number.isFinite(raw.weightKg) || raw.weightKg <= 0) {
    return { ok: false, error: "weights.errWeight" };
  }
  return {
    ok: true,
    data: { sheep_id: raw.sheepId, date: raw.date, weight_kg: raw.weightKg },
  };
}

export interface LambInput {
  tag: string;
  sex: Sex;
  weight: number;
}

/**
 * Validate the lambs entered on the lambing form. Tags must be unique within
 * the litter (the whole-flock check needs the DB and stays in the action).
 */
export function validateLambingInput(raw: {
  birth: string;
  lambs: { tag: string; sex: string; weight: number }[];
}): Validated<{ birth: string; lambs: LambInput[] }> {
  if (!raw.birth) return { ok: false, error: "form.errDob" };

  const lambs: LambInput[] = [];
  for (const l of raw.lambs) {
    if (!l.tag) return { ok: false, error: "form.errTagRequired" };
    if (l.sex !== "Ewe" && l.sex !== "Ram") return { ok: false, error: "form.errSex" };
    lambs.push({
      tag: l.tag,
      sex: l.sex as Sex,
      weight: Number.isFinite(l.weight) && l.weight > 0 ? Math.round(l.weight) : DEFAULT_LAMB_WEIGHT,
    });
  }
  if (lambs.length === 0) return { ok: false, error: "lambing.errNoLambs" };

  const lowered = lambs.map((l) => l.tag.toLowerCase());
  if (new Set(lowered).size !== lambs.length) return { ok: false, error: "form.errTagInUse" };

  return { ok: true, data: { birth: raw.birth, lambs } };
}
