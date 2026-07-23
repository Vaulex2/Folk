import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { colors, font, radius, space } from "../theme";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label?: string;
  selectedValue: string;
  options: SelectOption[];
  onValueChange: (v: string) => void;
}

// Thin wrapper over the platform picker so forms don't repeat the border/label
// chrome. On Android the Picker renders as a dropdown; on iOS as a wheel.
export function Select({ label, selectedValue, options, onValueChange }: SelectProps) {
  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.box}>
        <Picker
          selectedValue={selectedValue}
          onValueChange={(v) => onValueChange(String(v))}
          dropdownIconColor={colors.textMuted}
          style={Platform.OS === "android" ? styles.androidPicker : undefined}
        >
          {options.map((o) => (
            <Picker.Item key={o.value} label={o.label} value={o.value} color={colors.text} />
          ))}
        </Picker>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: space.lg },
  label: { fontSize: font.small, fontWeight: "600", color: colors.textMuted, marginBottom: space.xs },
  box: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    justifyContent: "center",
  },
  androidPicker: { color: colors.text },
});
