import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import type { TabsParamList } from "./types";
import { useI18n } from "../lib/i18n";
import { colors } from "../theme";
import { HomeScreen } from "../screens/HomeScreen";
import { SheepListScreen } from "../screens/SheepListScreen";
import { TasksScreen } from "../screens/TasksScreen";
import { FinanceScreen } from "../screens/FinanceScreen";
import { HistoryScreen } from "../screens/HistoryScreen";

const Tab = createBottomTabNavigator<TabsParamList>();

const ICON: Record<keyof TabsParamList, keyof typeof Ionicons.glyphMap> = {
  Home: "home-outline",
  SheepList: "list-outline",
  Tasks: "checkbox-outline",
  Finance: "cash-outline",
  History: "archive-outline",
};

export function Tabs() {
  const { t } = useI18n();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={ICON[route.name]} color={color} size={size} />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: t("tabs.home") }} />
      <Tab.Screen name="SheepList" component={SheepListScreen} options={{ tabBarLabel: t("tabs.list") }} />
      <Tab.Screen name="Tasks" component={TasksScreen} options={{ tabBarLabel: t("tabs.tasks") }} />
      <Tab.Screen name="Finance" component={FinanceScreen} options={{ tabBarLabel: t("tabs.finance") }} />
      <Tab.Screen name="History" component={HistoryScreen} options={{ tabBarLabel: t("tabs.history") }} />
    </Tab.Navigator>
  );
}
