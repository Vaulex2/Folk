import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, font, radius, space } from "../theme";

interface Props {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}

export function StatTile({ label, value, sub, accent }: Props) {
  return (
    <View style={[styles.tile, accent && styles.accent]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, accent && styles.accentText]}>{value}</Text>
      {sub ? <Text style={styles.sub}>{sub}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexGrow: 1,
    flexBasis: "47%",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    gap: 2,
  },
  accent: { backgroundColor: colors.primarySoft, borderColor: colors.primarySoft },
  label: { fontSize: font.tiny, fontWeight: "700", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5 },
  value: { fontSize: font.h1, fontWeight: "700", color: colors.text },
  accentText: { color: colors.primaryDark },
  sub: { fontSize: font.small, color: colors.textFaint },
});
