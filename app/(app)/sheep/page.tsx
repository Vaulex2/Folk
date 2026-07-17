import { getActiveSheep } from "@/lib/flock";
import { hasSupabaseConfig } from "@/lib/supabase";
import SetupNotice from "@/components/SetupNotice";
import SheepListClient from "./SheepListClient";
import { view } from "@/lib/sheep";
import { getLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function SheepListPage() {
  if (!hasSupabaseConfig()) return <SetupNotice />;
  const locale = await getLocale();
  const today = new Date();
  const all = await getActiveSheep();
  const rows = all.map((s) => view(s, today, locale));
  return <SheepListClient rows={rows} total={all.length} />;
}
