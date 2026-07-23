import type { NavigatorScreenParams } from "@react-navigation/native";

export type TabsParamList = {
  Home: undefined;
  SheepList: undefined;
  Tasks: undefined;
  Finance: undefined;
  History: undefined;
};

export type AppStackParamList = {
  Tabs: NavigatorScreenParams<TabsParamList> | undefined;
  SheepDetail: { id: number };
  SheepForm: { mode: "add" } | { mode: "edit"; id: number };
  BulkAdd: undefined;
  AddHealthNote: { sheepId: number };
  AddWeight: { sheepId: number };
  Weights: { sheepId: number };
  Settings: undefined;
};
