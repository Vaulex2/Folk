import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "../components/Screen";
import { Card, EmptyState, H1, H2, Loader, Muted } from "../components/ui";
import { HealthPill } from "../components/HealthPill";
import { StatTile } from "../components/StatTile";
import { useI18n } from "../lib/i18n";
import { useAsync } from "../lib/useAsync";
import { fetchFlock, fetchTasks } from "../lib/data";
import { ageYears, fmtDate, view } from "../core";
import type { AppStackParamList } from "../navigation/types";
import { config } from "../config";
import { colors, font, space } from "../theme";

type Nav = NativeStackNavigationProp<AppStackParamList>;

export function HomeScreen() {
  const { t, locale } = useI18n();
  const nav = useNavigation<Nav>();
  const today = new Date();

  const { data, loading, reload } = useAsync(async () => {
    const [flock, tasks] = await Promise.all([fetchFlock(), fetchTasks()]);
    return { flock, tasks };
  }, []);

  if (loading && !data) return <Loader />;
  const flock = data?.flock ?? [];
  const tasks = data?.tasks ?? [];
  const all = flock.filter((s) => s.status === "Active");

  const ewes = all.filter((s) => s.sex === "Ewe").length;
  const rams = all.filter((s) => s.sex === "Ram").length;
  const lambs = all.filter((s) => ageYears(s.birth, today) < 1).length;
  const avg = all.length ? all.reduce((a, s) => a + ageYears(s.birth, today), 0) / all.length : 0;

  const alerts = all
    .filter((s) => s.health === "Under treatment" || s.health === "Needs attention")
    .sort(
      (a, b) =>
        (a.health === "Under treatment" ? 0 : 1) - (b.health === "Under treatment" ? 0 : 1) ||
        a.tag.localeCompare(b.tag)
    );

  const upcoming = all
    .flatMap((s) => {
      const items: { id: number | null; label: string; date: string; kind: string }[] = [];
      if (s.due_date) items.push({ id: s.id, label: s.tag, date: s.due_date, kind: t("dashboard.lambingDue") });
      if (s.vaccination_date)
        items.push({ id: s.id, label: s.tag, date: s.vaccination_date, kind: t("dashboard.vaccinationDue") });
      return items;
    })
    .concat(
      tasks
        .filter((task) => !task.done && task.due_date)
        .map((task) => ({ id: null, label: task.title, date: task.due_date!, kind: t("dashboard.taskDue") }))
    )
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 6);

  const breedCount = new Set(all.map((s) => s.breed)).size;

  return (
    <Screen refreshing={loading} onRefresh={reload}>
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <H1>{t("dashboard.title")}</H1>
          <Muted>{t("dashboard.subtitle", { date: fmtDate(today.toISOString(), locale) })}</Muted>
        </View>
        <Pressable style={styles.gear} onPress={() => nav.navigate("Settings")} hitSlop={10}>
          <Ionicons name="settings-outline" size={22} color={colors.textMuted} />
        </Pressable>
      </View>

      <View style={styles.stats}>
        <StatTile label={t("dashboard.totalHead")} value={String(all.length)} sub={t("dashboard.split", { ewes, rams })} />
        <StatTile label={t("dashboard.lambs")} value={String(lambs)} sub={t("dashboard.lambsSub")} />
        <StatTile label={t("dashboard.avgAge")} value={avg.toFixed(1)} sub={t("dashboard.avgAgeSub")} />
        <StatTile label={t("dashboard.healthAlerts")} value={String(alerts.length)} sub={t("dashboard.healthAlertsSub")} accent />
      </View>

      <Card>
        <View style={styles.panelHead}>
          <H2>{t("dashboard.needsAttention")}</H2>
          <Muted>{t("dashboard.flagged", { count: alerts.length })}</Muted>
        </View>
        {alerts.length === 0 ? (
          <EmptyState text={t("dashboard.allHealthy")} />
        ) : (
          alerts.map((s) => {
            const v = view(s, today, locale);
            return (
              <Pressable
                key={s.id}
                style={styles.row}
                onPress={() => nav.navigate("SheepDetail", { id: s.id })}
              >
                <Text style={styles.rowTag}>{v.tag}</Text>
                <Text style={styles.rowMeta} numberOfLines={1}>
                  {v.metaShort} · {v.breed}
                </Text>
                <HealthPill status={v.health} label={v.healthLabel} />
              </Pressable>
            );
          })
        )}
      </Card>

      <Card>
        <View style={styles.panelHead}>
          <H2>{t("dashboard.upcoming")}</H2>
          <Muted>{t("dashboard.upcomingSub")}</Muted>
        </View>
        {upcoming.length === 0 ? (
          <EmptyState text={t("dashboard.nothingCalendar")} />
        ) : (
          upcoming.map((u, i) => (
            <Pressable
              key={`${u.label}-${u.kind}-${i}`}
              style={styles.row}
              disabled={u.id == null}
              onPress={() => u.id != null && nav.navigate("SheepDetail", { id: u.id })}
            >
              <Text style={styles.rowTag} numberOfLines={1}>
                {u.label}
              </Text>
              <Text style={styles.rowMeta}>{u.kind}</Text>
              <Text style={styles.date}>{fmtDate(u.date, locale)}</Text>
            </Pressable>
          ))
        )}
      </Card>

      <Muted style={{ marginTop: space.sm }}>{t("dashboard.tracking", { count: all.length, breeds: breedCount })}</Muted>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "flex-start", gap: space.sm },
  gear: { padding: space.xs },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: space.md },
  panelHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: space.sm },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingVertical: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rowTag: { fontSize: font.body, fontWeight: "700", color: colors.text, minWidth: 44 },
  rowMeta: { flex: 1, fontSize: font.small, color: colors.textMuted },
  date: { fontSize: font.tiny, color: colors.textFaint },
});
