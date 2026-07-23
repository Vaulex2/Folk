import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSession } from "../lib/session";
import { hasSupabaseConfig } from "../config";
import { LoginScreen } from "../screens/LoginScreen";
import { LockGate } from "./LockGate";
import { Tabs } from "./Tabs";
import type { AppStackParamList } from "./types";
import { SheepDetailScreen } from "../screens/SheepDetailScreen";
import { SheepFormScreen } from "../screens/SheepFormScreen";
import { BulkAddScreen } from "../screens/BulkAddScreen";
import { AddHealthNoteScreen } from "../screens/AddHealthNoteScreen";
import { AddWeightScreen } from "../screens/AddWeightScreen";
import { WeightsScreen } from "../screens/WeightsScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { Loader } from "../components/ui";
import { colors, font, space } from "../theme";

const Stack = createNativeStackNavigator<AppStackParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.bg, primary: colors.primary },
};

const screenHeader = {
  headerStyle: { backgroundColor: colors.bg },
  headerTintColor: colors.text,
  headerTitleStyle: { fontWeight: "700" as const },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.bg },
};

export function RootNavigator() {
  const { session, loading } = useSession();

  if (!hasSupabaseConfig()) return <SetupNotice />;
  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <Loader />
      </SafeAreaView>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      {session ? (
        <LockGate>
          <Stack.Navigator screenOptions={screenHeader}>
            <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
            <Stack.Screen name="SheepDetail" component={SheepDetailScreen} options={{ title: "" }} />
            <Stack.Screen name="SheepForm" component={SheepFormScreen} options={{ title: "" }} />
            <Stack.Screen name="BulkAdd" component={BulkAddScreen} options={{ title: "" }} />
            <Stack.Screen name="AddHealthNote" component={AddHealthNoteScreen} options={{ title: "" }} />
            <Stack.Screen name="AddWeight" component={AddWeightScreen} options={{ title: "" }} />
            <Stack.Screen name="Weights" component={WeightsScreen} options={{ title: "" }} />
            <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: "" }} />
          </Stack.Navigator>
        </LockGate>
      ) : (
        <LoginScreen />
      )}
    </NavigationContainer>
  );
}

function SetupNotice() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.setup}>
        <Text style={styles.setupEmoji}>⚙️</Text>
        <Text style={styles.setupTitle}>Finish setup</Text>
        <Text style={styles.setupBody}>
          Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in apps/mobile/.env, then
          restart the dev server. See apps/mobile/README.md.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  setup: { flex: 1, alignItems: "center", justifyContent: "center", padding: space.xl, gap: space.md },
  setupEmoji: { fontSize: 44 },
  setupTitle: { fontSize: font.h2, fontWeight: "700", color: colors.text },
  setupBody: { fontSize: font.body, color: colors.textMuted, textAlign: "center", lineHeight: 22 },
});
