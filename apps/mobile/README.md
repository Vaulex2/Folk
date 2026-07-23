# Flock — mobile app (Expo / Android)

A native Android app for the farm owner, built alongside the existing Next.js web
app (repo root). It talks to the **same Supabase project** and reuses the web
app's tested domain logic verbatim. See `../../plan_app.md` for the original plan.

## What's built (v1 = Phase 1 + Phase 2)

- **Login** (shared farm account) + optional **biometric / device-PIN app-lock**
- **Dashboard** — flock stats, health alerts, upcoming lambing/vaccination/tasks
- **Sheep list** — search + sex/health filters
- **Sheep detail** — facts, parents, offspring, health history, photo, status actions
- **Add / edit sheep** — full form with parent pickers, incl. **photo capture/upload**
- **Health notes** — add + history (updates current health)
- **Tasks** — add / complete / delete, due dates, sheep links
- **Weight & growth** — records list, average-daily-gain, line chart
- **Bulk add** — one profile → many sequentially-tagged animals
- **History** — sold/died archive with restore
- **Finance** — ledger (auto-merges sheep sales/purchases), add/delete entries,
  per-category and per-sheep profit reports
- **Settings** — language (en/uz/ru), app-lock toggle, sign out
- Full **en / uz / ru** localization (same catalogue as web)

Family tree and the breeding/kinship checker (Phase 3) are intentionally not
included in this v1.

## Setup

```bash
cd apps/mobile
cp .env.example .env      # already present with the shared project's values
npm install               # installs deps + the flock-core file: dependency
npm start                 # then press 'a', or scan the QR with Expo Go (Android)
```

`.env` holds only `EXPO_PUBLIC_SUPABASE_URL` and the **publishable (anon) key** —
the same values the web app exposes to the browser. RLS (`TO authenticated`) is
what protects the data; the secret key is never shipped to the device.

Requires biometrics or a device PIN enrolled on the phone for the app-lock toggle
to be available.

## Architecture

```
apps/mobile/
  App.tsx                 providers: I18n → Session → RootNavigator
  metro.config.js         resolves the shared flock-core package (see below)
  src/
    core.ts               re-exports the shared domain logic (../../lib)
    config.ts             EXPO_PUBLIC_* env
    theme.ts              concrete design tokens (RN has no CSS vars)
    lib/
      supabase.ts         anon-key client, AsyncStorage session persistence
      session.tsx         auth context
      i18n.tsx            locale context over the shared message catalogue
      appLock.ts          expo-local-authentication gate
      data.ts             THE data-access layer — all reads/writes go here
      useAsync.ts         fetch-on-focus hook
    components/           UI kit (Button, Field, Card, Select, DateField, chart…)
    navigation/           tabs + native stack + LockGate
    screens/              one file per screen
```

### Shared logic reuse (`flock-core`)

The repo's top-level `lib/` (age/health/finance/kinship/validation math + the
i18n catalogue — ~1,000 lines, covered by the web app's Vitest suite) is
consumed **unchanged** as a local package named `flock-core`:

- `lib/package.json` names it `flock-core`.
- `apps/mobile/package.json` depends on it via `"flock-core": "file:../../lib"`,
  so npm symlinks it into `node_modules/`.
- `metro.config.js` adds `../../lib` to `watchFolders` so Metro serves the source
  behind that symlink. `nodeModulesPaths` stays pinned to this app's own
  `node_modules`, and `flock-core` has zero external deps, so there is never a
  second copy of React.
- `tsconfig.json` maps `flock-core/*` → `../../lib/*` for type-checking.
- `src/core.ts` re-exports only the framework-free files; server-only modules
  (`supabase.ts`, `notify.ts`, `actor/*`, `auth/*`, `i18n/server.ts`) are excluded.

Verified with `npm run typecheck` and a full `npx expo export` Metro bundle.

### Offline seam

Every Supabase call lives in `src/lib/data.ts` — screens never call
`supabase.from(...)` directly. This is the seam the plan (§6) calls for: v1 ships
online-only (graceful failure), and a read-cache / write-queue can later be added
inside the data layer without touching any screen.

## Building an APK/AAB (EAS)

```bash
npm i -g eas-cli
eas login
eas build --platform android --profile preview   # signed APK from the cloud
```

EAS manages the keystore. Distribute via the Play Store internal-testing track
(auto-updates, normal install) or direct APK sideload. Reuse the PWA's
`icon-512.png` as the source art for `assets/` adaptive icons.

## Resolved decisions (plan §9)

| # | Question | Decision for v1 |
|---|---|---|
| 1 | Repo restructure | **No.** Standalone `apps/mobile`; web untouched; `lib/` shared as `flock-core`. |
| 2 | Shared vs personal login | **Shared** farm account (no schema change). |
| 3 | Offline depth | **Online-only** (option 1), data layer ready for queued writes. |
| 4 | v1 feature scope | **Phase 1 + Phase 2** (tree & breeding deferred). |
| 5 | Notifications | Telegram edge functions unchanged (no native push added). |
| 6 | Play Store account | Deferred to distribution time. |
| 7 | Device/OS floor | Expo SDK 57 defaults; revisit against the owner's phone. |
