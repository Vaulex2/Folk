import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { authenticate, isLockAvailable, isLockEnabled } from "../lib/appLock";
import { Button } from "../components/ui";
import { colors, font, space } from "../theme";
import { config } from "../config";

// Gates children behind biometric/device-PIN auth when the user has enabled the
// app-lock. Re-locks whenever the app returns to the foreground from background.
export function LockGate({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const [checked, setChecked] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const appState = useRef(AppState.currentState);

  const attempt = useCallback(async () => {
    const ok = await authenticate();
    setUnlocked(ok);
  }, []);

  useEffect(() => {
    (async () => {
      const on = (await isLockEnabled()) && (await isLockAvailable());
      setEnabled(on);
      setChecked(true);
      if (on) attempt();
      else setUnlocked(true);
    })();
  }, [attempt]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      const prev = appState.current;
      appState.current = next;
      if (enabled && prev.match(/inactive|background/) && next === "active") {
        setUnlocked(false);
        attempt();
      }
    });
    return () => sub.remove();
  }, [enabled, attempt]);

  if (!checked) return <View style={styles.blank} />;
  if (!enabled || unlocked) return <>{children}</>;

  return (
    <SafeAreaView style={styles.gate}>
      <View style={styles.center}>
        <Text style={styles.emoji}>🔒</Text>
        <Text style={styles.title}>{config.flockName} is locked</Text>
        <Text style={styles.sub}>Unlock with your fingerprint, face, or device PIN.</Text>
        <Button title="Unlock" onPress={attempt} style={styles.btn} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  blank: { flex: 1, backgroundColor: colors.bg },
  gate: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: space.xl, gap: space.md },
  emoji: { fontSize: 48 },
  title: { fontSize: font.h2, fontWeight: "700", color: colors.text },
  sub: { fontSize: font.small, color: colors.textMuted, textAlign: "center" },
  btn: { marginTop: space.lg, minWidth: 200 },
});
