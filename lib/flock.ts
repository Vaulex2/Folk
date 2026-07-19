import "server-only";
import { unstable_cache } from "next/cache";
import { getSupabase } from "./supabase";
import { requireUser } from "./auth/server";
import type { Sheep, HealthNote, Mating, Task, WeightRecord } from "./sheep";
import type { Transaction } from "./finance";

export const FLOCK_TAG = "flock";

const SHEEP_COLS =
  "id, tag, sex, birth, breed, color, weight, mother_id, father_id, health, due_date, vaccination_date, status, photo_url, purchase_price, purchase_date, sale_price, sale_date, death_date";

// One cached read of the whole flock, shared by every screen. Invalidated by
// revalidateTag(FLOCK_TAG) whenever a sheep or note is written (see app/actions.ts).
// The short revalidate window is a safety net for out-of-band changes (e.g. the seed
// script or the Supabase dashboard).
const loadAllSheep = unstable_cache(
  async (): Promise<Sheep[]> => {
    const supabase = getSupabase();
    const { data, error } = await supabase.from("sheep").select(SHEEP_COLS).order("id");
    if (error) throw new Error(`Failed to load flock: ${error.message}`);
    return (data ?? []) as Sheep[];
  },
  ["flock:all-sheep"],
  { tags: [FLOCK_TAG], revalidate: 60 }
);

const loadHealthNotes = unstable_cache(
  async (sheepId: number): Promise<HealthNote[]> => {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("health_notes")
      .select("id, sheep_id, date, status, note")
      .eq("sheep_id", sheepId)
      .order("date", { ascending: false })
      .order("id", { ascending: false });
    if (error) throw new Error(`Failed to load health notes: ${error.message}`);
    return (data ?? []) as HealthNote[];
  },
  ["flock:health-notes"],
  { tags: [FLOCK_TAG], revalidate: 60 }
);

const loadWeightRecords = unstable_cache(
  async (sheepId: number): Promise<WeightRecord[]> => {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("weight_records")
      .select("id, sheep_id, date, weight_kg")
      .eq("sheep_id", sheepId)
      .order("date", { ascending: true })
      .order("id", { ascending: true });
    if (error) throw new Error(`Failed to load weight records: ${error.message}`);
    return (data ?? []) as WeightRecord[];
  },
  ["flock:weight-records"],
  { tags: [FLOCK_TAG], revalidate: 60 }
);

const loadTasks = unstable_cache(
  async (): Promise<Task[]> => {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("tasks")
      .select("id, title, due_date, sheep_id, done")
      .order("done", { ascending: true })
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("id", { ascending: false });
    if (error) throw new Error(`Failed to load tasks: ${error.message}`);
    return (data ?? []) as Task[];
  },
  ["flock:tasks"],
  { tags: [FLOCK_TAG], revalidate: 60 }
);

const loadTransactions = unstable_cache(
  async (): Promise<Transaction[]> => {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("transactions")
      .select("id, category, amount, date, note, sheep_id")
      .order("date", { ascending: false })
      .order("id", { ascending: false });
    if (error) throw new Error(`Failed to load transactions: ${error.message}`);
    // numeric can arrive as a string from PostgREST — coerce or sums concatenate
    return (data ?? []).map((r) => ({ ...r, amount: Number(r.amount) })) as Transaction[];
  },
  ["flock:transactions"],
  { tags: [FLOCK_TAG], revalidate: 60 }
);

const loadMatings = unstable_cache(
  async (): Promise<Mating[]> => {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("matings")
      .select("id, ewe_id, ram_id, mating_date, due_date, status")
      .order("mating_date", { ascending: false })
      .order("id", { ascending: false });
    if (error) throw new Error(`Failed to load matings: ${error.message}`);
    return (data ?? []) as Mating[];
  },
  ["flock:matings"],
  { tags: [FLOCK_TAG], revalidate: 60 }
);

// Every wrapper below calls requireUser() BEFORE entering the unstable_cache
// scope (cookies can't be read inside it). The data client bypasses RLS, so
// this is the access check for every page — all reads flow through here.

/** All sheep, active and inactive. Pedigree links need inactive animals too. */
export async function getAllSheep(): Promise<Sheep[]> {
  await requireUser();
  return loadAllSheep();
}

/** Only living/present animals — derived in memory from the single cached read. */
export async function getActiveSheep(): Promise<Sheep[]> {
  await requireUser();
  return (await loadAllSheep()).filter((s) => s.status === "Active");
}

/** A single sheep — found in the cached flock, no extra round-trip. */
export async function getSheep(id: number): Promise<Sheep | null> {
  await requireUser();
  return (await loadAllSheep()).find((s) => s.id === id) ?? null;
}

export async function getHealthNotes(sheepId: number): Promise<HealthNote[]> {
  await requireUser();
  return loadHealthNotes(sheepId);
}

/** All matings, newest first. */
export async function getMatings(): Promise<Mating[]> {
  await requireUser();
  return loadMatings();
}

/** One sheep's weight history, oldest first (chart-ready). */
export async function getWeightRecords(sheepId: number): Promise<WeightRecord[]> {
  await requireUser();
  return loadWeightRecords(sheepId);
}

/** All tasks: open first (by due date), then completed. */
export async function getTasks(): Promise<Task[]> {
  await requireUser();
  return loadTasks();
}

/** All ledger transactions, newest first. */
export async function getTransactions(): Promise<Transaction[]> {
  await requireUser();
  return loadTransactions();
}
