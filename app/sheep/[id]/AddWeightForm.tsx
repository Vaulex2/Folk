"use client";
import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { addWeightRecord, type FormState } from "@/app/actions";
import { useI18n } from "@/components/I18nProvider";

function todayISO() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export default function AddWeightForm({ sheepId }: { sheepId: number }) {
  const router = useRouter();
  const { t } = useI18n();
  const [state, formAction, pending] = useActionState<FormState, FormData>(addWeightRecord, {});
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the weight field and refresh the chart after a successful submit.
  useEffect(() => {
    if (!pending && state.ok && formRef.current) {
      const w = formRef.current.elements.namedItem("weight_kg") as HTMLInputElement | null;
      if (w) w.value = "";
      router.refresh();
    }
  }, [state, pending, router]);

  return (
    <form ref={formRef} action={formAction} style={{ marginTop: 14 }}>
      <input type="hidden" name="sheep_id" value={sheepId} />
      <div className="filters" style={{ alignItems: "flex-end", marginBottom: 0 }}>
        <div className="field" style={{ minWidth: 160 }}>
          <label htmlFor="weight-date">{t("weights.date")}</label>
          <input className="input" id="weight-date" name="date" type="date" defaultValue={todayISO()} />
        </div>
        <div className="field" style={{ minWidth: 130 }}>
          <label htmlFor="weight-kg">{t("weights.weightKg")}</label>
          <input className="input" id="weight-kg" name="weight_kg" type="number" min="0" step="0.1" />
        </div>
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? t("weights.adding") : t("weights.addWeight")}
        </button>
      </div>
      {state.error && <span className="form-err">{t(state.error)}</span>}
    </form>
  );
}
