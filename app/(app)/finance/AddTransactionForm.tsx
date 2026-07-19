"use client";
import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { addTransaction, type FormState } from "@/app/actions";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/lib/finance";
import type { Option } from "@/lib/options";
import { useI18n } from "@/components/I18nProvider";

export default function AddTransactionForm({
  sheepOptions,
  todayISO,
}: {
  sheepOptions: Option[];
  todayISO: string;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [state, formAction, pending] = useActionState<FormState, FormData>(addTransaction, {});
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the form and refresh the ledger after a successful submit.
  useEffect(() => {
    if (!pending && state.ok && formRef.current) {
      formRef.current.reset();
      router.refresh();
    }
  }, [state, pending, router]);

  return (
    <form ref={formRef} action={formAction}>
      <div className="filters" style={{ alignItems: "flex-end", marginBottom: 0 }}>
        <div className="field" style={{ minWidth: 170 }}>
          <label htmlFor="tx-category">{t("finance.category")}</label>
          <select className="input" id="tx-category" name="category" defaultValue="feed">
            <optgroup label={t("finance.groupExpense")}>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>{t(`finance.cat.${c}`)}</option>
              ))}
            </optgroup>
            <optgroup label={t("finance.groupIncome")}>
              {INCOME_CATEGORIES.map((c) => (
                <option key={c} value={c}>{t(`finance.cat.${c}`)}</option>
              ))}
            </optgroup>
          </select>
        </div>
        <div className="field" style={{ minWidth: 140 }}>
          <label htmlFor="tx-amount">{t("finance.amount")}</label>
          <input
            className="input"
            id="tx-amount"
            name="amount"
            type="number"
            min="0"
            step="any"
            placeholder={t("money.pricePlaceholder")}
          />
        </div>
        <div className="field" style={{ minWidth: 150 }}>
          <label htmlFor="tx-date">{t("finance.date")}</label>
          <input className="input" id="tx-date" name="date" type="date" defaultValue={todayISO} />
        </div>
        <div className="field" style={{ flex: 1, minWidth: 170 }}>
          <label htmlFor="tx-note">{t("finance.noteLabel")}</label>
          <input
            className="input"
            id="tx-note"
            name="note"
            type="text"
            placeholder={t("finance.notePlaceholder")}
          />
        </div>
        <div className="field" style={{ minWidth: 130 }}>
          <label htmlFor="tx-sheep">{t("finance.sheepOptional")}</label>
          <select className="input" id="tx-sheep" name="sheep_id" defaultValue="">
            <option value="">{t("form.none")}</option>
            {sheepOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? t("finance.adding") : t("finance.addEntry")}
        </button>
      </div>
      {state.error && <span className="form-err">{t(state.error)}</span>}
    </form>
  );
}
