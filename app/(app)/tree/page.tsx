import { getAllSheep } from "@/lib/flock";
import { hasSupabaseConfig } from "@/lib/supabase";
import SetupNotice from "@/components/SetupNotice";
import FamilyTreeClient, { type TreeNode } from "./FamilyTreeClient";
import {
  ancestorLevels,
  ageLabel,
  ageYears,
  byTag,
  findSheep,
  healthColors,
  offspringOf,
  sexLabel,
  view,
  type Sheep,
} from "@/lib/sheep";
import { getServerT } from "@/lib/i18n/server";
import { getMessages } from "@/lib/i18n/messages";
import type { Locale } from "@/lib/i18n/config";

export const dynamic = "force-dynamic";

function node(s: Sheep, today: Date, locale: Locale): TreeNode {
  const v = view(s, today, locale);
  const hs = healthColors(s.health);
  return {
    id: s.id,
    tag: s.tag,
    sexLabel: v.sexLabel,
    sexWithLamb: v.sexWithLamb,
    breed: s.breed,
    ageLabel: v.ageLabel,
    health: s.health,
    healthLabel: v.healthLabel,
    hsBg: hs.bg,
    hsFg: hs.fg,
    photoUrl: s.photo_url,
  };
}

export default async function TreePage({
  searchParams,
}: {
  searchParams: Promise<{ focus?: string }>;
}) {
  if (!hasSupabaseConfig()) return <SetupNotice />;
  const { locale, t } = await getServerT();
  const { focus } = await searchParams;
  const today = new Date();
  const all = await getAllSheep();
  if (all.length === 0) {
    return (
      <div className="pagehead">
        <h1>{t("tree.title")}</h1>
        <p>{t("tree.noneYet")}</p>
      </div>
    );
  }

  // Default focal: an animal with both parents and at least one offspring, else first.
  const focusId = focus ? parseInt(focus, 10) : NaN;
  const focal =
    findSheep(all, focusId) ??
    all.find(
      (s) => s.mother_id && s.father_id && all.some((k) => k.mother_id === s.id || k.father_id === s.id)
    ) ??
    all[0];

  // Ancestor generations, nearest first; drop empty trailing generations.
  const levels = ancestorLevels(all, focal, 3);
  while (levels.length > 0 && !levels[levels.length - 1].some(Boolean)) levels.pop();
  const ancestors = levels.map((lv) => lv.map((s) => (s ? node(s, today, locale) : null)));

  const kids = offspringOf(all, focal.id);

  const options = all
    .slice()
    .sort(byTag)
    .map((s) => ({
      value: String(s.id),
      label: `${s.tag} — ${sexLabel(s.sex, locale)}, ${ageLabel(ageYears(s.birth, today), locale)}`,
    }));

  const roles = getMessages(locale).tree;

  return (
    <FamilyTreeClient
      focal={node(focal, today, locale)}
      ancestors={ancestors}
      kids={kids.map((k) => node(k, today, locale))}
      options={options}
      roleSire={roles.roleSire}
      roleDam={roles.roleDam}
      genLabels={[roles.gen2, roles.gen3]}
      unknownLabel={roles.unknown}
    />
  );
}
