// Framework-free validation for the server actions in app/actions.ts.
// Pure input -> result functions so the rules are unit-testable; DB-dependent
// checks (tag uniqueness against the flock, pair validity) stay in the actions.
// Error strings are i18n keys, same convention as FormState.error.

import { HEALTH_STATUSES, type HealthStatus, type Sex } from "./sheep";

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
}): Validated<SheepRecord> {
  if (!raw.tag) return { ok: false, error: "form.errTagRequired" };
  if (!raw.birth) return { ok: false, error: "form.errDob" };
  if (raw.sex !== "Ewe" && raw.sex !== "Ram") return { ok: false, error: "form.errSex" };
  if (!HEALTH_STATUSES.includes(raw.health as HealthStatus)) {
    return { ok: false, error: "form.errHealth" };
  }

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
