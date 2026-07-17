import { describe, expect, it } from "vitest";
import {
  addDays,
  ageLabel,
  ageYears,
  ancestorLevels,
  findSheep,
  GESTATION_DAYS,
  getOpenMatingForEwe,
  isLamb,
  offspringOf,
  type Mating,
  type Sheep,
} from "@/lib/sheep";

function s(id: number, birth: string, mother: number | null = null, father: number | null = null): Sheep {
  return {
    id,
    tag: `t${id}`,
    sex: "Ewe",
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
  };
}

describe("addDays", () => {
  it("adds days within a month", () => {
    expect(addDays("2026-03-01", 10)).toBe("2026-03-11");
  });

  it("rolls over month and year boundaries", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("handles leap years", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
  });

  it("computes a lambing due date one gestation out", () => {
    // 2026-01-01 + 152 days = 2026-06-02
    expect(addDays("2026-01-01", GESTATION_DAYS)).toBe("2026-06-02");
  });
});

describe("ageYears / isLamb", () => {
  const today = new Date("2026-07-01T00:00:00Z");

  it("measures age in fractional years", () => {
    expect(ageYears("2024-07-01", today)).toBeCloseTo(2, 1);
  });

  it("treats under-1-year-olds as lambs", () => {
    expect(isLamb(s(1, "2026-01-01"), today)).toBe(true);
    expect(isLamb(s(2, "2024-01-01"), today)).toBe(false);
  });
});

describe("ageLabel", () => {
  it("shows months under a year", () => {
    expect(ageLabel(0.5, "en")).toBe("6 mo");
  });

  it("never rounds down to zero months", () => {
    expect(ageLabel(0.01, "en")).toBe("1 mo");
  });

  it("pluralizes English years", () => {
    expect(ageLabel(1.2, "en")).toBe("1 yr");
    expect(ageLabel(3.4, "en")).toBe("3 yrs");
  });

  it("agrees Russian year nouns (1 год, 2–4 года, 5+ лет)", () => {
    expect(ageLabel(1.1, "ru")).toBe("1 год");
    expect(ageLabel(3.1, "ru")).toBe("3 года");
    expect(ageLabel(5.1, "ru")).toBe("5 лет");
    expect(ageLabel(11.1, "ru")).toBe("11 лет"); // 11 is an exception to the -1 rule
    expect(ageLabel(21.1, "ru")).toBe("21 год");
  });
});

describe("pedigree helpers", () => {
  const flock = [s(1, "2019-01-01"), s(2, "2019-01-01"), s(3, "2021-01-01", 1, 2), s(4, "2021-01-01", 1, 2)];

  it("finds a sheep by id, tolerating null", () => {
    expect(findSheep(flock, 3)?.tag).toBe("t3");
    expect(findSheep(flock, null)).toBeUndefined();
    expect(findSheep(flock, 99)).toBeUndefined();
  });

  it("derives offspring from either parent link", () => {
    expect(offspringOf(flock, 1).map((x) => x.id)).toEqual([3, 4]);
    expect(offspringOf(flock, 3)).toEqual([]);
  });

  it("builds positional ancestor levels with 2^(g+1) slots", () => {
    const levels = ancestorLevels(flock, flock[2], 3);
    expect(levels.map((l) => l.length)).toEqual([2, 4, 8]);
    // level 0 = [father, mother]
    expect(levels[0][0]?.id).toBe(2);
    expect(levels[0][1]?.id).toBe(1);
    // grandparents are unknown — founders have no parents
    expect(levels[1].every((x) => x === null)).toBe(true);
  });
});

describe("getOpenMatingForEwe", () => {
  const m = (id: number, ewe: number, status: Mating["status"]): Mating => ({
    id,
    ewe_id: ewe,
    ram_id: 2,
    mating_date: "2026-01-01",
    due_date: "2026-06-02",
    status,
  });

  it("returns the Planned or Confirmed mating", () => {
    expect(getOpenMatingForEwe([m(1, 5, "Lambed"), m(2, 5, "Planned")], 5)?.id).toBe(2);
    expect(getOpenMatingForEwe([m(3, 5, "Confirmed")], 5)?.id).toBe(3);
  });

  it("ignores closed matings and other ewes", () => {
    expect(getOpenMatingForEwe([m(1, 5, "Lambed"), m(2, 5, "Failed")], 5)).toBeUndefined();
    expect(getOpenMatingForEwe([m(1, 6, "Planned")], 5)).toBeUndefined();
  });
});
