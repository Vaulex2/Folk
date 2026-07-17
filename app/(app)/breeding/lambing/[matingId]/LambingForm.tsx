"use client";
import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { recordLambing, type FormState } from "@/app/actions";
import { useI18n } from "@/components/I18nProvider";

function todayISO() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

interface LambDraft {
  key: number;
  tag: string;
  sex: "Ewe" | "Ram";
  weight: string;
}

export default function LambingForm({
  matingId,
  suggestedTags,
}: {
  matingId: number;
  suggestedTags: string[];
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [state, formAction, pending] = useActionState<FormState, FormData>(recordLambing, {});
  const [lambs, setLambs] = useState<LambDraft[]>([
    { key: 0, tag: suggestedTags[0] ?? "", sex: "Ewe", weight: "" },
  ]);

  function addLamb() {
    setLambs((ls) => [
      ...ls,
      { key: Date.now(), tag: suggestedTags[ls.length] ?? "", sex: "Ewe", weight: "" },
    ]);
  }

  function removeLamb(key: number) {
    setLambs((ls) => (ls.length > 1 ? ls.filter((l) => l.key !== key) : ls));
  }

  function patch(key: number, part: Partial<LambDraft>) {
    setLambs((ls) => ls.map((l) => (l.key === key ? { ...l, ...part } : l)));
  }

  return (
    <form action={formAction} className="form-grid" style={{ maxWidth: 640 }}>
      <input type="hidden" name="mating_id" value={matingId} />
      <input type="hidden" name="count" value={lambs.length} />

      <div className="field">
        <label htmlFor="lamb-birth">{t("lambing.birthDate")}</label>
        <input className="input" id="lamb-birth" name="birth" type="date" defaultValue={todayISO()} />
      </div>

      {lambs.map((l, i) => (
        <div key={l.key} className="panel form-full" style={{ display: "grid", gap: 10 }}>
          <div className="filters" style={{ alignItems: "flex-end", marginBottom: 0 }}>
            <div className="field" style={{ flex: 1, minWidth: 120 }}>
              <label htmlFor={`tag-${l.key}`}>{t("lambing.tag")}</label>
              <input
                className="input"
                id={`tag-${l.key}`}
                name={`tag_${i}`}
                type="text"
                value={l.tag}
                onChange={(e) => patch(l.key, { tag: e.target.value })}
              />
            </div>
            <div className="field" style={{ minWidth: 110 }}>
              <label htmlFor={`sex-${l.key}`}>{t("form.sex")}</label>
              <select
                className="input"
                id={`sex-${l.key}`}
                name={`sex_${i}`}
                value={l.sex}
                onChange={(e) => patch(l.key, { sex: e.target.value as "Ewe" | "Ram" })}
              >
                <option value="Ewe">{t("form.ewe")}</option>
                <option value="Ram">{t("form.ram")}</option>
              </select>
            </div>
            <div className="field" style={{ minWidth: 110 }}>
              <label htmlFor={`weight-${l.key}`}>{t("form.weightKg")}</label>
              <input
                className="input"
                id={`weight-${l.key}`}
                name={`weight_${i}`}
                type="number"
                min="0"
                step="0.1"
                value={l.weight}
                onChange={(e) => patch(l.key, { weight: e.target.value })}
              />
            </div>
            {lambs.length > 1 && (
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => removeLamb(l.key)}
              >
                {t("lambing.removeLamb")}
              </button>
            )}
          </div>
        </div>
      ))}

      <div className="form-actions form-full">
        <button className="btn btn-secondary" type="button" onClick={addLamb}>
          {t("lambing.addLamb")}
        </button>
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? t("form.saving") : t("lambing.save")}
        </button>
        <button className="btn btn-ghost" type="button" onClick={() => router.back()}>
          {t("form.cancel")}
        </button>
        {state.error && <span className="form-err">{t(state.error)}</span>}
      </div>
    </form>
  );
}
