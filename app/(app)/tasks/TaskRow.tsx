"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { deleteTask, setTaskDone } from "@/app/actions";
import type { Task } from "@/lib/sheep";
import { useT } from "@/components/I18nProvider";

export default function TaskRow({
  task,
  overdue,
  dueLabel,
  linkedSheep,
}: {
  task: Task;
  overdue: boolean;
  dueLabel: string | null;
  linkedSheep: { id: number; tag: string } | null;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const t = useT();

  const run = (fn: () => Promise<void>) =>
    start(async () => {
      await fn();
      router.refresh();
    });

  return (
    <div className="lrow" style={{ cursor: "default" }}>
      <input
        type="checkbox"
        checked={task.done}
        disabled={pending}
        onChange={(e) => run(() => setTaskDone(task.id, e.target.checked))}
        aria-label={t("tasks.markDone")}
      />
      <span className="lmeta" style={task.done ? { textDecoration: "line-through" } : undefined}>
        {task.title}
        {linkedSheep && (
          <>
            {" · "}
            <Link href={`/sheep/${linkedSheep.id}`} style={{ color: "inherit" }}>
              {linkedSheep.tag}
            </Link>
          </>
        )}
      </span>
      {dueLabel &&
        (overdue ? (
          <span className="tag" style={{ background: "var(--color-accent-200)", color: "var(--color-accent-900)" }}>
            {t("tasks.overdue")} · {dueLabel}
          </span>
        ) : (
          <span className="tag tag-neutral">{dueLabel}</span>
        ))}
      <button
        className="btn btn-ghost"
        type="button"
        disabled={pending}
        onClick={() => run(() => deleteTask(task.id))}
        aria-label={t("tasks.delete")}
        style={{ padding: "4px 10px" }}
      >
        ×
      </button>
    </div>
  );
}
