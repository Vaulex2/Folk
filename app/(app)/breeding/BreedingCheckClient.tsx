"use client";
import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { addDays, fmtDate, GESTATION_DAYS, type Sheep } from "@/lib/sheep";
import type { Option } from "@/lib/options";
import { Pedigree, pct } from "@/lib/kinship";
import { recordMating, type FormState } from "@/app/actions";
import { useI18n } from "@/components/I18nProvider";

function todayISO() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function RecordMatingForm({ eweId, ramId }: { eweId: string; ramId: string }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [state, formAction, pending] = useActionState<FormState, FormData>(recordMating, {});
  const [date, setDate] = useState(todayISO());

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state, router]);

  return (
    <form action={formAction} className="panel" style={{ marginTop: 16 }}>
      <input type="hidden" name="ewe_id" value={eweId} />
      <input type="hidden" name="ram_id" value={ramId} />
      <div className="filters" style={{ alignItems: "flex-end", marginBottom: 0 }}>
        <div className="field" style={{ minWidth: 180 }}>
          <label htmlFor="mating-date">{t("breeding.matingDate")}</label>
          <input
            className="input"
            id="mating-date"
            name="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="field" style={{ flex: 1, minWidth: 160 }}>
          <span className="text-muted" style={{ fontSize: 13 }}>
            {date && `${t("breeding.dueLabel")} ${fmtDate(addDays(date, GESTATION_DAYS), locale)}`}
          </span>
        </div>
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? t("form.saving") : t("breeding.recordMating")}
        </button>
      </div>
      {state.error && <span className="form-err">{t(state.error)}</span>}
      {state.ok && !pending && (
        <span className="text-muted" style={{ fontSize: 13 }}>{t("breeding.recorded")}</span>
      )}
    </form>
  );
}

export default function BreedingCheckClient({
  flock,
  eweOptions,
  ramOptions,
}: {
  flock: Sheep[];
  eweOptions: Option[];
  ramOptions: Option[];
}) {
  const { t, m } = useI18n();
  const pedigree = useMemo(() => new Pedigree(flock), [flock]);
  const [ewe, setEwe] = useState("");
  const [ram, setRam] = useState("");

  const result = useMemo(() => {
    if (!ewe || !ram) return null;
    return pedigree.check(parseInt(ram, 10), parseInt(ewe, 10));
  }, [ewe, ram, pedigree]);

  return (
    <>
      <div className="pagehead">
        <h1>{t("breeding.title")}</h1>
        <p>{t("breeding.subtitle")}</p>
      </div>

      <div className="filters">
        <div className="field" style={{ minWidth: 220, flex: 1, maxWidth: 320 }}>
          <label htmlFor="bc-ewe">{t("breeding.eweDam")}</label>
          <select className="input" id="bc-ewe" value={ewe} onChange={(e) => setEwe(e.target.value)}>
            <option value="">{t("breeding.chooseEwe")}</option>
            {eweOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="field" style={{ minWidth: 220, flex: 1, maxWidth: 320 }}>
          <label htmlFor="bc-ram">{t("breeding.ramSire")}</label>
          <select className="input" id="bc-ram" value={ram} onChange={(e) => setRam(e.target.value)}>
            <option value="">{t("breeding.chooseRam")}</option>
            {ramOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {!result && (
        <div className="panel">
          <p className="text-muted" style={{ margin: 0 }}>{t("breeding.prompt")}</p>
        </div>
      )}

      {result && (
        <>
          <div className={`verdict verdict-${result.verdict}`}>
            <h3>{t(`breeding.${result.verdict}`)}</h3>
            <p>{m.relations[result.relationKey]}. {t(`breeding.${result.verdict}Text`)}</p>
          </div>

          {result.verdict !== "avoid" && <RecordMatingForm eweId={ewe} ramId={ram} />}

          <div className="metrics">
            <div className="stat">
              <span className="stat-num">{pct(result.offspringInbreeding)}</span>
              <span className="stat-lab">{t("breeding.offspringInbreeding")}</span>
              <span className="stat-sub">{t("breeding.offspringInbreedingSub")}</span>
            </div>
            <div className="stat">
              <span className="stat-num">{pct(result.relationship)}</span>
              <span className="stat-lab">{t("breeding.relatedness")}</span>
              <span className="stat-sub">{t("breeding.relatednessSub")}</span>
            </div>
            <div className="stat">
              <span className="stat-num">{result.kinship.toFixed(3)}</span>
              <span className="stat-lab">{t("breeding.kinship")}</span>
              <span className="stat-sub">{t("breeding.kinshipSub")}</span>
            </div>
          </div>

          <h2 style={{ fontSize: 20, margin: "24px 0 12px" }}>
            {t("breeding.commonAncestors")}{" "}
            <span style={{ color: "var(--muted)", fontFamily: "var(--font-body)", fontSize: 14 }}>
              ({result.commonAncestors.length})
            </span>
          </h2>
          <div className="chips">
            {result.commonAncestors.map((a) => (
              <Link key={a.id} className="node" href={`/sheep/${a.id}`}>
                <span className="node-tag">{a.tag}</span>
                <span className="node-meta">{t("breeding.sharedAncestor")}</span>
              </Link>
            ))}
            {result.commonAncestors.length === 0 && (
              <div className="empty">{t("breeding.noShared")}</div>
            )}
          </div>
        </>
      )}
    </>
  );
}
