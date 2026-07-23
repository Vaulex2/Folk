import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, ErrorText, Field } from "../components/ui";
import { LanguagePicker } from "../components/LanguagePicker";
import { useSession } from "../lib/session";
import { useI18n } from "../lib/i18n";
import { colors, font, space } from "../theme";
import { config } from "../config";

export function LoginScreen() {
  const { signIn } = useSession();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    if (!email || !password) {
      setError(t("auth.errRequired"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
    } catch {
      setError(t("auth.errInvalid"));
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.body}>
          <View style={styles.brand}>
            <Text style={styles.logo}>🐑</Text>
            <Text style={styles.name}>{config.flockName}</Text>
            <Text style={styles.tagline}>{t("auth.subtitle")}</Text>
          </View>

          <Field
            label={t("auth.email")}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            textContentType="username"
          />
          <Field
            label={t("auth.password")}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
            textContentType="password"
          />
          <ErrorText>{error}</ErrorText>
          <Button title={busy ? t("auth.signingIn") : t("auth.signIn")} onPress={onSubmit} loading={busy} />

          <View style={styles.lang}>
            <LanguagePicker />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  body: { flex: 1, justifyContent: "center", padding: space.xl },
  brand: { alignItems: "center", marginBottom: space.xxl },
  logo: { fontSize: 56 },
  name: { fontSize: 30, fontWeight: "800", color: colors.text, marginTop: space.sm },
  tagline: { fontSize: font.body, color: colors.textMuted, marginTop: space.xs },
  lang: { marginTop: space.xl, alignItems: "center" },
});
