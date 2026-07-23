import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, font, radius, space } from "../theme";
import { HealthPill } from "./HealthPill";
import { SheepAvatar } from "./SheepAvatar";
import type { SheepView } from "../core";

export function SheepCard({ sheep, onPress }: { sheep: SheepView; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <SheepAvatar photoUrl={sheep.photoUrl} tag={sheep.tag} />
      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={styles.tag}>{sheep.tag}</Text>
          <HealthPill status={sheep.health} label={sheep.healthLabel} />
        </View>
        <Text style={styles.meta}>{sheep.metaShort}</Text>
        <Text style={styles.sub}>
          {sheep.breed} · {sheep.weight}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    gap: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
    alignItems: "center",
  },
  pressed: { opacity: 0.7 },
  body: { flex: 1, gap: 2 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  tag: { fontSize: font.h3, fontWeight: "700", color: colors.text },
  meta: { fontSize: font.small, color: colors.textMuted },
  sub: { fontSize: font.small, color: colors.textFaint },
});
