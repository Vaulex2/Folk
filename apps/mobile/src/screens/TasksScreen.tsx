import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Screen } from "../components/Screen";
import { Button, Card, Divider, EmptyState, Field, H1, H2, Loader, Muted } from "../components/ui";
import { DateField } from "../components/DateField";
import { Select, type SelectOption } from "../components/Select";
import { Ionicons } from "@expo/vector-icons";
import { useI18n } from "../lib/i18n";
import { useAsync } from "../lib/useAsync";
import { addTask, deleteTask, fetchFlock, fetchTasks, setTaskDone } from "../lib/data";
import { byTag, fmtDate, validateTask, type Sheep, type Task } from "../core";
import { colors, font, space } from "../theme";

export function TasksScreen() {
  const { t, locale } = useI18n();
  const today = new Date().toISOString().slice(0, 10);

  const { data, loading, reload } = useAsync(async () => {
    const [tasks, flock] = await Promise.all([fetchTasks(), fetchFlock()]);
    return { tasks, flock };
  }, []);

  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [sheepId, setSheepId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const flock = data?.flock ?? [];
  const tasks = data?.tasks ?? [];
  const open = useMemo(() => tasks.filter((x) => !x.done), [tasks]);
  const done = useMemo(() => tasks.filter((x) => x.done), [tasks]);

  const sheepOptions: SelectOption[] = [
    { value: "", label: t("form.none") },
    ...[...flock].filter((s) => s.status === "Active").sort(byTag).map((s: Sheep) => ({ value: String(s.id), label: s.tag })),
  ];
  const tagOf = (id: number | null) => (id != null ? flock.find((s) => s.id === id)?.tag : undefined);

  async function onAdd() {
    const result = validateTask({ title: title.trim(), dueDate: dueDate ?? "", sheepId });
    if (!result.ok) {
      setError(t(result.error));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await addTask(result.data);
      setTitle("");
      setDueDate(null);
      setSheepId("");
      reload();
    } catch {
      setError(t("errors.dbError"));
    } finally {
      setBusy(false);
    }
  }

  if (loading && !data) return <Loader />;

  return (
    <Screen refreshing={loading} onRefresh={reload}>
      <H1>{t("tasks.title")}</H1>
      <Muted>{t("tasks.subtitle")}</Muted>

      <Card style={{ marginTop: space.md }}>
        <Field label={t("tasks.what")} value={title} onChangeText={setTitle} placeholder={t("tasks.placeholder")} />
        <DateField label={t("tasks.dueDate")} value={dueDate} onChange={setDueDate} optional />
        <Select label={t("tasks.linkedSheep")} selectedValue={sheepId} options={sheepOptions} onValueChange={setSheepId} />
        {error ? <Muted style={{ color: colors.danger, marginBottom: space.sm }}>{error}</Muted> : null}
        <Button title={busy ? t("tasks.adding") : t("tasks.addTask")} onPress={onAdd} loading={busy} />
        <Muted style={{ marginTop: space.sm }}>{t("tasks.reminderHint")}</Muted>
      </Card>

      <H2>{t("tasks.openTitle")}</H2>
      <Muted style={{ marginBottom: space.sm }}>{t("tasks.openCount", { count: open.length })}</Muted>
      {open.length === 0 ? (
        <EmptyState text={t("tasks.emptyOpen")} />
      ) : (
        open.map((task) => (
          <TaskRow key={task.id} task={task} sheepTag={tagOf(task.sheep_id)} today={today} locale={locale} t={t} onToggle={async () => { await setTaskDone(task.id, true); reload(); }} onDelete={async () => { await deleteTask(task.id); reload(); }} />
        ))
      )}

      {done.length > 0 ? (
        <>
          <H2 >{t("tasks.doneTitle")}</H2>
          <View style={{ height: space.sm }} />
          {done.map((task) => (
            <TaskRow key={task.id} task={task} sheepTag={tagOf(task.sheep_id)} today={today} locale={locale} t={t} done onToggle={async () => { await setTaskDone(task.id, false); reload(); }} onDelete={async () => { await deleteTask(task.id); reload(); }} />
          ))}
        </>
      ) : null}
    </Screen>
  );
}

function TaskRow({
  task,
  sheepTag,
  today,
  locale,
  t,
  done,
  onToggle,
  onDelete,
}: {
  task: Task;
  sheepTag?: string;
  today: string;
  locale: import("../core").Locale;
  t: (k: string, v?: Record<string, string | number>) => string;
  done?: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const overdue = !done && task.due_date && task.due_date < today;
  return (
    <View style={styles.taskRow}>
      <Pressable onPress={onToggle} hitSlop={8}>
        <Ionicons name={done ? "checkbox" : "square-outline"} size={22} color={done ? colors.primary : colors.textFaint} />
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text style={[styles.taskTitle, done && styles.taskDone]}>{task.title}</Text>
        <Text style={styles.taskMeta}>
          {task.due_date ? fmtDate(task.due_date, locale) : ""}
          {sheepTag ? ` · ${sheepTag}` : ""}
          {overdue ? ` · ${t("tasks.overdue")}` : ""}
        </Text>
      </View>
      <Pressable onPress={onDelete} hitSlop={8}>
        <Ionicons name="trash-outline" size={18} color={colors.textFaint} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: space.md,
    marginBottom: space.sm,
  },
  taskTitle: { fontSize: font.body, color: colors.text, fontWeight: "600" },
  taskDone: { textDecorationLine: "line-through", color: colors.textFaint },
  taskMeta: { fontSize: font.tiny, color: colors.textMuted, marginTop: 2 },
});
