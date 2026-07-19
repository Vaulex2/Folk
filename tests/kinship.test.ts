import { describe, expect, it } from "vitest";
import { Pedigree, pct } from "@/lib/kinship";
import type { Sheep } from "@/lib/sheep";

function s(
  id: number,
  sex: "Ewe" | "Ram",
  birth: string,
  mother: number | null,
  father: number | null
): Sheep {
  return {
    id,
    tag: `t${id}`,
    sex,
    birth,
    breed: "Suffolk",
    color: "White",
    weight: 60,
    mother_id: mother,
    father_id: father,
    health: "Healthy",
    due_date: null,
    vaccination_date: null,
    status: "Active",
    photo_url: null,
    purchase_price: null,
    purchase_date: null,
    sale_price: null,
    sale_date: null,
    death_date: null,
  };
}

// A=1 (ewe), B=2, F=3 (founder rams), C=4 & D=5 (full sibs of A×B),
// E=6 (half sib via dam A), G=7 (child of D×F).
const flock: Sheep[] = [
  s(1, "Ewe", "2019-01-01", null, null),
  s(2, "Ram", "2019-01-01", null, null),
  s(3, "Ram", "2019-01-01", null, null),
  s(4, "Ram", "2021-01-01", 1, 2),
  s(5, "Ewe", "2021-01-01", 1, 2),
  s(6, "Ewe", "2021-01-01", 1, 3),
  s(7, "Ram", "2023-01-01", 5, 3),
];

const p = new Pedigree(flock);

describe("Wright's kinship coefficients", () => {
  it.each([
    ["unrelated founders", 1, 2, 0],
    ["full siblings", 4, 5, 0.25],
    ["half siblings (shared dam)", 4, 6, 0.125],
    ["parent-offspring", 1, 4, 0.25],
    ["self (non-inbred)", 1, 1, 0.5],
  ])("%s: kinship(%i,%i) = %d", (_name, a, b, expected) => {
    expect(p.check(a as number, b as number).kinship).toBeCloseTo(expected as number, 9);
  });

  it("predicted offspring inbreeding equals the pair's kinship", () => {
    expect(p.check(5, 3).offspringInbreeding).toBeCloseTo(0, 9); // unrelated pair
    expect(p.check(4, 5).offspringInbreeding).toBeCloseTo(0.25, 9); // full sibs
  });

  it("coefficient of relationship is 2×kinship", () => {
    expect(p.check(4, 5).relationship).toBeCloseTo(0.5, 9);
  });
});

describe("relation keys and verdicts", () => {
  it("classifies relationships", () => {
    expect(p.check(1, 2).relationKey).toBe("unrelated");
    expect(p.check(4, 5).relationKey).toBe("fullSiblings");
    expect(p.check(4, 6).relationKey).toBe("halfSiblings");
    expect(p.check(1, 4).relationKey).toBe("parentOffspring");
    expect(p.check(1, 7).relationKey).toBe("ancestorDescendant"); // grandmother
  });

  it("verdict thresholds: avoid ≥ 0.125, caution ≥ 0.0625, else safe", () => {
    expect(p.check(4, 5).verdict).toBe("avoid"); // full sibs, 0.25
    expect(p.check(4, 6).verdict).toBe("avoid"); // half sibs, 0.125 boundary
    expect(p.check(1, 2).verdict).toBe("safe"); // unrelated
  });

  it("lists common ancestors", () => {
    const r = p.check(4, 6);
    expect(r.commonAncestors.map((c) => c.id)).toEqual([1]);
  });
});

describe("pct", () => {
  it("formats a fraction as a percentage", () => {
    expect(pct(0.25)).toBe("25.0%");
    expect(pct(0.0625, 2)).toBe("6.25%");
  });
});
