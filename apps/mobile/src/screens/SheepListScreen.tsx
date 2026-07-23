import React, { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { EmptyState, Loader } from "../components/ui";
import { SheepCard } from "../components/SheepCard";
import { useI18n } from "../lib/i18n";
import { useAsync } from "../lib/useAsync";
import { fetchFlock } from "../lib/data";
import { view, type HealthStatus, type Sheep } from "../core";
import type { AppStackParamList } from "../navigation/types";
import { colors, font, radius, space } from "../theme";

type Nav = NativeStackNavigationProp<AppStackParamList>;
type SexFilter = "all" | "Ewe" | "Ram";

export function SheepListScreen() {
  const { t, locale } = useI18n();
  const nav = useNavigation<Nav>();
  const today = new Date();

  const { data, loading, reload } = useAsync(() => fetchFlock(), []);
  const [query, setQuery] = useState("");
  const [sex, setSex] = useState<SexFilter>("all");
  const [health, setHealth] = useState<HealthStatus | "all">("all");

  const active = useMemo(() => (data ?? []).filter((s) => s.status === "Active"), [data]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return active.filter((s: Sheep) => {
      if (sex !== "all" && s.sex !== sex) return false;
      if (health !== "all" && s.health !== health) return false;
      if (q && !s.tag.toLowerCase().includes(q) && !s.breed.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [active, query, sex, health]);

  if (loading && !data) return <Loader />;

  const sexFilters: { value: SexFilter; label: string }[] = [
    { value: "all", label: t("list.all") },
    { value: "Ewe", label: t("list.ewes") },
    { value: "Ram", label: t("list.rams") },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <FlatList
        data={filtered}
        keyExtractor={(s) => String(s.id)}
        contentContainerStyle={styles.content}
        onRefresh={reload}
        refreshing={loading}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>{t("list.title")}</Text>
              <Pressable style={styles.addBtn} onPress={() => nav.navigate("SheepForm", { mode: "add" })}>
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.addText}>{t("list.addSheep")}</Text>
              </Pressable>
            </View>
            <Text style={styles.shown}>{t("list.shown", { count: filtered.length, total: active.length })}</Text>

            <View style={styles.searchBox}>
              <Ionicons name="search" size={16} color={colors.textFaint} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={t("list.searchPlaceholder")}
                placeholderTextColor={colors.textFaint}
                style={styles.searchInput}
              />
            </View>

            <View style={styles.chips}>
              {sexFilters.map((f) => (
                <FilterChip key={f.value} label={f.label} active={sex === f.value} onPress={() => setSex(f.value)} />
              ))}
              <FilterChip
                label={health === "all" ? t("list.allHealth") : t(`health.${health}` as string)}
                active={health !== "all"}
                onPress={() => cycleHealth(health, setHealth)}
              />
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <SheepCard sheep={view(item, today, locale)} onPress={() => nav.navigate("SheepDetail", { id: item.id })} />
        )}
        ItemSeparatorComponent={() => <View style={{ height: space.sm }} />}
        ListEmptyComponent={<EmptyState text={t("list.noMatch")} />}
      />
    </SafeAreaView>
  );
}

const HEALTH_CYCLE: (HealthStatus | "all")[] = [
  "all",
  "Healthy",
  "Needs attention",
  "Under treatment",
  "Pregnant",
  "Vaccination due",
];

function cycleHealth(current: HealthStatus | "all", set: (v: HealthStatus | "all") => void) {
  const i = HEALTH_CYCLE.indexOf(current);
  set(HEALTH_CYCLE[(i + 1) % HEALTH_CYCLE.length]);
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, paddingBottom: space.xxl },
  header: { marginBottom: space.md, gap: space.sm },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: font.h1, fontWeight: "700", color: colors.text },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  addText: { color: "#fff", fontWeight: "600", fontSize: font.small },
  shown: { fontSize: font.small, color: colors.textMuted },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
  },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: font.body, color: colors.text },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  chip: {
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: font.small, color: colors.textMuted, fontWeight: "600" },
  chipTextActive: { color: "#fff" },
});
