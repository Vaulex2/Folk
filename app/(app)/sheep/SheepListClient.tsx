"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { SheepView } from "@/lib/sheep";
import { HEALTH_STATUSES } from "@/lib/sheep";
import HealthPill from "@/components/HealthPill";
import { IconPlus } from "@/components/icons";
import { useI18n } from "@/components/I18nProvider";

type SexFilter = "all" | "Ewe" | "Ram";

export default function SheepListClient({ rows, total }: { rows: SheepView[]; total: number }) {
  const router = useRouter();
  const { t, m } = useI18n();
  const [q, setQ] = useState("");
  const [sex, setSex] = useState<SexFilter>("all");
  const [health, setHealth] = useState<string>("all");

  const filtered = useMemo(() => {
    let out = rows.slice();
    if (sex !== "all") out = out.filter((s) => s.sex === sex);
    if (health !== "all") out = out.filter((s) => s.health === health);
    const term = q.trim().toLowerCase();
    if (term) {
      out = out.filter(
        (s) => s.tag.toLowerCase().includes(term) || s.breed.toLowerCase().includes(term)
      );
    }
    return out.sort((a, b) => a.tag.localeCompare(b.tag));
  }, [rows, sex, health, q]);

  return (
    <>
      <div className="pagehead headrow">
        <div>
          <h1>{t("list.title")}</h1>
          <p>{t("list.shown", { count: filtered.length, total })}</p>
        </div>
        <Link className="btn btn-primary" href="/sheep/new">
          <IconPlus />{t("list.addSheep")}
        </Link>
      </div>

      <div className="filters">
        <input
          className="input search"
          type="search"
          placeholder={t("list.searchPlaceholder")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="seg">
          <label className="seg-opt">
            <input type="radio" name="sexf" checked={sex === "all"} onChange={() => setSex("all")} />{t("list.all")}
          </label>
          <label className="seg-opt">
            <input type="radio" name="sexf" checked={sex === "Ewe"} onChange={() => setSex("Ewe")} />{t("list.ewes")}
          </label>
          <label className="seg-opt">
            <input type="radio" name="sexf" checked={sex === "Ram"} onChange={() => setSex("Ram")} />{t("list.rams")}
          </label>
        </div>
        <select
          className="input"
          style={{ width: "auto", minWidth: 160 }}
          value={health}
          onChange={(e) => setHealth(e.target.value)}
        >
          <option value="all">{t("list.allHealth")}</option>
          {HEALTH_STATUSES.map((h) => (
            <option key={h} value={h}>{m.health[h]}</option>
          ))}
        </select>
      </div>

      <div className="tw">
        <table className="table">
          <thead>
            <tr>
              <th>{t("list.thTag")}</th>
              <th>{t("list.thSex")}</th>
              <th>{t("list.thAge")}</th>
              <th className="col-breed">{t("list.thBreed")}</th>
              <th className="col-weight">{t("list.thWeight")}</th>
              <th>{t("list.thHealth")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id} onClick={() => router.push(`/sheep/${s.id}`)}>
                <td>
                  <span className="rowtagwrap">
                    {s.photoUrl && <Image className="row-avatar" src={s.photoUrl} alt="" width={28} height={28} />}
                    <span className="rowtag">{s.tag}</span>
                  </span>
                </td>
                <td>{s.sexWithLamb}</td>
                <td>{s.ageLabel}</td>
                <td className="col-breed">{s.breed}</td>
                <td className="col-weight">{s.weight}</td>
                <td><HealthPill health={s.health} label={s.healthLabel} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="empty">{t("list.noMatch")}</div>}
      </div>
    </>
  );
}
