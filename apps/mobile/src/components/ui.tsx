import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";
import { colors, font, radius, space } from "../theme";

// ---- Text ------------------------------------------------------------------

export function H1({ children }: { children: React.ReactNode }) {
  return <Text style={styles.h1}>{children}</Text>;
}
export function H2({ children }: { children: React.ReactNode }) {
  return <Text style={styles.h2}>{children}</Text>;
}
export function Muted({ children, style }: { children: React.ReactNode; style?: object }) {
  return <Text style={[styles.muted, style]}>{children}</Text>;
}
export function Body({ children, style }: { children: React.ReactNode; style?: object }) {
  return <Text style={[styles.body, style]}>{children}</Text>;
}

// ---- Card ------------------------------------------------------------------

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

// ---- Button ----------------------------------------------------------------

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({ title, onPress, variant = "primary", loading, disabled, style }: ButtonProps) {
  const v = BTN_VARIANTS[variant];
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: v.bg, borderColor: v.border },
        pressed && !isDisabled && styles.btnPressed,
        isDisabled && styles.btnDisabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <Text style={[styles.btnText, { color: v.fg }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const BTN_VARIANTS = {
  primary: { bg: colors.primary, fg: "#fff", border: colors.primary },
  secondary: { bg: colors.surface, fg: colors.text, border: colors.borderStrong },
  danger: { bg: colors.dangerSoft, fg: colors.danger, border: colors.dangerSoft },
  ghost: { bg: "transparent", fg: colors.primary, border: "transparent" },
};

// ---- Form field ------------------------------------------------------------

interface FieldProps extends TextInputProps {
  label: string;
  hint?: string;
}

export function Field({ label, hint, style, ...props }: FieldProps) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textFaint}
        style={[styles.input, style]}
        {...props}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

// ---- Segmented control -----------------------------------------------------

interface SegmentedProps<T extends string> {
  label?: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}

export function Segmented<T extends string>({ label, value, options, onChange }: SegmentedProps<T>) {
  return (
    <View style={styles.fieldWrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.segment}>
        {options.map((o) => {
          const active = o.value === value;
          return (
            <Pressable
              key={o.value}
              onPress={() => onChange(o.value)}
              style={[styles.segmentItem, active && styles.segmentItemActive]}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ---- Misc ------------------------------------------------------------------

export function ErrorText({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return <Text style={styles.errorText}>{children}</Text>;
}

export function Divider() {
  return <View style={styles.divider} />;
}

export function Loader() {
  return (
    <View style={styles.loader}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: font.h1, fontWeight: "700", color: colors.text },
  h2: { fontSize: font.h2, fontWeight: "700", color: colors.text },
  muted: { fontSize: font.small, color: colors.textMuted },
  body: { fontSize: font.body, color: colors.text },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
  },
  btn: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: space.lg,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  btnPressed: { opacity: 0.85 },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontSize: font.body, fontWeight: "600" },
  fieldWrap: { marginBottom: space.lg },
  label: { fontSize: font.small, fontWeight: "600", color: colors.textMuted, marginBottom: space.xs },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: 12,
    fontSize: font.body,
    color: colors.text,
  },
  hint: { fontSize: font.tiny, color: colors.textFaint, marginTop: space.xs },
  segment: {
    flexDirection: "row",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 3,
  },
  segmentItem: { flex: 1, paddingVertical: 10, borderRadius: radius.sm, alignItems: "center" },
  segmentItemActive: { backgroundColor: colors.primary },
  segmentText: { fontSize: font.small, fontWeight: "600", color: colors.textMuted },
  segmentTextActive: { color: "#fff" },
  errorText: { color: colors.danger, fontSize: font.small, marginBottom: space.md },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: space.md },
  loader: { flex: 1, alignItems: "center", justifyContent: "center", padding: space.xxl },
  empty: { padding: space.xl, alignItems: "center" },
  emptyText: { color: colors.textFaint, fontSize: font.small, textAlign: "center" },
});
