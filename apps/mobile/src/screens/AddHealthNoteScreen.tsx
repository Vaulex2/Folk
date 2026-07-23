import React, { useState } from "react";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { Screen } from "../components/Screen";
import { Button, ErrorText, Field, H1 } from "../components/ui";
import { Select, type SelectOption } from "../components/Select";
import { DateField } from "../components/DateField";
import { useI18n } from "../lib/i18n";
import { addHealthNote } from "../lib/data";
import { HEALTH_STATUSES, validateHealthNote, type HealthStatus } from "../core";
import type { AppStackParamList } from "../navigation/types";
import { space } from "../theme";

type Rt = RouteProp<AppStackParamList, "AddHealthNote">;

export function AddHealthNoteScreen() {
  const { t } = useI18n();
  const nav = useNavigation();
  const { sheepId } = useRoute<Rt>().params;

  const [date, setDate] = useState<string | null>(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<string>("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const statusOptions: SelectOption[] = [
    { value: "", label: t("notes.noChange") },
    ...HEALTH_STATUSES.map((h) => ({ value: h, label: t(`health.${h}` as string) })),
  ];

  async function onSubmit() {
    const result = validateHealthNote({ sheepId, date: date ?? "", status, note: note.trim() });
    if (!result.ok) {
      setError(t(result.error));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await addHealthNote(result.data);
      nav.goBack();
    } catch {
      setError(t("errors.dbError"));
      setBusy(false);
    }
  }

  return (
    <Screen>
      <H1>{t("notes.addNote")}</H1>
      <DateField label={t("notes.date")} value={date} onChange={setDate} />
      <Select label={t("notes.setStatus")} selectedValue={status} options={statusOptions} onValueChange={(v) => setStatus(v as HealthStatus | "")} />
      <Field
        label={t("notes.note")}
        value={note}
        onChangeText={setNote}
        placeholder={t("notes.notePlaceholder")}
        multiline
        numberOfLines={3}
        style={{ minHeight: 90, textAlignVertical: "top" }}
      />
      <ErrorText>{error}</ErrorText>
      <Button title={busy ? t("notes.adding") : t("notes.addNote")} onPress={onSubmit} loading={busy} />
      <Button title={t("form.cancel")} onPress={() => nav.goBack()} variant="ghost" style={{ marginTop: space.sm }} />
    </Screen>
  );
}
