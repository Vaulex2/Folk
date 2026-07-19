import Link from "next/link";
import { getActiveSheep } from "@/lib/flock";
import { hasSupabaseConfig } from "@/lib/supabase";
import SetupNotice from "@/components/SetupNotice";
import SheepForm from "@/components/SheepForm";
import { BREEDS } from "@/lib/sheep";
import { parentOptions } from "@/lib/options";
import { getServerT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function AddSheepPage() {
  if (!hasSupabaseConfig()) return <SetupNotice />;
  const { locale, t } = await getServerT();
  const today = new Date();
  const active = await getActiveSheep();
  const ewes = active.filter((s) => s.sex === "Ewe");
  const rams = active.filter((s) => s.sex === "Ram");

  return (
    <>
      <div className="pagehead">
        <h1>{t("form.addTitle")}</h1>
        <p>{t("form.addSub")}</p>
        <p style={{ marginTop: 8 }}>
          <Link className="btn btn-secondary" href="/sheep/bulk">{t("bulk.linkFromAdd")}</Link>
        </p>
      </div>
      <SheepForm
        values={{ sex: "Ewe", breed: BREEDS[0], color: "White", health: "Healthy" }}
        eweOptions={parentOptions(ewes, today, locale)}
        ramOptions={parentOptions(rams, today, locale)}
      />
    </>
  );
}
