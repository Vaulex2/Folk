import { ageLabel, ageYears, byTag, type Sheep } from "./sheep";
import type { Locale } from "./i18n/config";

export interface Option {
  value: string;
  label: string;
}

/** Parent picker options: "tag · breed · age", sorted by tag, self excluded. */
export function parentOptions(
  list: Sheep[],
  today: Date,
  locale: Locale = "en",
  excludeId?: number
): Option[] {
  return list
    .filter((s) => s.id !== excludeId)
    .slice()
    .sort(byTag)
    .map((s) => ({
      value: String(s.id),
      label: `${s.tag} · ${s.breed} · ${ageLabel(ageYears(s.birth, today), locale)}`,
    }));
}
