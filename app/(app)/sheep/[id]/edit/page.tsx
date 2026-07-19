import { notFound } from "next/navigation";
import { getActiveSheep, getSheep } from "@/lib/flock";
import { hasSupabaseConfig } from "@/lib/supabase";
import SetupNotice from "@/components/SetupNotice";
import SheepForm from "@/components/SheepForm";
import { parentOptions } from "@/lib/options";
import { getServerT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function EditSheepPage({ params }: { params: Promise<{ id: string }> }) {
  if (!hasSupabaseConfig()) return <SetupNotice />;
  const { id } = await params;
  const sheepId = parseInt(id, 10);
  const { locale, t } = await getServerT();
  const today = new Date();
  const [sheep, active] = await Promise.all([getSheep(sheepId), getActiveSheep()]);
  if (!sheep) notFound();

  const ewes = active.filter((s) => s.sex === "Ewe");
  const rams = active.filter((s) => s.sex === "Ram");

  return (
    <>
      <div className="pagehead">
        <h1>{t("form.editTitle", { tag: sheep.tag })}</h1>
        <p>{t("form.editSub")}</p>
      </div>
      <SheepForm
        submitLabel={t("form.saveChanges")}
        values={{
          id: sheep.id,
          tag: sheep.tag,
          sex: sheep.sex,
          birth: sheep.birth,
          weight: sheep.weight != null ? String(sheep.weight) : "",
          breed: sheep.breed,
          color: sheep.color,
          mother_id: sheep.mother_id != null ? String(sheep.mother_id) : "",
          father_id: sheep.father_id != null ? String(sheep.father_id) : "",
          health: sheep.health,
          vaccination_date: sheep.vaccination_date ?? "",
          due_date: sheep.due_date ?? "",
          purchase_price: sheep.purchase_price != null ? String(sheep.purchase_price) : "",
          purchase_date: sheep.purchase_date ?? "",
        }}
        eweOptions={parentOptions(ewes, today, locale, sheep.id)}
        ramOptions={parentOptions(rams, today, locale, sheep.id)}
      />
    </>
  );
}
