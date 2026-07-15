// Framework-free domain types and display helpers for the flock.
// Ported from the Claude Design Flock.dc.html DCLogic component.
// Display strings are localized via lib/i18n (locale defaults to English).

import type { Locale } from "./i18n/config";
import { getMessages } from "./i18n/messages";

export type Sex = "Ewe" | "Ram";
export type SheepStatus = "Active" | "Sold" | "Died";
export type HealthStatus =
  | "Healthy"
  | "Needs attention"
  | "Under treatment"
  | "Pregnant"
  | "Vaccination due";

export interface Sheep {
  id: number;
  tag: string;
  sex: Sex;
  birth: string; // ISO date (yyyy-mm-dd)
  breed: string;
  color: string;
  weight: number; // kg
  mother_id: number | null;
  father_id: number | null;
  health: HealthStatus;
  due_date: string | null;
  vaccination_date: string | null;
  status: SheepStatus;
  photo_url: string | null;
}

export interface HealthNote {
  id: number;
  sheep_id: number;
  date: string;
  status: HealthStatus | null;
  note: string;
}

export interface WeightRecord {
  id: number;
  sheep_id: number;
  date: string;
  weight_kg: number;
}

export type MatingStatus = "Planned" | "Confirmed" | "Lambed" | "Failed";

export interface Mating {
  id: number;
  ewe_id: number;
  ram_id: number;
  mating_date: string; // ISO date
  due_date: string; // ISO date, mating_date + GESTATION_DAYS
  status: MatingStatus;
}

/** Average sheep gestation. */
export const GESTATION_DAYS = 152;

export function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** A ewe can only carry one pregnancy at a time: her first Planned/Confirmed mating. */
export function getOpenMatingForEwe(matings: Mating[], eweId: number): Mating | undefined {
  return matings.find(
    (m) => m.ewe_id === eweId && (m.status === "Planned" || m.status === "Confirmed")
  );
}

export const BREEDS = ["Suffolk", "Merino", "Dorset", "Romney", "Texel", "Border Leicester"];
export const COLORS = ["White", "Black face", "Grey", "Speckled", "Brown"];

export const HEALTH_STATUSES: HealthStatus[] = [
  "Healthy",
  "Needs attention",
  "Under treatment",
  "Pregnant",
  "Vaccination due",
];

// status -> pill colors (CSS custom-property references from the Organic ramps)
export const HEALTH: Record<HealthStatus, { bg: string; fg: string }> = {
  Healthy: { bg: "var(--color-accent-2-100)", fg: "var(--color-accent-2-800)" },
  "Needs attention": { bg: "var(--color-accent-200)", fg: "var(--color-accent-800)" },
  "Under treatment": { bg: "var(--color-accent-400)", fg: "var(--color-accent-900)" },
  Pregnant: { bg: "var(--color-accent-2-300)", fg: "var(--color-accent-2-900)" },
  "Vaccination due": { bg: "var(--color-neutral-300)", fg: "var(--color-neutral-800)" },
};

export function healthColors(h: string) {
  return HEALTH[h as HealthStatus] ?? HEALTH.Healthy;
}

export function ageYears(birth: string, today: Date = new Date()): number {
  return (today.getTime() - new Date(birth).getTime()) / (365.25 * 86400000);
}

// Russian year noun agreement: 1 год, 2–4 года, 5+ лет.
function ruYearWord(n: number): string {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return "год";
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return "года";
  return "лет";
}

export function ageLabel(age: number, locale: Locale = "en"): string {
  const m = getMessages(locale);
  if (age < 1) return Math.max(1, Math.round(age * 12)) + " " + m.age.mo;
  const y = Math.floor(age);
  if (locale === "ru") return `${y} ${ruYearWord(y)}`;
  if (locale === "uz") return `${y} ${m.age.yr}`;
  return `${y} ${y === 1 ? m.age.yr : m.age.yrs}`;
}

export function fmtDate(iso: string, locale: Locale = "en"): string {
  const d = new Date(iso);
  const months = getMessages(locale).months;
  return d.getDate() + " " + months[d.getMonth()] + " " + d.getFullYear();
}

export function isLamb(s: Sheep, today: Date = new Date()): boolean {
  return ageYears(s.birth, today) < 1;
}

export function sexLabel(sex: Sex, locale: Locale = "en"): string {
  return getMessages(locale).sex[sex];
}

export function sexWithLamb(s: Sheep, today: Date = new Date(), locale: Locale = "en"): string {
  const m = getMessages(locale);
  if (!isLamb(s, today)) return m.sex[s.sex];
  return s.sex === "Ewe" ? m.sex.lambEwe : m.sex.lambRam;
}

/** A flat, display-ready projection of a sheep. All labels already localized. */
export interface SheepView {
  id: number;
  tag: string;
  sex: Sex;
  sexLabel: string;
  breed: string;
  color: string;
  colorLabel: string;
  weight: string;
  birthLabel: string;
  ageLabel: string;
  isLamb: boolean;
  sexWithLamb: string;
  metaShort: string;
  health: HealthStatus;
  healthLabel: string;
  status: SheepStatus;
  statusLabel: string;
  hsBg: string;
  hsFg: string;
  photoUrl: string | null;
}

export function view(s: Sheep, today: Date = new Date(), locale: Locale = "en"): SheepView {
  const m = getMessages(locale);
  const age = ageYears(s.birth, today);
  const lamb = age < 1;
  const hs = healthColors(s.health);
  const swl = lamb ? (s.sex === "Ewe" ? m.sex.lambEwe : m.sex.lambRam) : m.sex[s.sex];
  const al = ageLabel(age, locale);
  return {
    id: s.id,
    tag: s.tag,
    sex: s.sex,
    sexLabel: m.sex[s.sex],
    breed: s.breed,
    color: s.color,
    colorLabel: (m.colors as Record<string, string>)[s.color] ?? s.color,
    weight: s.weight + " " + m.units.kg,
    birthLabel: fmtDate(s.birth, locale),
    ageLabel: al,
    isLamb: lamb,
    sexWithLamb: swl,
    metaShort: swl + " · " + al,
    health: s.health,
    healthLabel: (m.health as Record<string, string>)[s.health] ?? s.health,
    status: s.status,
    statusLabel: (m.status as Record<string, string>)[s.status] ?? s.status,
    hsBg: hs.bg,
    hsFg: hs.fg,
    photoUrl: s.photo_url,
  };
}

export function findSheep(flock: Sheep[], id: number | null): Sheep | undefined {
  if (id == null) return undefined;
  return flock.find((s) => s.id === id);
}

/** Children are derived from parent references, never stored. */
export function offspringOf(flock: Sheep[], id: number): Sheep[] {
  return flock.filter((s) => s.mother_id === id || s.father_id === id);
}

/**
 * Positional ancestor generations for a pedigree chart.
 * Level g has 2^(g+1) slots: [father, mother], [ff, fm, mf, mm], …
 * Slot 2i/2i+1 of level g+1 are the father/mother of slot i in level g;
 * unknown ancestors (and children of unknowns) are null.
 */
export function ancestorLevels(flock: Sheep[], focal: Sheep, depth = 3): (Sheep | null)[][] {
  const levels: (Sheep | null)[][] = [];
  let prev: (Sheep | null)[] = [focal];
  for (let g = 0; g < depth; g++) {
    const next: (Sheep | null)[] = [];
    for (const s of prev) {
      next.push((s?.father_id != null && findSheep(flock, s.father_id)) || null);
      next.push((s?.mother_id != null && findSheep(flock, s.mother_id)) || null);
    }
    levels.push(next);
    prev = next;
  }
  return levels;
}

export function byTag(a: { tag: string }, b: { tag: string }) {
  return a.tag.localeCompare(b.tag);
}
