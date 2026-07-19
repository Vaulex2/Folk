"use client";
import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { addTask, type FormState } from "@/app/actions";
import type { Option } from "@/lib/options";
import { useI18n } from "@/components/I18nProvider";

export default function AddTaskForm({ sheepOptions }: { sheepOptions: Option[] }) {
  const router = useRouter();
  const { t } = useI18n();
  const [state, formAction, pending] = useActionState<FormState, FormData>(addTask, {});
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the form and refresh the list after a successful submit.
  useEffect(() => {
    if (!pending && state.ok && formRef.current) {
      formRef.current.reset();
      router.refresh();
    }
  }, [state, pending, router]);

  return (
    <form ref={formRef} action={formAction} style={{ marginTop: 14 }}>
      <div className="filters" style={{ alignItems: "flex-end", marginBottom: 0 }}>
        <div className="field" style={{ flex: 1, minWidth: 220 }}>
          <label htmlFor="task-title">{t("tasks.what")}</label>
          <input className="input" id="task-title" name="title" type="text" placeholder={t("tasks.placeholder")} />
        </div>
        <div className="field" style={{ minWidth: 160 }}>
          <label htmlFor="task-due">{t("tasks.dueDate")}</label>
          <input className="input" id="task-due" name="due_date" type="date" />
        </div>
        <div className="field" style={{ minWidth: 150 }}>
          <label htmlFor="task-sheep">{t("tasks.linkedSheep")}</label>
          <select className="input" id="task-sheep" name="sheep_id" defaultValue="">
            <option value="">{t("form.none")}</option>
            {sheepOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? t("tasks.adding") : t("tasks.addTask")}
        </button>
      </div>
      {state.error && <span className="form-err">{t(state.error)}</span>}
    </form>
  );
}
