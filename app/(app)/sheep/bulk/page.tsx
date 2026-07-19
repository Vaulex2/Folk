import { getAllSheep } from "@/lib/flock";
import { hasSupabaseConfig } from "@/lib/supabase";
import SetupNotice from "@/components/SetupNotice";
import BulkAddForm from "./BulkAddForm";
import { getServerT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function BulkAddPage() {
  if (!hasSupabaseConfig()) return <SetupNotice />;
  const { t } = await getServerT();
  const all = await getAllSheep();

  // Suggest the next free number after the highest fully-numeric tag.
  const maxNum = all.reduce((mx, s) => {
    const n = /^\d+$/.test(s.tag) ? parseInt(s.tag, 10) : 0;
    return Math.max(mx, n);
  }, 0);

  return (
    <>
      <div className="pagehead">
        <h1>{t("bulk.title")}</h1>
        <p>{t("bulk.subtitle")}</p>
      </div>
      <BulkAddForm startTag={maxNum + 1} />
    </>
  );
}
