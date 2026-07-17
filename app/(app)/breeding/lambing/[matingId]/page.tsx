import { notFound } from "next/navigation";
import { getAllSheep, getMatings } from "@/lib/flock";
import { hasSupabaseConfig } from "@/lib/supabase";
import SetupNotice from "@/components/SetupNotice";
import LambingForm from "./LambingForm";
import { findSheep, fmtDate } from "@/lib/sheep";
import { getServerT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function LambingPage({
  params,
}: {
  params: Promise<{ matingId: string }>;
}) {
  if (!hasSupabaseConfig()) return <SetupNotice />;
  const { matingId } = await params;
  const id = parseInt(matingId, 10);
  const { locale, t } = await getServerT();

  const [all, matings] = await Promise.all([getAllSheep(), getMatings()]);
  const mating = matings.find((m) => m.id === id);
  if (!mating || (mating.status !== "Planned" && mating.status !== "Confirmed")) notFound();

  const ewe = findSheep(all, mating.ewe_id);
  const ram = findSheep(all, mating.ram_id);
  if (!ewe) notFound();

  // Suggest the next free tags in the same "26-NNN" pattern used by /sheep/new.
  const maxId = all.reduce((mx, s) => Math.max(mx, s.id), 0);
  const suggestedTags = Array.from({ length: 6 }, (_, i) => "26-" + String(maxId + 1 + i).padStart(3, "0"));

  return (
    <>
      <div className="pagehead">
        <h1>{t("lambing.title", { tag: ewe.tag })}</h1>
        <p>
          {ewe.tag} × {ram?.tag ?? "—"} · {t("breeding.dueLabel")} {fmtDate(mating.due_date, locale)}
        </p>
      </div>
      <LambingForm matingId={mating.id} suggestedTags={suggestedTags} />
    </>
  );
}
