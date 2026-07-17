import { describe, expect, it } from "vitest";
import { LOCALES } from "@/lib/i18n/config";
import { getMessages, MESSAGES } from "@/lib/i18n/messages";

// The compiler already enforces the shape via the Messages type, but `as`-casts
// and array lengths slip past it — this checks the real runtime objects.
function paths(obj: unknown, prefix = ""): string[] {
  if (Array.isArray(obj)) return [`${prefix}[${obj.length}]`];
  if (obj && typeof obj === "object") {
    return Object.entries(obj).flatMap(([k, v]) => paths(v, prefix ? `${prefix}.${k}` : k));
  }
  return [prefix];
}

describe("message catalogues", () => {
  const enPaths = paths(MESSAGES.en).sort();

  it.each(LOCALES.filter((l) => l !== "en"))("%s has the same keys as en", (locale) => {
    expect(paths(MESSAGES[locale]).sort()).toEqual(enPaths);
  });

  it.each(LOCALES)("%s has no empty strings", (locale) => {
    const empties: string[] = [];
    const walk = (obj: unknown, prefix: string) => {
      if (typeof obj === "string") {
        if (obj.trim() === "") empties.push(prefix);
      } else if (Array.isArray(obj)) {
        obj.forEach((v, i) => walk(v, `${prefix}[${i}]`));
      } else if (obj && typeof obj === "object") {
        Object.entries(obj).forEach(([k, v]) => walk(v, prefix ? `${prefix}.${k}` : k));
      }
    };
    walk(MESSAGES[locale], "");
    expect(empties).toEqual([]);
  });

  it("falls back to English for an unknown locale", () => {
    // @ts-expect-error — exercising the runtime guard with an invalid locale
    expect(getMessages("de")).toBe(MESSAGES.en);
  });
});
