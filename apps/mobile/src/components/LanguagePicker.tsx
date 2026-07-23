import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useI18n } from "../lib/i18n";
import { LOCALES, LOCALE_NAMES } from "../core";
import { colors, font, radius, space } from "../theme";

// Inline language switcher (en / uz / ru) backed by the i18n context.
export function LanguagePicker() {
  const { locale, setLocale } = useI18n();
  return (
    <View style={styles.row}>
      {LOCALES.map((l) => {
        const active = l === locale;
        return (
          <Pressable
            key={l}
            onPress={() => setLocale(l)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.text, active && styles.textActive]}>{LOCALE_NAMES[l]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: space.sm, flexWrap: "wrap", justifyContent: "center" },
  chip: {
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  text: { fontSize: font.small, fontWeight: "600", color: colors.textMuted },
  textActive: { color: "#fff" },
});
