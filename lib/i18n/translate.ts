import type { Messages } from "./messages";

export type Vars = Record<string, string | number>;
export type TFunc = (path: string, vars?: Vars) => string;

function interpolate(s: string, vars?: Vars): string {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

/** Resolve a dot-path like "dashboard.title" against the messages object. */
export function makeT(m: Messages): TFunc {
  return (path, vars) => {
    const val = path.split(".").reduce<unknown>((o, k) => {
      if (o && typeof o === "object") return (o as Record<string, unknown>)[k];
      return undefined;
    }, m);
    if (typeof val === "string") return interpolate(val, vars);
    return path; // fall back to the key so missing strings are visible
  };
}
