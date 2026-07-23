import React, { useState } from "react";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { Screen } from "../components/Screen";
import { Button, ErrorText, Field, H1 } from "../components/ui";
import { DateField } from "../components/DateField";
import { useI18n } from "../lib/i18n";
import { addWeight } from "../lib/data";
import { validateWeightRecord } from "../core";
import type { AppStackParamList } from "../navigation/types";
import { space } from "../theme";

type Rt = RouteProp<AppStackParamList, "AddWeight">;

export function AddWeightScreen() {
  const { t } = useI18n();
  const nav = useNavigation();
  const { sheepId } = useRoute<Rt>().params;

  const [date, setDate] = useState<string | null>(new Date().toISOString().slice(0, 10));
  const [weight, setWeight] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    const result = validateWeightRecord({ sheepId, date: date ?? "", weightKg: Number(weight) });
    if (!result.ok) {
      setError(t(result.error));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await addWeight(result.data);
      nav.goBack();
    } catch {
      setError(t("errors.dbError"));
      setBusy(false);
    }
  }

  return (
    <Screen>
      <H1>{t("weights.addWeight")}</H1>
      <DateField label={t("weights.date")} value={date} onChange={setDate} />
      <Field label={t("weights.weightKg")} value={weight} onChangeText={setWeight} keyboardType="numeric" />
      <ErrorText>{error}</ErrorText>
      <Button title={busy ? t("weights.adding") : t("weights.addWeight")} onPress={onSubmit} loading={busy} />
      <Button title={t("form.cancel")} onPress={() => nav.goBack()} variant="ghost" style={{ marginTop: space.sm }} />
    </Screen>
  );
}
