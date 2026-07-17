/**
 * Seed the Supabase DB with a demo flock (~80 head), ported from the Claude Design
 * Flock.dc.html buildFlock() generator. Idempotent — clears both tables first.
 *
 * Run:  npm run seed   (needs .env.local with NEXT_PUBLIC_SUPABASE_URL and
 *                       SUPABASE_SECRET_KEY — RLS is authenticated-only, so
 *                       the anon/publishable key cannot seed)
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });
config({ path: ".env" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SECRET_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local");
  process.exit(1);
}
const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

const BREEDS = ["Suffolk", "Merino", "Dorset", "Romney", "Texel", "Border Leicester"];
const COLORS = ["White", "Black face", "Grey", "Speckled", "Brown"];
const TODAY = new Date(2026, 6, 14); // matches the design's fixed reference date

type Gen = {
  localId: number;
  tag: string;
  birthYear: number;
  birth: string;
  sex: "Ewe" | "Ram";
  breed: string;
  color: string;
  motherLocal: number | null;
  fatherLocal: number | null;
  weight: number;
  health: string;
  dueDate: string | null;
  vaccinationDate: string | null;
};

function rng(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
const ageYears = (birth: string) => (TODAY.getTime() - new Date(birth).getTime()) / (365.25 * 86400000);

function buildFlock(): Gen[] {
  const rand = rng(20260714);
  const pick = <T>(a: T[]): T => a[Math.floor(rand() * a.length)];
  const pad = (n: number) => String(n).padStart(2, "0");
  const sheep: Gen[] = [];
  let id = 0;
  const add = (o: Partial<Gen> & { birthYear: number; birth: string; sex: "Ewe" | "Ram"; breed: string; color: string; motherLocal: number | null; fatherLocal: number | null }) => {
    id++;
    const g: Gen = {
      localId: id,
      tag: String(o.birthYear).slice(2) + "-" + String(id).padStart(3, "0"),
      birthYear: o.birthYear,
      birth: o.birth,
      sex: o.sex,
      breed: o.breed,
      color: o.color,
      motherLocal: o.motherLocal,
      fatherLocal: o.fatherLocal,
      weight: 0,
      health: "Healthy",
      dueDate: null,
      vaccinationDate: null,
    };
    sheep.push(g);
    return g;
  };
  const born = (y: number, lamb: boolean) => {
    const m = lamb ? 3 + Math.floor(rand() * 3) : 1 + Math.floor(rand() * 12);
    const d = 1 + Math.floor(rand() * 27);
    return y + "-" + pad(m) + "-" + pad(d);
  };

  for (let i = 0; i < 8; i++)
    add({ birthYear: 2019, birth: born(2019, false), sex: "Ewe", breed: pick(BREEDS), color: pick(COLORS), motherLocal: null, fatherLocal: null });
  for (let i = 0; i < 3; i++)
    add({ birthYear: 2019, birth: born(2019, false), sex: "Ram", breed: pick(BREEDS), color: pick(COLORS), motherLocal: null, fatherLocal: null });

  const target = 80;
  for (let y = 2020; y <= 2026 && sheep.length < target; y++) {
    const ewes = sheep.filter((s) => s.sex === "Ewe" && y - s.birthYear >= 1);
    const rams = sheep.filter((s) => s.sex === "Ram" && y - s.birthYear >= 1);
    if (!ewes.length || !rams.length) continue;
    const n = y === 2026 ? 99 : 11;
    const usedMoms: Record<number, boolean> = {};
    for (let k = 0; k < n && sheep.length < target; k++) {
      let mom = pick(ewes), guard = 0;
      while (usedMoms[mom.localId] && guard++ < 6) mom = pick(ewes);
      usedMoms[mom.localId] = true;
      const dad = pick(rams);
      const sex: "Ewe" | "Ram" = rand() < 0.5 ? "Ewe" : "Ram";
      const breed = rand() < 0.6 ? mom.breed : rand() < 0.5 ? dad.breed : pick(BREEDS);
      add({ birthYear: y, birth: born(y, true), sex, breed, color: pick(COLORS), motherLocal: mom.localId, fatherLocal: dad.localId });
    }
  }

  const addDays = (base: Date, days: number) => {
    const d = new Date(base);
    d.setDate(d.getDate() + days);
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  };
  for (const s of sheep) {
    const age = ageYears(s.birth);
    let w: number;
    if (age < 0.5) w = Math.round(7 + age * 62);
    else if (age < 1) w = Math.round(38 + (age - 0.5) * 40);
    else w = s.sex === "Ram" ? Math.round(86 + rand() * 20) : Math.round(64 + rand() * 16);
    s.weight = w;
    const r = rand();
    if (s.sex === "Ewe" && age > 1.3 && r < 0.14) {
      s.health = "Pregnant";
      s.dueDate = addDays(TODAY, 25 + Math.floor(rand() * 105));
    } else if (r < 0.05) s.health = "Under treatment";
    else if (r < 0.11) s.health = "Needs attention";
    else if (r < 0.22) {
      s.health = "Vaccination due";
      s.vaccinationDate = addDays(TODAY, 3 + Math.floor(rand() * 42));
    } else s.health = "Healthy";
  }
  return sheep;
}

// A couple of history notes for non-healthy animals so the detail panel isn't empty.
function noteFor(health: string): string | null {
  switch (health) {
    case "Under treatment": return "Started course of antibiotics; recheck in 5 days.";
    case "Needs attention": return "Lame on off-hind — flagged for foot inspection.";
    case "Vaccination due": return "Clostridial booster scheduled.";
    case "Pregnant": return "Confirmed in-lamb at scanning.";
    default: return null;
  }
}

async function withRetry<T>(label: string, fn: () => Promise<T>, tries = 4): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      console.warn(`  ${label}: attempt ${i + 1} failed (${(e as Error).message}); retrying…`);
      await new Promise((r) => setTimeout(r, 500 * (i + 1)));
    }
  }
  throw lastErr;
}

async function main() {
  console.log("Clearing existing rows…");
  await withRetry("clear notes", async () => {
    const { error } = await supabase.from("health_notes").delete().gte("id", 0);
    if (error) throw new Error(error.message);
  });
  await withRetry("clear sheep", async () => {
    const { error } = await supabase.from("sheep").delete().gte("id", 0);
    if (error) throw new Error(error.message);
  });

  const flock = buildFlock();
  console.log(`Generated ${flock.length} sheep. Inserting by birth year…`);

  const localToTag = new Map<number, string>(flock.map((g) => [g.localId, g.tag]));
  const tagToId = new Map<string, number>();

  // Insert year by year. A lamb's parents are always adults from an earlier year,
  // so their DB ids are already known by the time we insert the lamb.
  const years = [...new Set(flock.map((g) => g.birthYear))].sort((a, b) => a - b);
  for (const y of years) {
    const group = flock.filter((g) => g.birthYear === y);
    const resolve = (local: number | null) =>
      local != null ? tagToId.get(localToTag.get(local)!) ?? null : null;
    const rows = group.map((g) => ({
      tag: g.tag,
      sex: g.sex,
      birth: g.birth,
      breed: g.breed,
      color: g.color,
      weight: g.weight,
      mother_id: resolve(g.motherLocal),
      father_id: resolve(g.fatherLocal),
      health: g.health,
      due_date: g.dueDate,
      vaccination_date: g.vaccinationDate,
      status: "Active",
    }));
    const data = await withRetry(`insert ${y}`, async () => {
      const res = await supabase.from("sheep").insert(rows).select("id, tag");
      if (res.error) throw new Error(res.error.message);
      return res.data!;
    });
    for (const r of data) tagToId.set(r.tag, r.id);
    console.log(`  ${y}: inserted ${data.length} (flock now ${tagToId.size})`);
  }

  const notes = flock
    .map((g) => {
      const note = noteFor(g.health);
      if (!note) return null;
      return { sheep_id: tagToId.get(g.tag)!, date: g.dueDate ?? g.vaccinationDate ?? g.birth, status: g.health, note };
    })
    .filter((n): n is NonNullable<typeof n> => n !== null);

  if (notes.length) {
    await withRetry("insert notes", async () => {
      const { error } = await supabase.from("health_notes").insert(notes);
      if (error) throw new Error(error.message);
    });
  }

  console.log(`Done. ${tagToId.size} sheep, ${notes.length} health notes.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
