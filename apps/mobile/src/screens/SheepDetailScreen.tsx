import React, { useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Screen } from "../components/Screen";
import { Button, Card, Divider, EmptyState, Field, H1, H2, Loader, Muted } from "../components/ui";
import { DateField } from "../components/DateField";
import { HealthPill } from "../components/HealthPill";
import { useI18n } from "../lib/i18n";
import { useAsync } from "../lib/useAsync";
import {
  fetchFlock,
  fetchHealthNotes,
  fetchSheep,
  markDied,
  markSold,
  restoreSheep,
  setSheepPhoto,
  uploadSheepPhoto,
} from "../lib/data";
import { fmtDate, fmtMoney, offspringOf, parsePrice, view } from "../core";
import type { AppStackParamList } from "../navigation/types";
import { colors, font, radius, space } from "../theme";

type Nav = NativeStackNavigationProp<AppStackParamList>;
type Rt = RouteProp<AppStackParamList, "SheepDetail">;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function SheepDetailScreen() {
  const { t, locale } = useI18n();
  const nav = useNavigation<Nav>();
  const { id } = useRoute<Rt>().params;
  const today = new Date();

  const { data, loading, reload } = useAsync(async () => {
    const [sheep, flock, notes] = await Promise.all([
      fetchSheep(id),
      fetchFlock(),
      fetchHealthNotes(id),
    ]);
    return { sheep, flock, notes };
  }, [id]);

  const [uploading, setUploading] = useState(false);
  // Shown immediately from the locally-picked file, before the upload round
  // trip resolves — swapping this in avoids waiting on a full reload() (which
  // would otherwise re-fetch the whole flock) just to reflect a photo change.
  const [photoOverride, setPhotoOverride] = useState<string | null>(null);
  const [saleOpen, setSaleOpen] = useState(false);
  const [salePrice, setSalePrice] = useState("");
  const [saleDate, setSaleDate] = useState<string | null>(todayIso());

  if (loading && !data) return <Loader />;
  const sheep = data?.sheep;
  if (!sheep) return <Screen><EmptyState text={t("errors.notFoundBody")} /></Screen>;

  const flock = data?.flock ?? [];
  const notes = data?.notes ?? [];
  const v = view(sheep, today, locale);
  const dam = sheep.mother_id ? flock.find((s) => s.id === sheep.mother_id) : undefined;
  const sire = sheep.father_id ? flock.find((s) => s.id === sheep.father_id) : undefined;
  const offspring = offspringOf(flock, sheep.id);

  async function pickPhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
    if (res.canceled || !res.assets[0]) return;
    const localUri = res.assets[0].uri;
    setPhotoOverride(localUri);
    setUploading(true);
    try {
      const url = await uploadSheepPhoto(id, localUri);
      await setSheepPhoto(id, url);
      setPhotoOverride(url);
    } catch {
      setPhotoOverride(null);
      Alert.alert(t("photo.errUpload"));
    } finally {
      setUploading(false);
    }
  }

  async function confirmSale() {
    const price = parsePrice(salePrice);
    if (price.invalid) {
      Alert.alert(t("money.errPrice"));
      return;
    }
    await markSold(id, price.value, saleDate ?? todayIso());
    setSaleOpen(false);
    reload();
  }

  function confirmDied() {
    Alert.alert(t("detail.markDied"), "", [
      { text: t("form.cancel"), style: "cancel" },
      {
        text: t("detail.markDied"),
        style: "destructive",
        onPress: async () => {
          await markDied(id, todayIso());
          reload();
        },
      },
    ]);
  }

  return (
    <Screen refreshing={loading} onRefresh={reload}>
      <View style={styles.topRow}>
        {photoOverride ?? sheep.photo_url ? (
          <Image source={{ uri: photoOverride ?? sheep.photo_url! }} style={styles.photo} alt={sheep.tag} />
        ) : (
          <View style={[styles.photo, styles.photoEmpty]}>
            <Text style={styles.photoInitial}>{sheep.tag.slice(0, 3)}</Text>
          </View>
        )}
        <View style={styles.headInfo}>
          <H1>{sheep.tag}</H1>
          <Text style={styles.sub}>{v.sexWithLamb}</Text>
          <View style={{ marginTop: space.xs }}>
            <HealthPill status={v.health} label={v.healthLabel} />
          </View>
        </View>
      </View>

      <View style={styles.photoActions}>
        <Button
          title={uploading ? t("photo.uploading") : photoOverride ?? sheep.photo_url ? t("photo.change") : t("photo.add")}
          onPress={pickPhoto}
          variant="secondary"
          loading={uploading}
          style={{ flex: 1 }}
        />
        <Button
          title={t("detail.edit")}
          onPress={() => nav.navigate("SheepForm", { mode: "edit", id })}
          variant="secondary"
          style={{ flex: 1 }}
        />
      </View>

      <Card>
        <View style={styles.facts}>
          <Fact label={t("detail.factSex")} value={v.sexLabel} />
          <Fact label={t("detail.factAge")} value={v.ageLabel} />
          <Fact label={t("detail.factBorn")} value={v.birthLabel} />
          <Fact label={t("detail.factBreed")} value={sheep.breed || t("detail.notRecorded")} />
          <Fact label={t("detail.factColour")} value={sheep.color || t("detail.notRecorded")} />
          <Fact label={t("detail.factWeight")} value={v.weight} />
        </View>
      </Card>

      <Card>
        <H2>{t("detail.parents")}</H2>
        <Divider />
        <ParentRow label={t("detail.damMother")} sheep={dam} onPress={dam ? () => nav.navigate("SheepDetail", { id: dam.id }) : undefined} notRecorded={t("detail.notRecorded")} />
        <ParentRow label={t("detail.sireFather")} sheep={sire} onPress={sire ? () => nav.navigate("SheepDetail", { id: sire.id }) : undefined} notRecorded={t("detail.notRecorded")} />
      </Card>

      <Card>
        <H2>{t("detail.offspring")}</H2>
        <Divider />
        {offspring.length === 0 ? (
          <Muted>{t("detail.noOffspring")}</Muted>
        ) : (
          offspring.map((o) => (
            <Pressable key={o.id} style={styles.linkRow} onPress={() => nav.navigate("SheepDetail", { id: o.id })}>
              <Text style={styles.linkTag}>{o.tag}</Text>
              <Text style={styles.linkMeta}>{view(o, today, locale).metaShort}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
            </Pressable>
          ))
        )}
      </Card>

      <Card>
        <View style={styles.cardHead}>
          <H2>{t("detail.healthHistory")}</H2>
          <Pressable style={styles.smallBtn} onPress={() => nav.navigate("AddHealthNote", { sheepId: id })}>
            <Ionicons name="add" size={16} color={colors.primary} />
            <Text style={styles.smallBtnText}>{t("notes.addNote")}</Text>
          </Pressable>
        </View>
        <Divider />
        {notes.length === 0 ? (
          <Muted>{t("detail.noNotes")}</Muted>
        ) : (
          notes.map((n) => (
            <View key={n.id} style={styles.noteRow}>
              <Text style={styles.noteDate}>{fmtDate(n.date, locale)}</Text>
              <View style={{ flex: 1 }}>
                {n.status ? <Text style={styles.noteStatus}>{t(`health.${n.status}` as string)}</Text> : null}
                <Text style={styles.noteText}>{n.note}</Text>
              </View>
            </View>
          ))
        )}
      </Card>

      <Button title={t("weights.title")} onPress={() => nav.navigate("Weights", { sheepId: id })} variant="secondary" />

      {/* Status actions */}
      <Card>
        {sheep.status === "Active" ? (
          saleOpen ? (
            <View>
              <H2>{t("detail.markSold")}</H2>
              <Divider />
              <Field
                label={t("money.salePricePrompt")}
                value={salePrice}
                onChangeText={setSalePrice}
                keyboardType="numeric"
                placeholder={t("money.pricePlaceholder")}
              />
              <DateField label={t("money.saleDate")} value={saleDate} onChange={setSaleDate} />
              <View style={styles.actionRow}>
                <Button title={t("form.cancel")} onPress={() => setSaleOpen(false)} variant="ghost" style={{ flex: 1 }} />
                <Button title={t("money.confirmSale")} onPress={confirmSale} style={{ flex: 1 }} />
              </View>
            </View>
          ) : (
            <View style={styles.actionRow}>
              <Button title={t("detail.markSold")} onPress={() => setSaleOpen(true)} variant="secondary" style={{ flex: 1 }} />
              <Button title={t("detail.markDied")} onPress={confirmDied} variant="danger" style={{ flex: 1 }} />
            </View>
          )
        ) : (
          <View>
            <Muted>
              {sheep.status === "Sold"
                ? `${t("status.Sold")}${sheep.sale_price != null ? ` · ${fmtMoney(sheep.sale_price)} ${t("money.currency")}` : ""}`
                : t("status.Died")}
            </Muted>
            <View style={{ height: space.md }} />
            <Button
              title={t("detail.restore")}
              onPress={async () => {
                await restoreSheep(id);
                reload();
              }}
              variant="secondary"
            />
          </View>
        )}
      </Card>
    </Screen>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
    </View>
  );
}

function ParentRow({
  label,
  sheep,
  onPress,
  notRecorded,
}: {
  label: string;
  sheep?: { tag: string };
  onPress?: () => void;
  notRecorded: string;
}) {
  return (
    <Pressable style={styles.linkRow} onPress={onPress} disabled={!sheep}>
      <Text style={styles.parentLabel}>{label}</Text>
      <Text style={[styles.linkTag, !sheep && styles.faint]}>{sheep ? sheep.tag : notRecorded}</Text>
      {sheep ? <Ionicons name="chevron-forward" size={16} color={colors.textFaint} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: "row", gap: space.lg, alignItems: "center" },
  photo: { width: 96, height: 96, borderRadius: radius.lg, backgroundColor: colors.surfaceAlt },
  photoEmpty: { alignItems: "center", justifyContent: "center", backgroundColor: colors.primarySoft },
  photoInitial: { fontSize: 30, fontWeight: "700", color: colors.primaryDark },
  headInfo: { flex: 1 },
  sub: { fontSize: font.body, color: colors.textMuted, marginTop: 2 },
  photoActions: { flexDirection: "row", gap: space.md },
  facts: { flexDirection: "row", flexWrap: "wrap" },
  fact: { width: "50%", paddingVertical: space.sm },
  factLabel: { fontSize: font.tiny, color: colors.textFaint, textTransform: "uppercase", letterSpacing: 0.4 },
  factValue: { fontSize: font.body, color: colors.text, fontWeight: "600", marginTop: 2 },
  cardHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  smallBtn: { flexDirection: "row", alignItems: "center", gap: 2 },
  smallBtnText: { color: colors.primary, fontWeight: "600", fontSize: font.small },
  linkRow: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.md, borderTopWidth: 1, borderTopColor: colors.border },
  linkTag: { fontSize: font.body, fontWeight: "700", color: colors.text },
  linkMeta: { flex: 1, fontSize: font.small, color: colors.textMuted },
  parentLabel: { flex: 1, fontSize: font.small, color: colors.textMuted },
  faint: { color: colors.textFaint, fontWeight: "400" },
  noteRow: { flexDirection: "row", gap: space.md, paddingVertical: space.md, borderTopWidth: 1, borderTopColor: colors.border },
  noteDate: { fontSize: font.tiny, color: colors.textFaint, width: 64 },
  noteStatus: { fontSize: font.tiny, color: colors.primary, fontWeight: "700", marginBottom: 2 },
  noteText: { fontSize: font.small, color: colors.text },
  actionRow: { flexDirection: "row", gap: space.md },
});
