// Thin data-access layer. Every Supabase read/write for domain data goes
// through here — screens never call `supabase.from(...)` directly. This is the
// seam the app plan (§6) calls for: a later offline read-cache / write-queue
// can be inserted here without touching a single screen.

import { File } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { Image } from "react-native";
import { supabase } from "./supabase";
import { config } from "../config";
import type {
  HealthNote,
  Sheep,
  Task,
  Transaction,
  WeightRecord,
} from "../core";
import type {
  BulkAddInput,
  HealthNoteInput,
  SheepRecord,
  TaskInput,
  TransactionInput,
  WeightRecordInput,
} from "../core";
import { addDays } from "../core";

const SHEEP_COLUMNS =
  "id,tag,sex,birth,breed,color,weight,mother_id,father_id,health,due_date,vaccination_date,status,photo_url,purchase_price,purchase_date,sale_price,sale_date,death_date";

function unwrap<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(error.message);
  return data as T;
}

// Sheep rows can miss breed/color (nullable in DB) but the domain type wants
// strings; normalize once on the way in.
function normalizeSheep(row: Record<string, unknown>): Sheep {
  return {
    ...(row as unknown as Sheep),
    breed: (row.breed as string | null) ?? "",
    color: (row.color as string | null) ?? "",
    weight: (row.weight as number | null) ?? 0,
  };
}

// ---- Sheep ----------------------------------------------------------------

export async function fetchFlock(): Promise<Sheep[]> {
  const res = await supabase.from("sheep").select(SHEEP_COLUMNS).order("tag");
  return unwrap(res).map(normalizeSheep);
}

export async function fetchSheep(id: number): Promise<Sheep | null> {
  const res = await supabase.from("sheep").select(SHEEP_COLUMNS).eq("id", id).maybeSingle();
  const row = unwrap(res);
  return row ? normalizeSheep(row) : null;
}

export async function tagExists(tag: string, excludeId?: number): Promise<boolean> {
  let q = supabase.from("sheep").select("id").eq("tag", tag);
  if (excludeId != null) q = q.neq("id", excludeId);
  const res = await q.limit(1);
  return unwrap(res).length > 0;
}

export async function insertSheep(rec: SheepRecord): Promise<Sheep> {
  const res = await supabase.from("sheep").insert(rec).select(SHEEP_COLUMNS).single();
  return normalizeSheep(unwrap(res));
}

export async function updateSheep(id: number, rec: Partial<SheepRecord>): Promise<Sheep> {
  const res = await supabase.from("sheep").update(rec).eq("id", id).select(SHEEP_COLUMNS).single();
  return normalizeSheep(unwrap(res));
}

export async function setSheepPhoto(id: number, photoUrl: string): Promise<void> {
  const res = await supabase.from("sheep").update({ photo_url: photoUrl }).eq("id", id);
  unwrap(res);
}

export async function markSold(id: number, price: number | null, date: string): Promise<void> {
  const res = await supabase
    .from("sheep")
    .update({ status: "Sold", sale_price: price, sale_date: date, death_date: null })
    .eq("id", id);
  unwrap(res);
}

export async function markDied(id: number, date: string): Promise<void> {
  const res = await supabase
    .from("sheep")
    .update({ status: "Died", death_date: date })
    .eq("id", id);
  unwrap(res);
}

export async function restoreSheep(id: number): Promise<void> {
  const res = await supabase
    .from("sheep")
    .update({ status: "Active", sale_price: null, sale_date: null, death_date: null })
    .eq("id", id);
  unwrap(res);
}

export async function bulkInsertSheep(input: BulkAddInput): Promise<number> {
  const today = new Date();
  const birthIso = addDays(today.toISOString().slice(0, 10), -Math.round(input.age_years * 365.25));
  const rows = Array.from({ length: input.count }, (_, i) => ({
    tag: String(input.start_num + i),
    sex: input.sex,
    birth: birthIso,
    breed: input.breed,
    color: input.color,
    weight: input.weight,
    health: input.health,
    due_date: input.due_date,
    purchase_price: input.purchase_price,
    purchase_date: input.purchase_date,
  }));
  const res = await supabase.from("sheep").insert(rows).select("id");
  return unwrap(res).length;
}

// ---- Health notes ---------------------------------------------------------

export async function fetchHealthNotes(sheepId: number): Promise<HealthNote[]> {
  const res = await supabase
    .from("health_notes")
    .select("id,sheep_id,date,status,note")
    .eq("sheep_id", sheepId)
    .order("date", { ascending: false });
  return unwrap(res);
}

export async function addHealthNote(input: HealthNoteInput): Promise<void> {
  const insert = await supabase.from("health_notes").insert(input);
  unwrap(insert);
  // A note that sets a status also updates the sheep's current health, matching
  // the web app's server action.
  if (input.status) {
    const upd = await supabase.from("sheep").update({ health: input.status }).eq("id", input.sheep_id);
    unwrap(upd);
  }
}

// ---- Weight records -------------------------------------------------------

export async function fetchWeights(sheepId: number): Promise<WeightRecord[]> {
  const res = await supabase
    .from("weight_records")
    .select("id,sheep_id,date,weight_kg")
    .eq("sheep_id", sheepId)
    .order("date", { ascending: true });
  return unwrap(res).map((w) => ({ ...w, weight_kg: Number(w.weight_kg) }));
}

export async function addWeight(input: WeightRecordInput): Promise<void> {
  const res = await supabase.from("weight_records").insert(input);
  unwrap(res);
}

// ---- Tasks ----------------------------------------------------------------

export async function fetchTasks(): Promise<Task[]> {
  const res = await supabase
    .from("tasks")
    .select("id,title,due_date,sheep_id,done")
    .order("due_date", { ascending: true, nullsFirst: false });
  return unwrap(res);
}

export async function addTask(input: TaskInput): Promise<void> {
  const res = await supabase.from("tasks").insert(input);
  unwrap(res);
}

export async function setTaskDone(id: number, done: boolean): Promise<void> {
  const res = await supabase.from("tasks").update({ done }).eq("id", id);
  unwrap(res);
}

export async function deleteTask(id: number): Promise<void> {
  const res = await supabase.from("tasks").delete().eq("id", id);
  unwrap(res);
}

// ---- Transactions ---------------------------------------------------------

export async function fetchTransactions(): Promise<Transaction[]> {
  const res = await supabase
    .from("transactions")
    .select("id,category,amount,date,note,sheep_id")
    .order("date", { ascending: false });
  return unwrap(res).map((t) => ({ ...t, amount: Number(t.amount) }));
}

export async function addTransaction(input: TransactionInput): Promise<void> {
  const res = await supabase.from("transactions").insert(input);
  unwrap(res);
}

export async function deleteTransaction(id: number): Promise<void> {
  const res = await supabase.from("transactions").delete().eq("id", id);
  unwrap(res);
}

// ---- Photo upload ---------------------------------------------------------

// Matches the web app's PhotoUploader.tsx so photos are sized consistently
// across platforms.
const PHOTO_MAX_EDGE = 800;
const PHOTO_QUALITY = 0.8;

function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject);
  });
}

// Camera-library photos can be several MB at full sensor resolution — quality
// compression alone (expo-image-picker's `quality` option) doesn't touch pixel
// dimensions. Resizing to the same max edge as the web app keeps uploads small
// on farm-grade mobile networks, which is most of what makes this feel slow.
async function downscale(uri: string): Promise<string> {
  const { width, height } = await getImageSize(uri);
  const scale = Math.min(1, PHOTO_MAX_EDGE / Math.max(width, height));
  const context = ImageManipulator.manipulate(uri).resize({
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  });
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: PHOTO_QUALITY });
  return saved.uri;
}

export async function uploadSheepPhoto(sheepId: number, uri: string): Promise<string> {
  const resizedUri = await downscale(uri);
  const path = `sheep-${sheepId}-${Date.now()}.jpg`;

  // Read the picked file via expo-file-system's native File API, which returns a
  // real ArrayBuffer straight from disk. This is far more reliable in React
  // Native than fetch(uri).arrayBuffer(), whose blob/arrayBuffer support over
  // file:// URIs is inconsistent across engines.
  const arrayBuffer = await new File(resizedUri).arrayBuffer();

  const { error } = await supabase.storage
    .from(config.photoBucket)
    .upload(path, arrayBuffer, { contentType: "image/jpeg", upsert: true });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from(config.photoBucket).getPublicUrl(path);
  return data.publicUrl;
}
