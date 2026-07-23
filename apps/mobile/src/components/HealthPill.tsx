import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { font, radius } from "../theme";
import { healthPillColors } from "../theme";
import type { HealthStatus } from "../core";

export function HealthPill({ status, label }: { status: HealthStatus; label: string }) {
  const c = healthPillColors(status);
  return (
    <View style={[styles.pill, { backgroundColor: c.bg }]}>
      <Text style={[styles.text, { color: c.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: "flex-start",
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  text: { fontSize: font.tiny, fontWeight: "700" },
});
