import React, { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { colors, font, radius, space } from "../theme";

interface DateFieldProps {
  label: string;
  value: string | null; // ISO yyyy-mm-dd, or null for unset
  onChange: (iso: string | null) => void;
  optional?: boolean;
  placeholder?: string;
}

function toIso(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function DateField({ label, value, onChange, optional, placeholder }: DateFieldProps) {
  const [show, setShow] = useState(false);
  const current = value ? new Date(value + "T00:00:00") : new Date();

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <Pressable style={styles.box} onPress={() => setShow(true)}>
          <Text style={value ? styles.value : styles.placeholder}>
            {value ?? placeholder ?? "Select a date"}
          </Text>
        </Pressable>
        {optional && value ? (
          <Pressable style={styles.clear} onPress={() => onChange(null)}>
            <Text style={styles.clearText}>Clear</Text>
          </Pressable>
        ) : null}
      </View>
      {show ? (
        <DateTimePicker
          value={current}
          mode="date"
          display={Platform.OS === "ios" ? "inline" : "default"}
          onChange={(event, date) => {
            // On Android the picker is a modal: dismiss it on any result.
            if (Platform.OS === "android") setShow(false);
            if (event.type === "dismissed") return;
            if (date) onChange(toIso(date));
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: space.lg },
  label: { fontSize: font.small, fontWeight: "600", color: colors.textMuted, marginBottom: space.xs },
  row: { flexDirection: "row", alignItems: "center", gap: space.sm },
  box: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: space.md,
    paddingVertical: 13,
  },
  value: { fontSize: font.body, color: colors.text },
  placeholder: { fontSize: font.body, color: colors.textFaint },
  clear: { paddingHorizontal: space.md, paddingVertical: 12 },
  clearText: { color: colors.textMuted, fontSize: font.small, fontWeight: "600" },
});
