import React, { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Screen } from "../components/Screen";
import { Button, Card, EmptyState, Field, H1, H2, Loader, Muted } from "../components/ui";
import { DateField } from "../components/DateField";
import { Select, type SelectOption } from "../components/Select";
import { Ionicons } from "@expo/vector-icons";
import { useI18n } from "../lib/i18n";
import { useAsync } from "../lib/useAsync";
import { addTransaction, deleteTransaction, fetchFlock, fetchTransactions } from "../lib/data";
import {
  buildLedger,
  byTag,
  categoryTotals,
  filterYear,
  fmtMoney,
  ledgerTotals,
  ledgerYears,
  sheepProfitability,
  TX_CATEGORIES,
  validateTransaction,
  type LedgerEntry,
  type Sheep,
} from "../core";
import { colors, font, radius, space } from "../theme";

export function FinanceScreen() {
  const { t, locale } = useI18n();
  const currentYear = new Date().getFullYear();

  const { data, loading, reload } = useAsync(async () => {
    const [transactions, flock] = await Promise.all([fetchTransactions(), fetchFlock()]);
    return { transactions, flock };
  }, []);

  const [year, setYear] = useState(currentYear);
  const [category, setCategory] = useState<string>(TX_CATEGORIES[0]);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState<string | null>(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [sheepId, setSheepId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const transactions = data?.transactions ?? [];
  const flock = data?.flock ?? [];

  const ledger = useMemo(() => buildLedger(transactions, flock), [transactions, flock]);
  const years = useMemo(() => ledgerYears(ledger, currentYear), [ledger, currentYear]);
  const yearEntries = useMemo(() => filterYear(ledger, year), [ledger, year]);
  const totals = useMemo(() => ledgerTotals(yearEntries), [yearEntries]);
  const cats = useMemo(() => categoryTotals(yearEntries), [yearEntries]);
  const profit = useMemo(() => sheepProfitability(transactions, flock), [transactions, flock]);

  const cur = t("money.currency");
  const tagOf = (id: number | null) => (id != null ? flock.find((s) => s.id === id)?.tag : undefined);

  const catOptions: SelectOption[] = TX_CATEGORIES.map((c) => ({ value: c, label: t(`finance.cat.${c}` as string) }));
  const sheepOptions: SelectOption[] = [
    { value: "", label: t("form.none") },
    ...[...flock].filter((s) => s.status === "Active").sort(byTag).map((s: Sheep) => ({ value: String(s.id), label: s.tag })),
  ];
  const yearOptions: SelectOption[] = years.map((y) => ({ value: String(y), label: String(y) }));

  async function onAdd() {
    const result = validateTransaction({ category, amount, date: date ?? "", note: note.trim(), sheepId });
    if (!result.ok) {
      setError(t(result.error));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await addTransaction(result.data);
      setAmount("");
      setNote("");
      setSheepId("");
      reload();
    } catch {
      setError(t("errors.dbError"));
    } finally {
      setBusy(false);
    }
  }

  function confirmDelete(entry: LedgerEntry) {
    if (entry.txId == null) return;
    Alert.alert(t("finance.delete"), "", [
      { text: t("form.cancel"), style: "cancel" },
      {
        text: t("finance.delete"),
        style: "destructive",
        onPress: async () => {
          await deleteTransaction(entry.txId!);
          reload();
        },
      },
    ]);
  }

  if (loading && !data) return <Loader />;

  const incomeCats = cats.filter((c) => c.type === "income");
  const expenseCats = cats.filter((c) => c.type === "expense");

  return (
    <Screen refreshing={loading} onRefresh={reload}>
      <H1>{t("finance.title")}</H1>
      <Muted>{t("finance.subtitle")}</Muted>

      {years.length > 1 ? (
        <Select selectedValue={String(year)} options={yearOptions} onValueChange={(v) => setYear(Number(v))} />
      ) : null}

      <View style={styles.totals}>
        <Totem label={t("finance.income")} value={`${fmtMoney(totals.income)}`} color={colors.income} />
        <Totem label={t("finance.expenses")} value={`${fmtMoney(totals.expense)}`} color={colors.expense} />
        <Totem label={t("finance.net")} value={`${fmtMoney(totals.net)}`} color={totals.net >= 0 ? colors.income : colors.expense} />
      </View>
      <Muted>{cur}</Muted>

      <Card>
        <H2>{t("finance.addEntry")}</H2>
        <View style={{ height: space.sm }} />
        <Select label={t("finance.category")} selectedValue={category} options={catOptions} onValueChange={setCategory} />
        <Field label={t("finance.amount")} value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder={t("money.pricePlaceholder")} />
        <DateField label={t("finance.date")} value={date} onChange={setDate} />
        <Field label={t("finance.noteLabel")} value={note} onChangeText={setNote} placeholder={t("finance.notePlaceholder")} />
        <Select label={t("finance.sheepOptional")} selectedValue={sheepId} options={sheepOptions} onValueChange={setSheepId} />
        {error ? <Muted style={{ color: colors.danger, marginBottom: space.sm }}>{error}</Muted> : null}
        <Button title={busy ? t("finance.adding") : t("finance.addEntry")} onPress={onAdd} loading={busy} />
      </Card>

      <Card>
        <View style={styles.head}>
          <H2>{t("finance.entriesTitle")}</H2>
          <Muted>{t("finance.entriesCount", { count: yearEntries.length })}</Muted>
        </View>
        {yearEntries.length === 0 ? (
          <EmptyState text={t("finance.emptyEntries")} />
        ) : (
          yearEntries.map((e) => (
            <View key={e.key} style={styles.entry}>
              <View style={{ flex: 1 }}>
                <Text style={styles.entryCat}>{t(`finance.cat.${e.category}` as string)}</Text>
                <Text style={styles.entryMeta}>
                  {e.note || (e.source !== "tx" ? t("finance.autoEntry") : "")}
                  {tagOf(e.sheepId) ? ` · ${tagOf(e.sheepId)}` : ""}
                </Text>
              </View>
              <Text style={[styles.amount, { color: e.type === "income" ? colors.income : colors.expense }]}>
                {e.type === "income" ? "+" : "−"}
                {fmtMoney(e.amount)}
              </Text>
              {e.txId != null ? (
                <Pressable onPress={() => confirmDelete(e)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={16} color={colors.textFaint} />
                </Pressable>
              ) : (
                <View style={{ width: 16 }} />
              )}
            </View>
          ))
        )}
      </Card>

      {expenseCats.length > 0 ? (
        <Card>
          <H2>{t("finance.expenseByCat")}</H2>
          <View style={{ height: space.sm }} />
          {expenseCats.map((c) => (
            <CatRow key={c.category} label={t(`finance.cat.${c.category}` as string)} total={`${fmtMoney(c.total)} ${cur}`} count={c.count} />
          ))}
        </Card>
      ) : null}

      {incomeCats.length > 0 ? (
        <Card>
          <H2>{t("finance.incomeByCat")}</H2>
          <View style={{ height: space.sm }} />
          {incomeCats.map((c) => (
            <CatRow key={c.category} label={t(`finance.cat.${c.category}` as string)} total={`${fmtMoney(c.total)} ${cur}`} count={c.count} />
          ))}
        </Card>
      ) : null}

      {profit.length > 0 ? (
        <Card>
          <H2>{t("finance.profitTitle")}</H2>
          <Muted style={{ marginBottom: space.sm }}>{t("finance.profitSub")}</Muted>
          {profit.map((p) => (
            <View key={p.sheepId} style={styles.entry}>
              <View style={{ flex: 1 }}>
                <Text style={styles.entryCat}>{tagOf(p.sheepId) ?? p.sheepId}</Text>
                <Text style={styles.entryMeta}>
                  {t("finance.profitMeta", { spent: fmtMoney(p.purchase + p.expenses), earned: fmtMoney((p.sale ?? 0) + p.extraIncome) })}
                  {p.sold ? "" : ` · ${t("finance.notSoldYet")}`}
                </Text>
              </View>
              <Text style={[styles.amount, { color: p.net >= 0 ? colors.income : colors.expense }]}>
                {p.net >= 0 ? "+" : "−"}
                {fmtMoney(Math.abs(p.net))}
              </Text>
            </View>
          ))}
          <Muted style={{ marginTop: space.sm }}>{t("finance.overheadHint")}</Muted>
        </Card>
      ) : null}
    </Screen>
  );
}

function Totem({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.totem}>
      <Text style={styles.totemLabel}>{label}</Text>
      <Text style={[styles.totemValue, { color }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

function CatRow({ label, total, count }: { label: string; total: string; count: number }) {
  return (
    <View style={styles.catRow}>
      <Text style={styles.catLabel}>{label}</Text>
      <Text style={styles.catCount}>×{count}</Text>
      <Text style={styles.catTotal}>{total}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  totals: { flexDirection: "row", gap: space.sm, marginTop: space.sm },
  totem: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: space.md },
  totemLabel: { fontSize: font.tiny, color: colors.textMuted, fontWeight: "700", textTransform: "uppercase" },
  totemValue: { fontSize: font.h3, fontWeight: "700", marginTop: 2 },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: space.sm },
  entry: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.md, borderTopWidth: 1, borderTopColor: colors.border },
  entryCat: { fontSize: font.body, fontWeight: "600", color: colors.text },
  entryMeta: { fontSize: font.tiny, color: colors.textMuted, marginTop: 2 },
  amount: { fontSize: font.body, fontWeight: "700" },
  catRow: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.sm },
  catLabel: { flex: 1, fontSize: font.small, color: colors.text },
  catCount: { fontSize: font.tiny, color: colors.textFaint },
  catTotal: { fontSize: font.small, fontWeight: "700", color: colors.text },
});
