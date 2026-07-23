import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, Switch, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "../components/Screen";
import { Button, Card, Divider, H1, H2, Muted } from "../components/ui";
import { LanguagePicker } from "../components/LanguagePicker";
import { useI18n } from "../lib/i18n";
import { useSession } from "../lib/session";
import { authenticate, isLockAvailable, isLockEnabled, setLockEnabled } from "../lib/appLock";
import type { AppStackParamList } from "../navigation/types";
import { config } from "../config";
import { colors, font, space } from "../theme";

type Nav = NativeStackNavigationProp<AppStackParamList>;

export function SettingsScreen() {
  const { t } = useI18n();
  const { signOut } = useSession();
  const nav = useNavigation<Nav>();

  const [lockAvailable, setLockAvailable] = useState(false);
  const [lockOn, setLockOn] = useState(false);

  useEffect(() => {
    (async () => {
      setLockAvailable(await isLockAvailable());
      setLockOn(await isLockEnabled());
    })();
  }, []);

  async function toggleLock(next: boolean) {
    if (next) {
      // Require a successful auth before arming the lock, so a user can't lock
      // themselves out with a sensor that doesn't actually work.
      const ok = await authenticate();
      if (!ok) return;
    }
    await setLockEnabled(next);
    setLockOn(next);
  }

  function confirmSignOut() {
    Alert.alert(t("auth.signOut"), "", [
      { text: t("form.cancel"), style: "cancel" },
      { text: t("auth.signOut"), style: "destructive", onPress: () => signOut() },
    ]);
  }

  return (
    <Screen>
      <H1>{config.flockName}</H1>

      <Card>
        <H2>{t("nav.language")}</H2>
        <View style={{ height: space.md }} />
        <LanguagePicker />
      </Card>

      <Card>
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>App lock</Text>
            <Muted>
              {lockAvailable
                ? "Require fingerprint, face, or device PIN to open Flock."
                : "No biometrics or device PIN enrolled on this phone."}
            </Muted>
          </View>
          <Switch
            value={lockOn}
            onValueChange={toggleLock}
            disabled={!lockAvailable}
            trackColor={{ true: colors.primary }}
          />
        </View>
      </Card>

      <Card>
        <Button
          title={t("bulk.linkFromAdd")}
          onPress={() => nav.navigate("BulkAdd")}
          variant="secondary"
        />
      </Card>

      <Button title={t("auth.signOut")} onPress={confirmSignOut} variant="danger" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  switchRow: { flexDirection: "row", alignItems: "center", gap: space.md },
  rowTitle: { fontSize: font.body, fontWeight: "600", color: colors.text, marginBottom: 2 },
});
