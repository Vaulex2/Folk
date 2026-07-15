// Pedigree genetics — Wright's kinship / inbreeding coefficients over the flock.
//
// kinship(a,b)  = probability two random alleles (one from each) are identical by descent.
// F(x)          = inbreeding coefficient of x = kinship(sire_x, dam_x).
// The predicted inbreeding of a hypothetical offspring of (sire, dam) equals
// kinship(sire, dam). The coefficient of relationship r ≈ 2 * kinship.
//
// Computed recursively with memoization. Flocks are small so this is cheap.

import type { Sheep } from "./sheep";

export type RelationKey =
  | "unrelated"
  | "fullSiblings"
  | "halfSiblings"
  | "parentOffspring"
  | "ancestorDescendant"
  | "cousinsCloser"
  | "distantly";

export interface KinshipResult {
  kinship: number; // phi(a,b)
  offspringInbreeding: number; // = kinship(a,b)
  relationship: number; // r ≈ 2*phi
  commonAncestors: { id: number; tag: string }[];
  verdict: "safe" | "caution" | "avoid";
  relationKey: RelationKey; // localized in the UI via lib/i18n relations.*
}

export class Pedigree {
  private byId = new Map<number, Sheep>();
  private born = new Map<number, number>(); // id -> birth time (ms), for ordering recursion
  private kinMemo = new Map<string, number>();
  private fMemo = new Map<number, number>();
  private ancMemo = new Map<number, Set<number>>();

  constructor(flock: Sheep[]) {
    for (const s of flock) {
      this.byId.set(s.id, s);
      this.born.set(s.id, new Date(s.birth).getTime());
    }
  }

  private parents(id: number | null): { sire: number | null; dam: number | null } {
    if (id == null) return { sire: null, dam: null };
    const s = this.byId.get(id);
    return { sire: s?.father_id ?? null, dam: s?.mother_id ?? null };
  }

  /** Inbreeding coefficient of x. */
  F(id: number | null): number {
    if (id == null) return 0;
    if (this.fMemo.has(id)) return this.fMemo.get(id)!;
    const { sire, dam } = this.parents(id);
    const f = sire != null && dam != null ? this.kinship(sire, dam) : 0;
    this.fMemo.set(id, f);
    return f;
  }

  /** Kinship coefficient phi(a,b). */
  kinship(a: number | null, b: number | null): number {
    if (a == null || b == null) return 0;
    if (a === b) return 0.5 * (1 + this.F(a));
    const key = a < b ? `${a}:${b}` : `${b}:${a}`;
    const cached = this.kinMemo.get(key);
    if (cached !== undefined) return cached;

    // Recurse on the parents of the younger (later-born) animal so we always
    // move up the pedigree and terminate.
    let young = a, old = b;
    if ((this.born.get(a) ?? 0) < (this.born.get(b) ?? 0)) {
      young = b; old = a;
    }
    const { sire, dam } = this.parents(young);
    const val = 0.5 * (this.kinship(sire, old) + this.kinship(dam, old));
    this.kinMemo.set(key, val);
    return val;
  }

  /** All ancestors of id (excluding id itself). */
  ancestors(id: number | null): Set<number> {
    if (id == null) return new Set();
    if (this.ancMemo.has(id)) return this.ancMemo.get(id)!;
    const out = new Set<number>();
    const { sire, dam } = this.parents(id);
    for (const p of [sire, dam]) {
      if (p != null) {
        out.add(p);
        for (const g of this.ancestors(p)) out.add(g);
      }
    }
    this.ancMemo.set(id, out);
    return out;
  }

  private tag(id: number): string {
    return this.byId.get(id)?.tag ?? String(id);
  }

  private relationKey(a: number, b: number, phi: number): RelationKey {
    if (phi === 0) return "unrelated";
    const aAnc = this.ancestors(a);
    const bAnc = this.ancestors(b);
    if (aAnc.has(b) || bAnc.has(a)) {
      // direct line
      const pa = this.parents(a);
      const pb = this.parents(b);
      if (pa.sire === b || pa.dam === b || pb.sire === a || pb.dam === a) return "parentOffspring";
      return "ancestorDescendant";
    }
    const pa = this.parents(a);
    const pb = this.parents(b);
    const shareBoth = pa.sire != null && pa.sire === pb.sire && pa.dam != null && pa.dam === pb.dam;
    if (shareBoth) return "fullSiblings";
    const shareOne = (pa.sire != null && (pa.sire === pb.sire || pa.sire === pb.dam)) ||
      (pa.dam != null && (pa.dam === pb.sire || pa.dam === pb.dam));
    if (shareOne) return "halfSiblings";
    if (phi >= 0.0625) return "cousinsCloser";
    return "distantly";
  }

  check(a: number, b: number): KinshipResult {
    const phi = this.kinship(a, b);
    const relationship = 2 * phi;
    const shared = [...this.ancestors(a)].filter((x) => this.ancestors(b).has(x));
    const commonAncestors = shared
      .map((id) => ({ id, tag: this.tag(id) }))
      .sort((x, y) => x.tag.localeCompare(y.tag));
    let verdict: KinshipResult["verdict"] = "safe";
    if (phi >= 0.125) verdict = "avoid";
    else if (phi >= 0.0625) verdict = "caution";
    return {
      kinship: phi,
      offspringInbreeding: phi,
      relationship,
      commonAncestors,
      verdict,
      relationKey: this.relationKey(a, b, phi),
    };
  }
}

export function pct(x: number, digits = 1): string {
  return (x * 100).toFixed(digits) + "%";
}
