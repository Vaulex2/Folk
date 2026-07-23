// Single re-export point for the repo's framework-free domain logic
// (top-level ../../lib). Everything here is pure TypeScript with no React or
// Next.js dependency, so it runs unchanged in React Native. Screens import from
// "../core" rather than reaching across the repo boundary themselves.
//
// The `flock-core/*` specifier is mapped to the shared lib directory by Metro
// (metro.config.js `extraNodeModules`) and TypeScript (tsconfig `paths`). We use
// a module alias instead of a relative `../../../lib` path because Metro forbids
// relative imports that escape the project root.
//
// Deliberately NOT re-exported: lib/supabase.ts (server-only), lib/notify.ts,
// lib/log.ts, lib/actor/*, lib/auth/*, lib/i18n/server.ts — all server-bound.

export * from "flock-core/sheep";
export * from "flock-core/finance";
export * from "flock-core/validation";
export * from "flock-core/kinship";
export * from "flock-core/options";
export * from "flock-core/i18n/config";
export * from "flock-core/i18n/translate";
export { getMessages } from "flock-core/i18n/messages";
export type { Messages } from "flock-core/i18n/messages";
