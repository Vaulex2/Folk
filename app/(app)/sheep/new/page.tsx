import { getActiveSheep, getAllSheep } from "@/lib/flock";
import { hasSupabaseConfig } from "@/lib/supabase";
import SetupNotice from "@/components/SetupNotice";
import SheepForm from "@/components/SheepForm";
import { parentOptions } from "@/lib/options";
import { getServerT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function AddSheepPage() {
  if (!hasSupabaseConfig()) return <SetupNotice />;
  const { locale, t } = await getServerT();
  const today = new Date();
  const [active, all] = await Promise.all([getActiveSheep(), getAllSheep()]);
  const ewes = active.filter((s) => s.sex === "Ewe");
  const rams = active.filter((s) => s.sex === "Ram");
  const nextId = all.reduce((mx, s) => Math.max(mx, s.id), 0) + 1;
  const suggestedTag = "26-" + String(nextId).padStart(3, "0");

  return (
    <>
      <div className="pagehead">
        <h1>{t("form.addTitle")}</h1>
        <p>{t("form.addSub")}</p>
      </div>
      <SheepForm
        values={{ tag: suggestedTag, sex: "Ewe", breed: "Suffolk", color: "White", health: "Healthy" }}
        eweOptions={parentOptions(ewes, today, locale)}
        ramOptions={parentOptions(rams, today, locale)}
      />
    </>
  );
}
