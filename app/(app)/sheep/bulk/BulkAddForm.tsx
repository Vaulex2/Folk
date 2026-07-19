"use client";
import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { bulkAddSheep, type FormState } from "@/app/actions";
import { BREEDS, COLORS, HEALTH_STATUSES } from "@/lib/sheep";
import { useI18n } from "@/components/I18nProvider";

export default function BulkAddForm({ startTag }: { startTag: number }) {
  const router = useRouter();
  const { t, m } = useI18n();
  const [state, formAction, pending] = useActionState<FormState, FormData>(bulkAddSheep, {});
  const [health, setHealth] = useState("Healthy");

  return (
    <form action={formAction} className="form-grid">
      <div className="field">
        <label htmlFor="bulk-count">{t("bulk.count")}</label>
        <input className="input" id="bulk-count" name="count" type="number" min="1" max="200" placeholder={t("bulk.countPlaceholder")} />
      </div>

      <div className="field">
        <label>{t("form.sex")}</label>
        <div className="seg" style={{ width: "100%" }}>
          <label className="seg-opt" style={{ flex: 1, justifyContent: "center" }}>
            <input type="radio" name="sex" value="Ewe" defaultChecked />{t("form.ewe")}
          </label>
          <label className="seg-opt" style={{ flex: 1, justifyContent: "center" }}>
            <input type="radio" name="sex" value="Ram" />{t("form.ram")}
          </label>
        </div>
      </div>

      <div className="field">
        <label htmlFor="bulk-age">{t("bulk.avgAge")}</label>
        <input className="input" id="bulk-age" name="avg_age" type="number" min="0" step="0.5" placeholder={t("bulk.agePlaceholder")} />
      </div>

      <div className="field">
        <label htmlFor="bulk-weight">{t("bulk.avgWeight")}</label>
        <input className="input" id="bulk-weight" name="avg_weight" type="number" min="0" placeholder={t("form.weightPlaceholder")} />
      </div>

      <div className="field">
        <label htmlFor="bulk-breed">{t("form.breed")}</label>
        <select className="input" id="bulk-breed" name="breed" defaultValue={BREEDS[0]}>
          {BREEDS.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>

      <div className="field">
        <label htmlFor="bulk-color">{t("form.colourMarkings")}</label>
        <select className="input" id="bulk-color" name="color" defaultValue={COLORS[0]}>
          {COLORS.map((c) => <option key={c} value={c}>{(m.colors as Record<string, string>)[c] ?? c}</option>)}
        </select>
      </div>

      <div className="field">
        <label htmlFor="bulk-health">{t("form.healthStatus")}</label>
        <select className="input" id="bulk-health" name="health" value={health} onChange={(e) => setHealth(e.target.value)}>
          {HEALTH_STATUSES.map((h) => <option key={h} value={h}>{m.health[h]}</option>)}
        </select>
      </div>

      {health === "Pregnant" && (
        <div className="field">
          <label htmlFor="bulk-due">{t("form.lambingDue")}</label>
          <input className="input" id="bulk-due" name="due_date" type="date" />
        </div>
      )}

      <div className="field">
        <label htmlFor="bulk-price">{t("bulk.pricePerHead")}</label>
        <input className="input" id="bulk-price" name="price" type="number" min="0" step="any" placeholder={t("money.pricePlaceholder")} />
      </div>

      <div className="field">
        <label htmlFor="bulk-pdate">{t("money.purchaseDate")}</label>
        <input className="input" id="bulk-pdate" name="purchase_date" type="date" />
      </div>

      <div className="field">
        <label htmlFor="bulk-start">{t("bulk.startTag")}</label>
        <input className="input" id="bulk-start" name="start_tag" type="number" min="1" defaultValue={startTag} />
        <span className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>{t("bulk.startTagHint")}</span>
      </div>

      <div className="form-actions form-full">
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? t("bulk.adding") : t("bulk.submit")}
        </button>
        <button className="btn btn-secondary" type="button" onClick={() => router.back()}>
          {t("form.cancel")}
        </button>
        {state.error && <span className="form-err">{t(state.error)}</span>}
      </div>
    </form>
  );
}
