import { getActiveSheep, getAllSheep, getMatings } from "@/lib/flock";
import { hasSupabaseConfig } from "@/lib/supabase";
import SetupNotice from "@/components/SetupNotice";
import BreedingCheckClient from "./BreedingCheckClient";
import MatingsList, { type MatingRow } from "./MatingsList";
import { parentOptions } from "@/lib/options";
import { getLocale } from "@/lib/i18n/server";
import { findSheep, fmtDate } from "@/lib/sheep";

export const dynamic = "force-dynamic";

export default async function BreedingPage() {
  if (!hasSupabaseConfig()) return <SetupNotice />;
  const locale = await getLocale();
  const today = new Date();
  const [active, all, matings] = await Promise.all([
    getActiveSheep(),
    getAllSheep(),
    getMatings(),
  ]);
  const ewes = active.filter((s) => s.sex === "Ewe");
  const rams = active.filter((s) => s.sex === "Ram");

  const rows: MatingRow[] = matings.map((m) => ({
    id: m.id,
    status: m.status,
    eweId: m.ewe_id,
    eweTag: findSheep(all, m.ewe_id)?.tag ?? "?",
    ramTag: findSheep(all, m.ram_id)?.tag ?? "?",
    matingDateLabel: fmtDate(m.mating_date, locale),
    dueDateLabel: fmtDate(m.due_date, locale),
  }));

  return (
    <>
      <BreedingCheckClient
        flock={all}
        eweOptions={parentOptions(ewes, today, locale)}
        ramOptions={parentOptions(rams, today, locale)}
      />
      <MatingsList rows={rows} />
    </>
  );
}
