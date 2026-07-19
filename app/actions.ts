"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { requireUser } from "@/lib/auth/server";
import { FLOCK_TAG } from "@/lib/flock";
import { notifyEvent } from "@/lib/notify";
import { logError } from "@/lib/log";
import {
  addDays,
  GESTATION_DAYS,
  type HealthStatus,
  type Mating,
  type MatingStatus,
  type SheepStatus,
} from "@/lib/sheep";
import {
  validateBulkAdd,
  validateHealthNote,
  validateLambingInput,
  validateSheepInput,
  validateTask,
  validateTransaction,
  validateWeightRecord,
} from "@/lib/validation";

export interface FormState {
  error?: string;
  /** Set on success by actions whose form stays on the page (so it can refresh). */
  ok?: boolean;
}

function str(fd: FormData, k: string): string {
  return String(fd.get(k) ?? "").trim();
}

// Log the real database error server-side and return a generic message to the
// form — raw Postgres/PostgREST error text must not surface in the UI.
function dbFail(scope: string, err: unknown): FormState {
  logError(scope, err);
  return { error: "errors.dbError" };
}

// Escape LIKE/ILIKE wildcards so a tag is matched literally, not as a pattern
// (default Postgres escape char is backslash).
function escapeLike(v: string): string {
  return v.replace(/[\\%_]/g, (c) => `\\${c}`);
}

// For actions that throw (their forms don't render {error}); log the real cause
// and throw a generic message so raw DB text never reaches an error overlay.
function dbThrow(scope: string, err: unknown): never {
  logError(scope, err);
  throw new Error("Database operation failed");
}

/** Create or update a sheep. Used by SheepForm for both /sheep/new and /edit. */
export async function saveSheep(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireUser();
  const supabase = getSupabase();
  const idRaw = str(fd, "id");
  const id = idRaw ? parseInt(idRaw, 10) : null;

  const parsed = validateSheepInput({
    tag: str(fd, "tag"),
    sex: str(fd, "sex"),
    birth: str(fd, "birth"),
    weight: str(fd, "weight"),
    breed: str(fd, "breed"),
    color: str(fd, "color"),
    mother_id: str(fd, "mother_id"),
    father_id: str(fd, "father_id"),
    health: str(fd, "health"),
    vaccination_date: str(fd, "vaccination_date"),
    due_date: str(fd, "due_date"),
    purchase_price: str(fd, "purchase_price"),
    purchase_date: str(fd, "purchase_date"),
  });
  if (!parsed.ok) return { error: parsed.error };
  const record = parsed.data;
  const { tag, sex, breed, health } = record;

  // tag uniqueness (case-insensitive), excluding self on edit
  const dup = await supabase.from("sheep").select("id").ilike("tag", escapeLike(tag));
  if (dup.error) return dbFail("saveSheep.dupCheck", dup.error);
  if ((dup.data ?? []).some((r) => r.id !== id)) {
    return { error: "form.errTagInUse" };
  }

  let savedId = id;
  if (id == null) {
    const { data, error } = await supabase.from("sheep").insert(record).select("id").single();
    if (error) return dbFail("saveSheep.insert", error);
    savedId = data.id;
    await notifyEvent({ type: "new_sheep", sheepId: data.id, tag, sex, breed: breed || null });
  } else {
    const { data: before, error: beforeErr } = await supabase
      .from("sheep")
      .select("tag, sex, birth, breed, color, weight, mother_id, father_id, health, vaccination_date, due_date, purchase_price, purchase_date")
      .eq("id", id)
      .single();
    if (beforeErr) return dbFail("saveSheep.before", beforeErr);
    const { error } = await supabase.from("sheep").update(record).eq("id", id);
    if (error) return dbFail("saveSheep.update", error);

    if (before.health !== health) {
      await notifyEvent({ type: "health_changed", sheepId: id, tag, previousHealth: before.health, newHealth: health });
    }

    const editableFields = [
      "tag",
      "sex",
      "birth",
      "breed",
      "color",
      "weight",
      "mother_id",
      "father_id",
      "vaccination_date",
      "due_date",
      "purchase_price",
      "purchase_date",
    ] as const;
    const changedFields = editableFields.filter((f) => before[f] !== record[f]);
    if (changedFields.length > 0) {
      await notifyEvent({ type: "sheep_edited", sheepId: id, tag, changedFields });
    }
  }

  updateTag(FLOCK_TAG);
  redirect(`/sheep/${savedId}`);
}

/** Register a batch of animals sharing one profile (sex, breed, age, price…).
 * Tags are sequential zero-padded numbers starting from the given number. */
export async function bulkAddSheep(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireUser();
  const supabase = getSupabase();
  const parsed = validateBulkAdd({
    count: str(fd, "count"),
    sex: str(fd, "sex"),
    breed: str(fd, "breed"),
    color: str(fd, "color"),
    avgAge: str(fd, "avg_age"),
    avgWeight: str(fd, "avg_weight"),
    price: str(fd, "price"),
    purchaseDate: str(fd, "purchase_date"),
    health: str(fd, "health"),
    dueDate: str(fd, "due_date"),
    startTag: str(fd, "start_tag"),
  });
  if (!parsed.ok) return { error: parsed.error };
  const b = parsed.data;

  const birth = addDays(
    new Date().toISOString().slice(0, 10),
    -Math.round(b.age_years * 365.25)
  );
  const width = Math.max(3, String(b.start_num + b.count - 1).length);
  const tags = Array.from({ length: b.count }, (_, i) =>
    String(b.start_num + i).padStart(width, "0")
  );

  // One read of all existing tags beats N ilike round-trips for uniqueness.
  const { data: existing, error: exErr } = await supabase.from("sheep").select("tag");
  if (exErr) return dbFail("bulkAddSheep.tags", exErr);
  const taken = new Set((existing ?? []).map((r) => r.tag.toLowerCase()));
  if (tags.some((tg) => taken.has(tg.toLowerCase()))) return { error: "form.errTagInUse" };

  const rows = tags.map((tag) => ({
    tag,
    sex: b.sex,
    birth,
    breed: b.breed,
    color: b.color,
    weight: b.weight,
    health: b.health,
    due_date: b.due_date,
    purchase_price: b.purchase_price,
    purchase_date: b.purchase_date,
    status: "Active",
  }));
  const { error } = await supabase.from("sheep").insert(rows);
  if (error) return dbFail("bulkAddSheep.insert", error);

  await notifyEvent({
    type: "bulk_added",
    count: b.count,
    sex: b.sex,
    breed: b.breed,
    firstTag: tags[0],
    lastTag: tags[tags.length - 1],
  });

  updateTag(FLOCK_TAG);
  redirect("/sheep");
}

/** Soft-remove: mark Sold (optionally with a price) or Died — keeps pedigree
 * links intact — or restore to Active, which clears any recorded sale. */
export async function setSheepStatus(id: number, status: SheepStatus, salePrice?: number | null) {
  await requireUser();
  const supabase = getSupabase();

  const update: {
    status: SheepStatus;
    sale_price?: number | null;
    sale_date?: string | null;
    death_date?: string | null;
  } = { status };
  const today = new Date().toISOString().slice(0, 10);
  if (status === "Sold") {
    const price = Number.isFinite(salePrice as number) && (salePrice as number) >= 0 ? salePrice : null;
    update.sale_price = price;
    update.sale_date = today;
    update.death_date = null;
  } else if (status === "Died") {
    update.death_date = today;
    update.sale_price = null;
    update.sale_date = null;
  } else if (status === "Active") {
    update.sale_price = null;
    update.sale_date = null;
    update.death_date = null;
  }

  const { error } = await supabase.from("sheep").update(update).eq("id", id);
  if (error) dbThrow("setSheepStatus.update", error);

  const { data } = await supabase.from("sheep").select("tag").eq("id", id).single();
  const tag = data?.tag ?? String(id);
  if (status === "Sold" || status === "Died") {
    await notifyEvent({ type: "removed", sheepId: id, tag, status, salePrice: update.sale_price ?? null });
  } else if (status === "Active") {
    await notifyEvent({ type: "restored", sheepId: id, tag });
  }

  updateTag(FLOCK_TAG);
}

/** Append a dated health note; if it carries a status, update the sheep's current health. */
export async function addHealthNote(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireUser();
  const supabase = getSupabase();
  const parsed = validateHealthNote({
    sheepId: parseInt(str(fd, "sheep_id"), 10),
    date: str(fd, "date"),
    status: str(fd, "status"),
    note: str(fd, "note"),
  });
  if (!parsed.ok) return { error: parsed.error };
  const { sheep_id: sheepId, date, status, note } = parsed.data;

  const { error } = await supabase
    .from("health_notes")
    .insert({ sheep_id: sheepId, date, status, note });
  if (error) return dbFail("addHealthNote.insert", error);

  if (status) {
    const { data: before } = await supabase.from("sheep").select("tag, health").eq("id", sheepId).single();
    const { error: uErr } = await supabase.from("sheep").update({ health: status }).eq("id", sheepId);
    if (uErr) return dbFail("addHealthNote.updateHealth", uErr);
    if (before && before.health !== status) {
      await notifyEvent({
        type: "health_changed",
        sheepId,
        tag: before.tag,
        previousHealth: before.health,
        newHealth: status,
      });
    } else if (before) {
      await notifyEvent({ type: "note_added", sheepId, tag: before.tag, note });
    }
  } else {
    const { data: sheepRow } = await supabase.from("sheep").select("tag").eq("id", sheepId).single();
    await notifyEvent({ type: "note_added", sheepId, tag: sheepRow?.tag ?? String(sheepId), note });
  }

  updateTag(FLOCK_TAG);
  return {};
}

/** Store a (client-downscaled) photo in the sheep-photos bucket and save its URL. */
export async function uploadSheepPhoto(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireUser();
  const supabase = getSupabase();
  const sheepId = parseInt(str(fd, "sheep_id"), 10);
  const file = fd.get("file");

  if (!Number.isFinite(sheepId)) return { error: "notes.errMissingSheep" };
  if (!(file instanceof File) || file.size === 0) return { error: "photo.errUpload" };

  const path = `${sheepId}.jpg`;
  const { error: upErr } = await supabase.storage
    .from("sheep-photos")
    .upload(path, file, { upsert: true, contentType: "image/jpeg" });
  if (upErr) return dbFail("uploadSheepPhoto.upload", upErr);

  // Stable path + upsert means CDN caches the old image; bust with a version param.
  const { data } = supabase.storage.from("sheep-photos").getPublicUrl(path);
  const { error: uErr } = await supabase
    .from("sheep")
    .update({ photo_url: `${data.publicUrl}?v=${Date.now()}` })
    .eq("id", sheepId);
  if (uErr) return dbFail("uploadSheepPhoto.updateUrl", uErr);

  updateTag(FLOCK_TAG);
  return { ok: true };
}

/** Append a dated weight record; the sheep's current weight follows the newest-dated record. */
export async function addWeightRecord(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireUser();
  const supabase = getSupabase();
  const parsed = validateWeightRecord({
    sheepId: parseInt(str(fd, "sheep_id"), 10),
    date: str(fd, "date"),
    weightKg: parseFloat(str(fd, "weight_kg")),
  });
  if (!parsed.ok) return { error: parsed.error };
  const { sheep_id: sheepId } = parsed.data;

  const { error } = await supabase.from("weight_records").insert(parsed.data);
  if (error) return dbFail("addWeightRecord.insert", error);

  // Sync sheep.weight to the newest-dated record (a backdated entry must not win).
  const { data: latest, error: lErr } = await supabase
    .from("weight_records")
    .select("weight_kg")
    .eq("sheep_id", sheepId)
    .order("date", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)
    .single();
  if (lErr) return dbFail("addWeightRecord.latest", lErr);

  const { error: uErr } = await supabase
    .from("sheep")
    .update({ weight: Math.round(latest.weight_kg) })
    .eq("id", sheepId);
  if (uErr) return dbFail("addWeightRecord.syncWeight", uErr);

  updateTag(FLOCK_TAG);
  return { ok: true };
}

/** Add a farm task (optionally linked to one sheep, optionally dated). */
export async function addTask(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireUser();
  const supabase = getSupabase();
  const parsed = validateTask({
    title: str(fd, "title"),
    dueDate: str(fd, "due_date"),
    sheepId: str(fd, "sheep_id"),
  });
  if (!parsed.ok) return { error: parsed.error };

  const { error } = await supabase.from("tasks").insert(parsed.data);
  if (error) return dbFail("addTask.insert", error);

  updateTag(FLOCK_TAG);
  return { ok: true };
}

/** Tick a task off (or untick it). */
export async function setTaskDone(id: number, done: boolean) {
  await requireUser();
  const supabase = getSupabase();
  const { error } = await supabase.from("tasks").update({ done }).eq("id", id);
  if (error) dbThrow("setTaskDone.update", error);
  updateTag(FLOCK_TAG);
}

export async function deleteTask(id: number) {
  await requireUser();
  const supabase = getSupabase();
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) dbThrow("deleteTask.delete", error);
  updateTag(FLOCK_TAG);
}

/** Record a ledger expense or extra income (optionally linked to one sheep). */
export async function addTransaction(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireUser();
  const supabase = getSupabase();
  const parsed = validateTransaction({
    category: str(fd, "category"),
    amount: str(fd, "amount"),
    date: str(fd, "date"),
    note: str(fd, "note"),
    sheepId: str(fd, "sheep_id"),
  });
  if (!parsed.ok) return { error: parsed.error };

  const { error } = await supabase.from("transactions").insert(parsed.data);
  if (error) return dbFail("addTransaction.insert", error);

  updateTag(FLOCK_TAG);
  return { ok: true };
}

export async function deleteTransaction(id: number) {
  await requireUser();
  const supabase = getSupabase();
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) dbThrow("deleteTransaction.delete", error);
  updateTag(FLOCK_TAG);
}

/** Clear a ewe's pregnancy state (after lambing, or a failed mating). */
async function resetEwePregnancy(eweId: number) {
  const supabase = getSupabase();
  const { data } = await supabase.from("sheep").select("health").eq("id", eweId).single();
  const update: { due_date: null; health?: HealthStatus } = { due_date: null };
  if (data?.health === "Pregnant") update.health = "Healthy";
  await supabase.from("sheep").update(update).eq("id", eweId);
}

/** Record a planned mating from the breeding-check page. Due date = mating + gestation. */
export async function recordMating(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireUser();
  const supabase = getSupabase();
  const eweId = parseInt(str(fd, "ewe_id"), 10);
  const ramId = parseInt(str(fd, "ram_id"), 10);
  const matingDate = str(fd, "date");

  if (!Number.isFinite(eweId) || !Number.isFinite(ramId)) return { error: "breeding.errPair" };
  if (!matingDate) return { error: "breeding.errDate" };

  const { data: pair, error: pairErr } = await supabase
    .from("sheep")
    .select("id, tag, sex, status")
    .in("id", [eweId, ramId]);
  if (pairErr) return dbFail("recordMating.pair", pairErr);
  const ewe = (pair ?? []).find((s) => s.id === eweId);
  const ram = (pair ?? []).find((s) => s.id === ramId);
  if (!ewe || !ram || ewe.sex !== "Ewe" || ram.sex !== "Ram") return { error: "breeding.errPair" };
  if (ewe.status !== "Active" || ram.status !== "Active") return { error: "breeding.errPair" };

  const { data: open, error: openErr } = await supabase
    .from("matings")
    .select("id")
    .eq("ewe_id", eweId)
    .in("status", ["Planned", "Confirmed"]);
  if (openErr) return dbFail("recordMating.open", openErr);
  if ((open ?? []).length > 0) return { error: "breeding.errOpenMating" };

  const { error } = await supabase.from("matings").insert({
    ewe_id: eweId,
    ram_id: ramId,
    mating_date: matingDate,
    due_date: addDays(matingDate, GESTATION_DAYS),
    status: "Planned",
  });
  if (error) return dbFail("recordMating.insert", error);

  await notifyEvent({ type: "mating_recorded", eweId, eweTag: ewe.tag, ramTag: ram.tag, matingDate });

  updateTag(FLOCK_TAG);
  return { ok: true };
}

/** Advance a mating: Confirmed marks the ewe pregnant, Failed releases her. */
export async function setMatingStatus(id: number, status: MatingStatus) {
  await requireUser();
  const supabase = getSupabase();
  const { data: mating, error: mErr } = await supabase
    .from("matings")
    .select("id, ewe_id, ram_id, mating_date, due_date, status")
    .eq("id", id)
    .single();
  if (mErr) dbThrow("setMatingStatus.load", mErr);
  if (!mating) throw new Error("Mating not found");

  const { error } = await supabase.from("matings").update({ status }).eq("id", id);
  if (error) dbThrow("setMatingStatus.update", error);

  if (status === "Confirmed") {
    const { data: eweBefore } = await supabase
      .from("sheep")
      .select("tag, health")
      .eq("id", mating.ewe_id)
      .single();
    const { error: uErr } = await supabase
      .from("sheep")
      .update({ health: "Pregnant", due_date: mating.due_date })
      .eq("id", mating.ewe_id);
    if (uErr) dbThrow("setMatingStatus.pregnant", uErr);
    if (eweBefore && eweBefore.health !== "Pregnant") {
      await notifyEvent({
        type: "health_changed",
        sheepId: mating.ewe_id,
        tag: eweBefore.tag,
        previousHealth: eweBefore.health,
        newHealth: "Pregnant",
      });
    }
  } else if (status === "Failed") {
    await resetEwePregnancy(mating.ewe_id);
    const { data: pair } = await supabase.from("sheep").select("id, tag").in("id", [mating.ewe_id, mating.ram_id]);
    const eweTag = (pair ?? []).find((s) => s.id === mating.ewe_id)?.tag ?? String(mating.ewe_id);
    const ramTag = (pair ?? []).find((s) => s.id === mating.ram_id)?.tag ?? String(mating.ram_id);
    await notifyEvent({ type: "mating_failed", eweId: mating.ewe_id, eweTag, ramTag });
  }

  updateTag(FLOCK_TAG);
}

/** Register the lambs born from a mating: creates sheep rows with dam & sire linked. */
export async function recordLambing(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireUser();
  const supabase = getSupabase();
  const matingId = parseInt(str(fd, "mating_id"), 10);
  const count = parseInt(str(fd, "count"), 10);

  if (!Number.isFinite(matingId)) return { error: "breeding.errPair" };

  const rawLambs: { tag: string; sex: string; weight: number }[] = [];
  for (let i = 0; i < (Number.isFinite(count) ? count : 0); i++) {
    rawLambs.push({
      tag: str(fd, `tag_${i}`),
      sex: str(fd, `sex_${i}`),
      weight: parseFloat(str(fd, `weight_${i}`)),
    });
  }
  const parsed = validateLambingInput({ birth: str(fd, "birth"), lambs: rawLambs });
  if (!parsed.ok) return { error: parsed.error };
  const { birth, lambs } = parsed.data;

  const { data: mating, error: mErr } = await supabase
    .from("matings")
    .select("id, ewe_id, ram_id, status")
    .eq("id", matingId)
    .single();
  if (mErr) return dbFail("recordLambing.mating", mErr);
  if (!mating) return { error: "breeding.errPair" };
  const typedMating = mating as Pick<Mating, "id" | "ewe_id" | "ram_id" | "status">;

  const { data: ewe, error: eErr } = await supabase
    .from("sheep")
    .select("id, breed, color")
    .eq("id", typedMating.ewe_id)
    .single();
  if (eErr) return dbFail("recordLambing.ewe", eErr);
  if (!ewe) return { error: "breeding.errPair" };

  // Case-insensitive tag uniqueness against the whole flock. One parameterized
  // ilike per lamb (litters are tiny) — no hand-built filter string to inject into.
  for (const l of lambs) {
    const { data: dup, error: dErr } = await supabase
      .from("sheep")
      .select("id")
      .ilike("tag", escapeLike(l.tag))
      .limit(1);
    if (dErr) return dbFail("recordLambing.dupCheck", dErr);
    if ((dup ?? []).length > 0) return { error: "form.errTagInUse" };
  }

  const { data: inserted, error: insErr } = await supabase
    .from("sheep")
    .insert(
      lambs.map((l) => ({
        tag: l.tag,
        sex: l.sex,
        birth,
        breed: ewe.breed,
        color: ewe.color,
        weight: l.weight,
        mother_id: typedMating.ewe_id,
        father_id: typedMating.ram_id,
        health: "Healthy",
      }))
    )
    .select("id, tag");
  if (insErr) return dbFail("recordLambing.insert", insErr);

  await Promise.all(
    lambs.map((l) => {
      const row = inserted?.find((r) => r.tag === l.tag);
      if (!row) return;
      return notifyEvent({ type: "new_sheep", sheepId: row.id, tag: l.tag, sex: l.sex, breed: ewe.breed });
    })
  );

  const { error: sErr } = await supabase
    .from("matings")
    .update({ status: "Lambed" })
    .eq("id", matingId);
  if (sErr) return dbFail("recordLambing.markLambed", sErr);

  await resetEwePregnancy(typedMating.ewe_id);

  updateTag(FLOCK_TAG);
  redirect(`/sheep/${typedMating.ewe_id}`);
}
