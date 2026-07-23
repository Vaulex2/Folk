import React, { useMemo, useState } from "react";
import { Alert } from "react-native";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Screen } from "../components/Screen";
import { Button, ErrorText, Field, H1, Muted, Segmented } from "../components/ui";
import { Select, type SelectOption } from "../components/Select";
import { DateField } from "../components/DateField";
import { useI18n } from "../lib/i18n";
import { useAsync } from "../lib/useAsync";
import { fetchFlock, fetchSheep, insertSheep, tagExists, updateSheep } from "../lib/data";
import {
  BREEDS,
  COLORS,
  HEALTH_STATUSES,
  parentOptions,
  validateSheepInput,
  type HealthStatus,
  type Sex,
} from "../core";
import type { AppStackParamList } from "../navigation/types";
import { space } from "../theme";

type Nav = NativeStackNavigationProp<AppStackParamList>;
type Rt = RouteProp<AppStackParamList, "SheepForm">;

export function SheepFormScreen() {
  const { t, locale } = useI18n();
  const nav = useNavigation<Nav>();
  const params = useRoute<Rt>().params;
  const editId = params.mode === "edit" ? params.id : undefined;
  const today = new Date();

  const { data, loading } = useAsync(async () => {
    const flock = await fetchFlock();
    const sheep = editId != null ? await fetchSheep(editId) : null;
    return { flock, sheep };
  }, [editId]);

  // Form state, seeded once from the fetched record.
  const [seeded, setSeeded] = useState(false);
  const [tag, setTag] = useState("");
  const [sex, setSex] = useState<Sex>("Ewe");
  const [birth, setBirth] = useState<string | null>(null);
  const [weight, setWeight] = useState("");
  const [breed, setBreed] = useState("");
  const [color, setColor] = useState("");
  const [motherId, setMotherId] = useState("");
  const [fatherId, setFatherId] = useState("");
  const [health, setHealth] = useState<HealthStatus>("Healthy");
  const [vaccinationDate, setVaccinationDate] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [purchasePrice, setPurchasePrice] = useState("");
  const [purchaseDate, setPurchaseDate] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const s = data?.sheep;
  if (s && !seeded) {
    setTag(s.tag);
    setSex(s.sex);
    setBirth(s.birth);
    setWeight(String(s.weight ?? ""));
    setBreed(s.breed ?? "");
    setColor(s.color ?? "");
    setMotherId(s.mother_id ? String(s.mother_id) : "");
    setFatherId(s.father_id ? String(s.father_id) : "");
    setHealth(s.health);
    setVaccinationDate(s.vaccination_date);
    setDueDate(s.due_date);
    setPurchasePrice(s.purchase_price != null ? String(s.purchase_price) : "");
    setPurchaseDate(s.purchase_date);
    setSeeded(true);
  }

  const flock = data?.flock ?? [];
  const ewes = useMemo(() => flock.filter((x) => x.sex === "Ewe"), [flock]);
  const rams = useMemo(() => flock.filter((x) => x.sex === "Ram"), [flock]);

  const noneOpt: SelectOption = { value: "", label: t("form.none") };
  const damOptions = [noneOpt, ...parentOptions(ewes, today, locale, editId)];
  const sireOptions = [noneOpt, ...parentOptions(rams, today, locale, editId)];
  const breedOptions: SelectOption[] = [noneOpt, ...BREEDS.map((b) => ({ value: b, label: b }))];
  const colorOptions: SelectOption[] = [
    noneOpt,
    ...COLORS.map((c) => ({ value: c, label: (t(`colors.${c}` as string) as string) || c })),
  ];
  const healthOptions: SelectOption[] = HEALTH_STATUSES.map((h) => ({ value: h, label: t(`health.${h}` as string) }));

  async function onSubmit() {
    const result = validateSheepInput({
      tag: tag.trim(),
      sex,
      birth: birth ?? "",
      weight,
      breed,
      color,
      mother_id: motherId,
      father_id: fatherId,
      health,
      vaccination_date: vaccinationDate ?? "",
      due_date: dueDate ?? "",
      purchase_price: purchasePrice,
      purchase_date: purchaseDate ?? "",
    });
    if (!result.ok) {
      setError(t(result.error));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (await tagExists(result.data.tag, editId)) {
        setError(t("form.errTagInUse"));
        setBusy(false);
        return;
      }
      if (editId != null) await updateSheep(editId, result.data);
      else await insertSheep(result.data);
      nav.goBack();
    } catch {
      setError(t("errors.dbError"));
      setBusy(false);
    }
  }

  if (editId != null && loading && !seeded) {
    return <Screen><Muted>…</Muted></Screen>;
  }

  return (
    <Screen>
      <H1>{editId != null ? t("form.editTitle", { tag }) : t("form.addTitle")}</H1>
      <Muted style={{ marginBottom: space.md }}>{editId != null ? t("form.editSub") : t("form.addSub")}</Muted>

      <Field label={t("form.tagNumber")} value={tag} onChangeText={setTag} autoCapitalize="characters" />
      <Segmented
        label={t("form.sex")}
        value={sex}
        onChange={setSex}
        options={[
          { value: "Ewe", label: t("form.ewe") },
          { value: "Ram", label: t("form.ram") },
        ]}
      />
      <DateField label={t("form.dob")} value={birth} onChange={setBirth} />
      <Field label={t("form.weightKg")} value={weight} onChangeText={setWeight} keyboardType="numeric" placeholder={t("form.weightPlaceholder")} />
      <Select label={t("form.breed")} selectedValue={breed} options={breedOptions} onValueChange={setBreed} />
      <Select label={t("form.colourMarkings")} selectedValue={color} options={colorOptions} onValueChange={setColor} />
      <Select label={t("form.dam")} selectedValue={motherId} options={damOptions} onValueChange={setMotherId} />
      <Select label={t("form.sire")} selectedValue={fatherId} options={sireOptions} onValueChange={setFatherId} />
      <Select label={t("form.healthStatus")} selectedValue={health} options={healthOptions} onValueChange={(v) => setHealth(v as HealthStatus)} />
      <DateField label={t("form.nextVaccination")} value={vaccinationDate} onChange={setVaccinationDate} optional />
      {health === "Pregnant" ? (
        <DateField label={t("form.lambingDue")} value={dueDate} onChange={setDueDate} optional />
      ) : null}
      <Field label={t("money.purchasePrice")} value={purchasePrice} onChangeText={setPurchasePrice} keyboardType="numeric" placeholder={t("money.pricePlaceholder")} />
      {purchasePrice ? <DateField label={t("money.purchaseDate")} value={purchaseDate} onChange={setPurchaseDate} optional /> : null}

      <ErrorText>{error}</ErrorText>
      <Button
        title={busy ? t("form.saving") : editId != null ? t("form.saveChanges") : t("form.saveSheep")}
        onPress={onSubmit}
        loading={busy}
      />
      <Button title={t("form.cancel")} onPress={() => nav.goBack()} variant="ghost" style={{ marginTop: space.sm }} />
    </Screen>
  );
}
