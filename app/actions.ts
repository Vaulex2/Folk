"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { FLOCK_TAG } from "@/lib/flock";
import {
  addDays,
  GESTATION_DAYS,
  HEALTH_STATUSES,
  type HealthStatus,
  type Mating,
  type MatingStatus,
  type Sex,
  type SheepStatus,
} from "@/lib/sheep";

export interface FormState {
  error?: string;
  /** Set on success by actions whose form stays on the page (so it can refresh). */
  ok?: boolean;
}

function str(fd: FormData, k: string): string {
  return String(fd.get(k) ?? "").trim();
}

/** Create or update a sheep. Used by SheepForm for both /sheep/new and /edit. */
export async function saveSheep(_prev: FormState, fd: FormData): Promise<FormState> {
  const supabase = getSupabase();
  const idRaw = str(fd, "id");
  const id = idRaw ? parseInt(idRaw, 10) : null;

  const tag = str(fd, "tag");
  const sex = str(fd, "sex") as Sex;
  const birth = str(fd, "birth");
  const weightRaw = str(fd, "weight");
  const breed = str(fd, "breed");
  const color = str(fd, "color");
  const motherRaw = str(fd, "mother_id");
  const fatherRaw = str(fd, "father_id");
  const health = str(fd, "health") as HealthStatus;
  const vaccinationDate = str(fd, "vaccination_date");
  const dueDate = str(fd, "due_date");

  if (!tag) return { error: "form.errTagRequired" };
  if (!birth) return { error: "form.errDob" };
  if (sex !== "Ewe" && sex !== "Ram") return { error: "form.errSex" };
  if (!HEALTH_STATUSES.includes(health)) return { error: "form.errHealth" };

  // tag uniqueness (case-insensitive), excluding self on edit
  const dup = await supabase.from("sheep").select("id").ilike("tag", tag);
  if (dup.error) return { error: dup.error.message };
  if ((dup.data ?? []).some((r) => r.id !== id)) {
    return { error: "form.errTagInUse" };
  }

  const w = parseInt(weightRaw, 10);
  const record = {
    tag,
    sex,
    birth,
    breed: breed || null,
    color: color || null,
    weight: Number.isNaN(w) ? (sex === "Ram" ? 90 : 68) : w,
    mother_id: motherRaw ? parseInt(motherRaw, 10) : null,
    father_id: fatherRaw ? parseInt(fatherRaw, 10) : null,
    health,
    vaccination_date: vaccinationDate || null,
    due_date: dueDate || null,
  };

  let savedId = id;
  if (id == null) {
    const { data, error } = await supabase.from("sheep").insert(record).select("id").single();
    if (error) return { error: error.message };
    savedId = data.id;
  } else {
    const { error } = await supabase.from("sheep").update(record).eq("id", id);
    if (error) return { error: error.message };
  }

  updateTag(FLOCK_TAG);
  redirect(`/sheep/${savedId}`);
}

/** Soft-remove: mark Sold or Died (keeps pedigree links intact) or restore to Active. */
export async function setSheepStatus(id: number, status: SheepStatus) {
  const supabase = getSupabase();
  const { error } = await supabase.from("sheep").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
  updateTag(FLOCK_TAG);
}

/** Append a dated health note; if it carries a status, update the sheep's current health. */
export async function addHealthNote(_prev: FormState, fd: FormData): Promise<FormState> {
  const supabase = getSupabase();
  const sheepId = parseInt(str(fd, "sheep_id"), 10);
  const date = str(fd, "date");
  const statusRaw = str(fd, "status");
  const note = str(fd, "note");

  if (!Number.isFinite(sheepId)) return { error: "notes.errMissingSheep" };
  if (!date) return { error: "notes.errDate" };
  if (!note) return { error: "notes.errNote" };

  const status = HEALTH_STATUSES.includes(statusRaw as HealthStatus)
    ? (statusRaw as HealthStatus)
    : null;

  const { error } = await supabase
    .from("health_notes")
    .insert({ sheep_id: sheepId, date, status, note });
  if (error) return { error: error.message };

  if (status) {
    const { error: uErr } = await supabase.from("sheep").update({ health: status }).eq("id", sheepId);
    if (uErr) return { error: uErr.message };
  }

  updateTag(FLOCK_TAG);
  return {};
}

/** Store a (client-downscaled) photo in the sheep-photos bucket and save its URL. */
export async function uploadSheepPhoto(_prev: FormState, fd: FormData): Promise<FormState> {
  const supabase = getSupabase();
  const sheepId = parseInt(str(fd, "sheep_id"), 10);
  const file = fd.get("file");

  if (!Number.isFinite(sheepId)) return { error: "notes.errMissingSheep" };
  if (!(file instanceof File) || file.size === 0) return { error: "photo.errUpload" };

  const path = `${sheepId}.jpg`;
  const { error: upErr } = await supabase.storage
    .from("sheep-photos")
    .upload(path, file, { upsert: true, contentType: "image/jpeg" });
  if (upErr) return { error: upErr.message };

  // Stable path + upsert means CDN caches the old image; bust with a version param.
  const { data } = supabase.storage.from("sheep-photos").getPublicUrl(path);
  const { error: uErr } = await supabase
    .from("sheep")
    .update({ photo_url: `${data.publicUrl}?v=${Date.now()}` })
    .eq("id", sheepId);
  if (uErr) return { error: uErr.message };

  updateTag(FLOCK_TAG);
  return { ok: true };
}

/** Append a dated weight record; the sheep's current weight follows the newest-dated record. */
export async function addWeightRecord(_prev: FormState, fd: FormData): Promise<FormState> {
  const supabase = getSupabase();
  const sheepId = parseInt(str(fd, "sheep_id"), 10);
  const date = str(fd, "date");
  const weightKg = parseFloat(str(fd, "weight_kg"));

  if (!Number.isFinite(sheepId)) return { error: "notes.errMissingSheep" };
  if (!date) return { error: "notes.errDate" };
  if (!Number.isFinite(weightKg) || weightKg <= 0) return { error: "weights.errWeight" };

  const { error } = await supabase
    .from("weight_records")
    .insert({ sheep_id: sheepId, date, weight_kg: weightKg });
  if (error) return { error: error.message };

  // Sync sheep.weight to the newest-dated record (a backdated entry must not win).
  const { data: latest, error: lErr } = await supabase
    .from("weight_records")
    .select("weight_kg")
    .eq("sheep_id", sheepId)
    .order("date", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)
    .single();
  if (lErr) return { error: lErr.message };

  const { error: uErr } = await supabase
    .from("sheep")
    .update({ weight: Math.round(latest.weight_kg) })
    .eq("id", sheepId);
  if (uErr) return { error: uErr.message };

  updateTag(FLOCK_TAG);
  return { ok: true };
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
  const supabase = getSupabase();
  const eweId = parseInt(str(fd, "ewe_id"), 10);
  const ramId = parseInt(str(fd, "ram_id"), 10);
  const matingDate = str(fd, "date");

  if (!Number.isFinite(eweId) || !Number.isFinite(ramId)) return { error: "breeding.errPair" };
  if (!matingDate) return { error: "breeding.errDate" };

  const { data: pair, error: pairErr } = await supabase
    .from("sheep")
    .select("id, sex, status")
    .in("id", [eweId, ramId]);
  if (pairErr) return { error: pairErr.message };
  const ewe = (pair ?? []).find((s) => s.id === eweId);
  const ram = (pair ?? []).find((s) => s.id === ramId);
  if (!ewe || !ram || ewe.sex !== "Ewe" || ram.sex !== "Ram") return { error: "breeding.errPair" };
  if (ewe.status !== "Active" || ram.status !== "Active") return { error: "breeding.errPair" };

  const { data: open, error: openErr } = await supabase
    .from("matings")
    .select("id")
    .eq("ewe_id", eweId)
    .in("status", ["Planned", "Confirmed"]);
  if (openErr) return { error: openErr.message };
  if ((open ?? []).length > 0) return { error: "breeding.errOpenMating" };

  const { error } = await supabase.from("matings").insert({
    ewe_id: eweId,
    ram_id: ramId,
    mating_date: matingDate,
    due_date: addDays(matingDate, GESTATION_DAYS),
    status: "Planned",
  });
  if (error) return { error: error.message };

  updateTag(FLOCK_TAG);
  return { ok: true };
}

/** Advance a mating: Confirmed marks the ewe pregnant, Failed releases her. */
export async function setMatingStatus(id: number, status: MatingStatus) {
  const supabase = getSupabase();
  const { data: mating, error: mErr } = await supabase
    .from("matings")
    .select("id, ewe_id, ram_id, mating_date, due_date, status")
    .eq("id", id)
    .single();
  if (mErr || !mating) throw new Error(mErr?.message ?? "Mating not found");

  const { error } = await supabase.from("matings").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);

  if (status === "Confirmed") {
    const { error: uErr } = await supabase
      .from("sheep")
      .update({ health: "Pregnant", due_date: mating.due_date })
      .eq("id", mating.ewe_id);
    if (uErr) throw new Error(uErr.message);
  } else if (status === "Failed") {
    await resetEwePregnancy(mating.ewe_id);
  }

  updateTag(FLOCK_TAG);
}

/** Register the lambs born from a mating: creates sheep rows with dam & sire linked. */
export async function recordLambing(_prev: FormState, fd: FormData): Promise<FormState> {
  const supabase = getSupabase();
  const matingId = parseInt(str(fd, "mating_id"), 10);
  const birth = str(fd, "birth");
  const count = parseInt(str(fd, "count"), 10);

  if (!Number.isFinite(matingId)) return { error: "breeding.errPair" };
  if (!birth) return { error: "form.errDob" };

  const lambs: { tag: string; sex: Sex; weight: number }[] = [];
  for (let i = 0; i < (Number.isFinite(count) ? count : 0); i++) {
    const tag = str(fd, `tag_${i}`);
    const sex = str(fd, `sex_${i}`) as Sex;
    const w = parseFloat(str(fd, `weight_${i}`));
    if (!tag) return { error: "form.errTagRequired" };
    if (sex !== "Ewe" && sex !== "Ram") return { error: "form.errSex" };
    lambs.push({ tag, sex, weight: Number.isFinite(w) && w > 0 ? Math.round(w) : 4 });
  }
  if (lambs.length === 0) return { error: "lambing.errNoLambs" };

  const lowered = lambs.map((l) => l.tag.toLowerCase());
  if (new Set(lowered).size !== lambs.length) return { error: "form.errTagInUse" };

  const { data: mating, error: mErr } = await supabase
    .from("matings")
    .select("id, ewe_id, ram_id, status")
    .eq("id", matingId)
    .single();
  if (mErr || !mating) return { error: mErr?.message ?? "breeding.errPair" };
  const typedMating = mating as Pick<Mating, "id" | "ewe_id" | "ram_id" | "status">;

  const { data: ewe, error: eErr } = await supabase
    .from("sheep")
    .select("id, breed, color")
    .eq("id", typedMating.ewe_id)
    .single();
  if (eErr || !ewe) return { error: eErr?.message ?? "breeding.errPair" };

  // Case-insensitive tag uniqueness against the whole flock in one query.
  const orFilter = lambs.map((l) => `tag.ilike.${l.tag.replace(/[,()]/g, "")}`).join(",");
  const { data: dup, error: dErr } = await supabase.from("sheep").select("id").or(orFilter);
  if (dErr) return { error: dErr.message };
  if ((dup ?? []).length > 0) return { error: "form.errTagInUse" };

  const { error: insErr } = await supabase.from("sheep").insert(
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
  );
  if (insErr) return { error: insErr.message };

  const { error: sErr } = await supabase
    .from("matings")
    .update({ status: "Lambed" })
    .eq("id", matingId);
  if (sErr) return { error: sErr.message };

  await resetEwePregnancy(typedMating.ewe_id);

  updateTag(FLOCK_TAG);
  redirect(`/sheep/${typedMating.ewe_id}`);
}
