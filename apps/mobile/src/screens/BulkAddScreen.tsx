import React, { useState } from "react";
import { Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Screen } from "../components/Screen";
import { Button, ErrorText, Field, H1, Muted, Segmented } from "../components/ui";
import { Select, type SelectOption } from "../components/Select";
import { DateField } from "../components/DateField";
import { useI18n } from "../lib/i18n";
import { bulkInsertSheep, tagExists } from "../lib/data";
import { BREEDS, COLORS, HEALTH_STATUSES, validateBulkAdd, type HealthStatus, type Sex } from "../core";
import { space } from "../theme";

export function BulkAddScreen() {
  const { t } = useI18n();
  const nav = useNavigation();

  const [count, setCount] = useState("");
  const [sex, setSex] = useState<Sex>("Ewe");
  const [breed, setBreed] = useState("");
  const [color, setColor] = useState("");
  const [avgAge, setAvgAge] = useState("");
  const [avgWeight, setAvgWeight] = useState("");
  const [price, setPrice] = useState("");
  const [purchaseDate, setPurchaseDate] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthStatus>("Healthy");
  const [startTag, setStartTag] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const noneOpt: SelectOption = { value: "", label: t("form.none") };
  const breedOptions = [noneOpt, ...BREEDS.map((b) => ({ value: b, label: b }))];
  const colorOptions = [noneOpt, ...COLORS.map((c) => ({ value: c, label: t(`colors.${c}` as string) || c }))];
  const healthOptions = HEALTH_STATUSES.map((h) => ({ value: h, label: t(`health.${h}` as string) }));

  async function onSubmit() {
    const result = validateBulkAdd({
      count,
      sex,
      breed,
      color,
      avgAge,
      avgWeight,
      price,
      purchaseDate: purchaseDate ?? "",
      health,
      dueDate: "",
      startTag,
    });
    if (!result.ok) {
      setError(t(result.error));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // Guard against colliding tags before inserting the whole batch.
      const first = result.data.start_num;
      const last = first + result.data.count - 1;
      for (let n = first; n <= last; n++) {
        if (await tagExists(String(n))) {
          setError(t("form.errTagInUse"));
          setBusy(false);
          return;
        }
      }
      const added = await bulkInsertSheep(result.data);
      Alert.alert(t("bulk.title"), `+${added}`);
      nav.goBack();
    } catch {
      setError(t("errors.dbError"));
      setBusy(false);
    }
  }

  return (
    <Screen>
      <H1>{t("bulk.title")}</H1>
      <Muted style={{ marginBottom: space.md }}>{t("bulk.subtitle")}</Muted>

      <Field label={t("bulk.count")} value={count} onChangeText={setCount} keyboardType="numeric" placeholder={t("bulk.countPlaceholder")} />
      <Segmented
        label={t("form.sex")}
        value={sex}
        onChange={setSex}
        options={[
          { value: "Ewe", label: t("form.ewe") },
          { value: "Ram", label: t("form.ram") },
        ]}
      />
      <Select label={t("form.breed")} selectedValue={breed} options={breedOptions} onValueChange={setBreed} />
      <Select label={t("form.colourMarkings")} selectedValue={color} options={colorOptions} onValueChange={setColor} />
      <Field label={t("bulk.avgAge")} value={avgAge} onChangeText={setAvgAge} keyboardType="numeric" placeholder={t("bulk.agePlaceholder")} />
      <Field label={t("bulk.avgWeight")} value={avgWeight} onChangeText={setAvgWeight} keyboardType="numeric" />
      <Select label={t("form.healthStatus")} selectedValue={health} options={healthOptions} onValueChange={(v) => setHealth(v as HealthStatus)} />
      <Field label={t("bulk.pricePerHead")} value={price} onChangeText={setPrice} keyboardType="numeric" placeholder={t("money.pricePlaceholder")} />
      {price ? <DateField label={t("money.purchaseDate")} value={purchaseDate} onChange={setPurchaseDate} optional /> : null}
      <Field label={t("bulk.startTag")} value={startTag} onChangeText={setStartTag} keyboardType="numeric" hint={t("bulk.startTagHint")} />

      <ErrorText>{error}</ErrorText>
      <Button title={busy ? t("bulk.adding") : t("bulk.submit")} onPress={onSubmit} loading={busy} />
      <Button title={t("form.cancel")} onPress={() => nav.goBack()} variant="ghost" style={{ marginTop: space.sm }} />
    </Screen>
  );
}
