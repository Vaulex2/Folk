import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "../components/Screen";
import { Card, EmptyState, H1, H2, Loader, Muted } from "../components/ui";
import { useI18n } from "../lib/i18n";
import { useAsync } from "../lib/useAsync";
import { fetchFlock } from "../lib/data";
import { fmtDate, fmtMoney, view, type Sheep } from "../core";
import type { AppStackParamList } from "../navigation/types";
import { colors, font, space } from "../theme";

type Nav = NativeStackNavigationProp<AppStackParamList>;

export function HistoryScreen() {
  const { t, locale } = useI18n();
  const nav = useNavigation<Nav>();
  const today = new Date();
  const { data, loading, reload } = useAsync(() => fetchFlock(), []);

  const flock = data ?? [];
  const sold = useMemo(() => flock.filter((s) => s.status === "Sold"), [flock]);
  const died = useMemo(() => flock.filter((s) => s.status === "Died"), [flock]);
  const soldTotal = sold.reduce((a, s) => a + (s.sale_price ?? 0), 0);

  if (loading && !data) return <Loader />;

  return (
    <Screen refreshing={loading} onRefresh={reload}>
      <H1>{t("history.title")}</H1>
      <Muted style={{ marginBottom: space.md }}>{t("history.subtitle")}</Muted>

      <Card>
        <H2>{t("history.soldTitle")}</H2>
        <Muted style={{ marginBottom: space.sm }}>
          {t("history.soldCount", { count: sold.length, total: `${fmtMoney(soldTotal)} ${t("money.currency")}` })}
        </Muted>
        {sold.length === 0 ? (
          <EmptyState text={t("history.emptySold")} />
        ) : (
          sold.map((s) => (
            <Row
              key={s.id}
              tag={s.tag}
              meta={view(s, today, locale).metaShort}
              right={s.sale_price != null ? `${fmtMoney(s.sale_price)} ${t("money.currency")}` : t("history.noPrice")}
              date={s.sale_date ? fmtDate(s.sale_date, locale) : ""}
              onPress={() => nav.navigate("SheepDetail", { id: s.id })}
            />
          ))
        )}
      </Card>

      <Card>
        <H2>{t("history.diedTitle")}</H2>
        <View style={{ height: space.sm }} />
        {died.length === 0 ? (
          <EmptyState text={t("history.emptyDied")} />
        ) : (
          died.map((s: Sheep) => (
            <Row
              key={s.id}
              tag={s.tag}
              meta={view(s, today, locale).metaShort}
              right=""
              date={s.death_date ? `${t("history.deathDate")} ${fmtDate(s.death_date, locale)}` : ""}
              onPress={() => nav.navigate("SheepDetail", { id: s.id })}
            />
          ))
        )}
      </Card>

      <Muted>{t("history.note")}</Muted>
    </Screen>
  );
}

function Row({
  tag,
  meta,
  right,
  date,
  onPress,
}: {
  tag: string;
  meta: string;
  right: string;
  date: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={{ flex: 1 }}>
        <Text style={styles.tag}>{tag}</Text>
        <Text style={styles.meta}>{meta}{date ? ` · ${date}` : ""}</Text>
      </View>
      {right ? <Text style={styles.right}>{right}</Text> : null}
      <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingVertical: space.md, borderTopWidth: 1, borderTopColor: colors.border },
  tag: { fontSize: font.body, fontWeight: "700", color: colors.text },
  meta: { fontSize: font.tiny, color: colors.textMuted, marginTop: 2 },
  right: { fontSize: font.small, fontWeight: "700", color: colors.income },
});
