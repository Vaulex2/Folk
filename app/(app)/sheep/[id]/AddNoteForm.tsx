"use client";
import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { addHealthNote, type FormState } from "@/app/actions";
import { HEALTH_STATUSES } from "@/lib/sheep";
import { useI18n } from "@/components/I18nProvider";

function todayISO() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export default function AddNoteForm({ sheepId }: { sheepId: number }) {
  const router = useRouter();
  const { t, m } = useI18n();
  const [state, formAction, pending] = useActionState<FormState, FormData>(addHealthNote, {});
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the note field and refresh the list after a successful submit.
  useEffect(() => {
    if (!pending && !state.error && formRef.current) {
      const note = formRef.current.elements.namedItem("note") as HTMLTextAreaElement | null;
      if (note && note.value) {
        note.value = "";
        router.refresh();
      }
    }
  }, [state, pending, router]);

  return (
    <form ref={formRef} action={formAction} style={{ marginTop: 14 }}>
      <input type="hidden" name="sheep_id" value={sheepId} />
      <div className="form-grid" style={{ maxWidth: "none" }}>
        <div className="field">
          <label htmlFor="note-date">{t("notes.date")}</label>
          <input className="input" id="note-date" name="date" type="date" defaultValue={todayISO()} />
        </div>
        <div className="field">
          <label htmlFor="note-status">{t("notes.setStatus")}</label>
          <select className="input" id="note-status" name="status" defaultValue="">
            <option value="">{t("notes.noChange")}</option>
            {HEALTH_STATUSES.map((h) => <option key={h} value={h}>{m.health[h]}</option>)}
          </select>
        </div>
        <div className="field form-full">
          <label htmlFor="note-text">{t("notes.note")}</label>
          <textarea className="input" id="note-text" name="note" placeholder={t("notes.notePlaceholder")} />
        </div>
        <div className="form-actions form-full">
          <button className="btn btn-primary" type="submit" disabled={pending}>
            {pending ? t("notes.adding") : t("notes.addNote")}
          </button>
          {state.error && <span className="form-err">{t(state.error)}</span>}
        </div>
      </div>
    </form>
  );
}
