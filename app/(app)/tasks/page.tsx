import { getActiveSheep, getTasks } from "@/lib/flock";
import { hasSupabaseConfig } from "@/lib/supabase";
import SetupNotice from "@/components/SetupNotice";
import AddTaskForm from "./AddTaskForm";
import TaskRow from "./TaskRow";
import { byTag, fmtDate } from "@/lib/sheep";
import { getServerT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  if (!hasSupabaseConfig()) return <SetupNotice />;
  const { locale, t } = await getServerT();
  const [tasks, active] = await Promise.all([getTasks(), getActiveSheep()]);

  const todayISO = new Date().toISOString().slice(0, 10);
  const open = tasks.filter((task) => !task.done);
  const done = tasks.filter((task) => task.done);
  const sheepById = new Map(active.map((s) => [s.id, s]));
  const sheepOptions = active
    .slice()
    .sort(byTag)
    .map((s) => ({ value: String(s.id), label: s.tag }));

  return (
    <>
      <div className="pagehead">
        <h1>{t("tasks.title")}</h1>
        <p>{t("tasks.subtitle")}</p>
      </div>

      <div className="panel">
        <div className="panel-h">
          <h2>{t("tasks.openTitle")}</h2>
          <span className="count">{t("tasks.openCount", { count: open.length })}</span>
        </div>
        <div className="liste">
          {open.map((task) => {
            const linked = task.sheep_id != null ? sheepById.get(task.sheep_id) : undefined;
            return (
              <TaskRow
                key={task.id}
                task={task}
                overdue={!!task.due_date && task.due_date < todayISO}
                dueLabel={task.due_date ? fmtDate(task.due_date, locale) : null}
                linkedSheep={linked ? { id: linked.id, tag: linked.tag } : null}
              />
            );
          })}
          {open.length === 0 && <div className="empty">{t("tasks.emptyOpen")}</div>}
        </div>
        <AddTaskForm sheepOptions={sheepOptions} />
      </div>

      {done.length > 0 && (
        <div className="panel" style={{ marginTop: 22 }}>
          <div className="panel-h">
            <h2>{t("tasks.doneTitle")}</h2>
            <span className="count">{done.length}</span>
          </div>
          <div className="liste">
            {done.map((task) => {
              const linked = task.sheep_id != null ? sheepById.get(task.sheep_id) : undefined;
              return (
                <TaskRow
                  key={task.id}
                  task={task}
                  overdue={false}
                  dueLabel={task.due_date ? fmtDate(task.due_date, locale) : null}
                  linkedSheep={linked ? { id: linked.id, tag: linked.tag } : null}
                />
              );
            })}
          </div>
        </div>
      )}

      <p className="text-muted" style={{ marginTop: 22, fontSize: 13 }}>
        {t("tasks.reminderHint")}
      </p>
    </>
  );
}
