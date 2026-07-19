"use client";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { saveSheep, type FormState } from "@/app/actions";
import { BREEDS, COLORS, HEALTH_STATUSES } from "@/lib/sheep";
import type { Option } from "@/lib/options";
import { useI18n } from "./I18nProvider";

export interface SheepFormValues {
  id?: number;
  tag?: string;
  sex?: "Ewe" | "Ram";
  birth?: string;
  weight?: string;
  breed?: string;
  color?: string;
  mother_id?: string;
  father_id?: string;
  health?: string;
  vaccination_date?: string;
  due_date?: string;
  purchase_price?: string;
  purchase_date?: string;
}

export default function SheepForm({
  values = {},
  eweOptions,
  ramOptions,
  submitLabel,
}: {
  values?: SheepFormValues;
  eweOptions: Option[];
  ramOptions: Option[];
  submitLabel?: string;
}) {
  const router = useRouter();
  const { t, m } = useI18n();
  const [state, formAction, pending] = useActionState<FormState, FormData>(saveSheep, {});
  const sex = values.sex ?? "Ewe";
  const save = submitLabel ?? t("form.saveSheep");

  return (
    <form action={formAction} className="form-grid">
      {values.id != null && <input type="hidden" name="id" value={values.id} />}

      <div className="field">
        <label htmlFor="tag">{t("form.tagNumber")}</label>
        <input className="input" id="tag" name="tag" type="text" defaultValue={values.tag ?? ""} />
      </div>

      <div className="field">
        <label>{t("form.sex")}</label>
        <div className="seg" style={{ width: "100%" }}>
          <label className="seg-opt" style={{ flex: 1, justifyContent: "center" }}>
            <input type="radio" name="sex" value="Ewe" defaultChecked={sex === "Ewe"} />{t("form.ewe")}
          </label>
          <label className="seg-opt" style={{ flex: 1, justifyContent: "center" }}>
            <input type="radio" name="sex" value="Ram" defaultChecked={sex === "Ram"} />{t("form.ram")}
          </label>
        </div>
      </div>

      <div className="field">
        <label htmlFor="birth">{t("form.dob")}</label>
        <input className="input" id="birth" name="birth" type="date" defaultValue={values.birth ?? ""} />
      </div>

      <div className="field">
        <label htmlFor="weight">{t("form.weightKg")}</label>
        <input className="input" id="weight" name="weight" type="number" min="0" placeholder={t("form.weightPlaceholder")} defaultValue={values.weight ?? ""} />
      </div>

      <div className="field">
        <label htmlFor="breed">{t("form.breed")}</label>
        <select className="input" id="breed" name="breed" defaultValue={values.breed ?? BREEDS[0]}>
          {BREEDS.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>

      <div className="field">
        <label htmlFor="color">{t("form.colourMarkings")}</label>
        <select className="input" id="color" name="color" defaultValue={values.color ?? COLORS[0]}>
          {COLORS.map((c) => <option key={c} value={c}>{m.colors[c as keyof typeof m.colors]}</option>)}
        </select>
      </div>

      <div className="field">
        <label htmlFor="mother_id">{t("form.dam")}</label>
        <select className="input" id="mother_id" name="mother_id" defaultValue={values.mother_id ?? ""}>
          <option value="">{t("form.none")}</option>
          {eweOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div className="field">
        <label htmlFor="father_id">{t("form.sire")}</label>
        <select className="input" id="father_id" name="father_id" defaultValue={values.father_id ?? ""}>
          <option value="">{t("form.none")}</option>
          {ramOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div className="field">
        <label htmlFor="health">{t("form.healthStatus")}</label>
        <select className="input" id="health" name="health" defaultValue={values.health ?? "Healthy"}>
          {HEALTH_STATUSES.map((h) => <option key={h} value={h}>{m.health[h]}</option>)}
        </select>
      </div>

      <div className="field">
        <label htmlFor="vaccination_date">{t("form.nextVaccination")}</label>
        <input className="input" id="vaccination_date" name="vaccination_date" type="date" defaultValue={values.vaccination_date ?? ""} />
      </div>

      <div className="field">
        <label htmlFor="due_date">{t("form.lambingDue")}</label>
        <input className="input" id="due_date" name="due_date" type="date" defaultValue={values.due_date ?? ""} />
      </div>

      <div className="field">
        <label htmlFor="purchase_price">{t("money.purchasePrice")}</label>
        <input className="input" id="purchase_price" name="purchase_price" type="number" min="0" step="any" placeholder={t("money.pricePlaceholder")} defaultValue={values.purchase_price ?? ""} />
      </div>

      <div className="field">
        <label htmlFor="purchase_date">{t("money.purchaseDate")}</label>
        <input className="input" id="purchase_date" name="purchase_date" type="date" defaultValue={values.purchase_date ?? ""} />
      </div>

      <div className="form-actions form-full">
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? t("form.saving") : save}
        </button>
        <button className="btn btn-secondary" type="button" onClick={() => router.back()}>
          {t("form.cancel")}
        </button>
        {state.error && <span className="form-err">{t(state.error)}</span>}
      </div>
    </form>
  );
}
