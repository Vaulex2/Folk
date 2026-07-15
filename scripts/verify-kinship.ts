import { Pedigree } from "../lib/kinship";
import type { Sheep } from "../lib/sheep";

function s(id: number, sex: "Ewe" | "Ram", birth: string, mother: number | null, father: number | null): Sheep {
  return { id, tag: `t${id}`, sex, birth, breed: "Suffolk", color: "White", weight: 60, mother_id: mother, father_id: father, health: "Healthy", due_date: null, vaccination_date: null, status: "Active", photo_url: null };
}

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
const cases: [string, number, number, number][] = [
  ["unrelated founders A,B", 1, 2, 0],
  ["full sibs C,D", 4, 5, 0.25],
  ["half sibs C,E (share dam)", 4, 6, 0.125],
  ["parent-offspring A,C", 1, 4, 0.25],
  ["self A,A", 1, 1, 0.5],
];

let ok = true;
for (const [name, a, b, expect] of cases) {
  const r = p.check(a, b);
  const pass = Math.abs(r.kinship - expect) < 1e-9;
  ok = ok && pass;
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}: kinship=${r.kinship.toFixed(4)} (expect ${expect})  rel=${r.relationKey}  verdict=${r.verdict}  common=[${r.commonAncestors.map((c) => c.tag).join(",")}]`);
}

const dxf = p.check(5, 3);
console.log(`\nD x F offspring inbreeding = ${dxf.offspringInbreeding.toFixed(4)} (expect 0)`);
const cxd = p.check(4, 5);
console.log(`C x D (full sib) offspring inbreeding = ${cxd.offspringInbreeding.toFixed(4)} (expect 0.25), verdict=${cxd.verdict}`);

process.exit(ok ? 0 : 1);
