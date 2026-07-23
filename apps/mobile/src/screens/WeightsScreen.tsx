import React from "react";
import { useWindowDimensions, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Screen } from "../components/Screen";
import { Button, Card, Divider, EmptyState, H1, Loader, Muted } from "../components/ui";
import { GrowthChart } from "../components/GrowthChart";
import { useI18n } from "../lib/i18n";
import { useAsync } from "../lib/useAsync";
import { fetchWeights } from "../lib/data";
import { averageDailyGain, fmtDate } from "../core";
import type { AppStackParamList } from "../navigation/types";
import { colors, font, space } from "../theme";

type Nav = NativeStackNavigationProp<AppStackParamList>;
type Rt = RouteProp<AppStackParamList, "Weights">;

export function WeightsScreen() {
  const { t, locale } = useI18n();
  const nav = useNavigation<Nav>();
  const { sheepId } = useRoute<Rt>().params;
  const { width } = useWindowDimensions();

  const { data, loading, reload } = useAsync(() => fetchWeights(sheepId), [sheepId]);

  if (loading && !data) return <Loader />;
  const records = data ?? [];
  const adg = averageDailyGain(records);
  const reversed = [...records].reverse(); // newest first for the list

  return (
    <Screen refreshing={loading} onRefresh={reload}>
      <H1>{t("weights.title")}</H1>
      <Button title={t("weights.addWeight")} onPress={() => nav.navigate("AddWeight", { sheepId })} style={{ marginVertical: space.sm }} />

      {records.length >= 2 ? (
        <Card>
          <GrowthChart records={records} width={width - space.lg * 2 - space.lg * 2} />
          <View style={styles.adgRow}>
            <View style={styles.adg}>
              <Text style={styles.adgLabel}>{t("weights.adgOverall")}</Text>
              <Text style={styles.adgValue}>{adg.overall != null ? `${adg.overall} ${t("weights.gPerDay")}` : "—"}</Text>
            </View>
            <View style={styles.adg}>
              <Text style={styles.adgLabel}>{t("weights.adgRecent")}</Text>
              <Text style={styles.adgValue}>{adg.recent != null ? `${adg.recent} ${t("weights.gPerDay")}` : "—"}</Text>
            </View>
          </View>
        </Card>
      ) : null}

      <Card>
        {reversed.length === 0 ? (
          <EmptyState text={t("weights.noRecords")} />
        ) : (
          reversed.map((r, i) => (
            <View key={r.id} style={[styles.row, i > 0 && styles.rowBorder]}>
              <Text style={styles.date}>{fmtDate(r.date, locale)}</Text>
              <Text style={styles.weight}>{r.weight_kg} {t("units.kg")}</Text>
            </View>
          ))
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  adgRow: { flexDirection: "row", gap: space.lg, marginTop: space.md },
  adg: { flex: 1 },
  adgLabel: { fontSize: font.tiny, color: colors.textFaint, textTransform: "uppercase", letterSpacing: 0.4 },
  adgValue: { fontSize: font.h3, fontWeight: "700", color: colors.text, marginTop: 2 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: space.md },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  date: { fontSize: font.body, color: colors.textMuted },
  weight: { fontSize: font.body, fontWeight: "700", color: colors.text },
});
