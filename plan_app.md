# Flock — Android app plan

Status: **planning only** — nothing in this doc has been built yet. Written so a
future session (or another dev) can pick this up without re-deriving context.

## 1. What we're building

A **native Android app**, for the farm owner's personal use, sitting alongside
the existing Next.js web app (`d:\qoylar`) rather than replacing it. iOS is
explicitly out of scope for now.

Open questions this doc flags but does not answer are collected in **§9** —
resolve those before writing code.

## 2. What already exists (reuse inventory)

The web app is Next.js (App Router) + Supabase, shared-login model (one farm,
one Supabase Auth account), RLS-gated (`TO authenticated`, no per-row
ownership), three locales (`en`, `uz`, `ru`), PWA-installable already
(`public/manifest.webmanifest`, `sw.js`, `icon-192.png`, `icon-512.png`).

Domain surface (pages → underlying tables):

| Feature | Route | Tables | Notes |
|---|---|---|---|
| Dashboard | `/` | `sheep`, `health_notes` | flock stats, alerts, upcoming events |
| Sheep list/detail/add/edit | `/sheep`, `/sheep/[id]`, `/sheep/new`, `/sheep/[id]/edit` | `sheep`, `health_notes`, `weight_records` | photos via `sheep-photos` storage bucket (public-read) |
| Bulk add | `/sheep/bulk` | `sheep` | multi-row entry |
| Family tree | `/tree` | `sheep` (self-referencing `mother_id`/`father_id`) | |
| Breeding checker | `/breeding` | `sheep`, `matings` | kinship/inbreeding math (`lib/kinship.ts`) |
| Tasks | `/tasks` | `tasks` | due-date Telegram reminders via `vaccination-reminder` edge fn |
| Finance | `/finance` | `transactions` + derived from `sheep.purchase_price/sale_price` | ledger, category/monthly reports, per-sheep profit, paginated |
| History | `/history` | `sheep` (`status = 'Sold'/'Died'`) | archive of animals that left the flock |
| Login | `/login` | Supabase Auth | shared farm login |

Notifications run through two self-contained Supabase Edge Functions
(`supabase/functions/notify-event`, `.../vaccination-reminder`) that post to a
Telegram group — **not tied to the web app**, so they keep working regardless
of what mobile stack we pick.

Pure/near-pure TypeScript domain logic (no React, no Next.js APIs) that is a
strong candidate for reuse as-is in a mobile app:

| File | Lines | What it does |
|---|---|---|
| `lib/sheep.ts` | 286 | age/health calc, formatting, sort/filter helpers |
| `lib/finance.ts` | 227 | ledger merge, category/monthly/profit reports |
| `lib/validation.ts` | 293 | form-field validation rules |
| `lib/kinship.ts` | 145 | Wright's coefficient inbreeding/kinship math |
| `lib/options.ts` | 24 | small option-list helpers |
| `lib/notify.ts` | 33 | notify-event edge fn caller (server-only today) |
| `lib/i18n/messages.ts` | — | full `en`/`uz`/`ru` catalogues, already keyed |

That's ~1,000 lines of already-tested logic (106 Vitest tests currently cover
kinship/sheep/validation/finance/messages) that a native rewrite would
otherwise have to reimplement *and* re-verify from scratch.

## 3. Framework decision

### Recommendation: **Expo (React Native), Android build target only**

Reasoning, in priority order:

1. **Code reuse.** The table above is real, tested logic. Expo/React Native
   is TypeScript, so `lib/sheep.ts`, `finance.ts`, `validation.ts`,
   `kinship.ts`, and the i18n catalogues can move into a shared package with
   little to no rewrite. A Kotlin or Flutter/Dart app reuses none of it.
2. **Same backend, same client library.** `@supabase/supabase-js` runs
   unmodified in React Native (session persistence swaps `localStorage` for
   `expo-secure-store`/`AsyncStorage`, that's the only adaptation). No new
   backend code, no new auth flow to design — RLS already restricts to the
   `authenticated` role, which is exactly what a mobile client needs (it uses
   the *publishable* key + a real session, same as the browser does; it must
   **never** hold `SUPABASE_SECRET_KEY`, which only the Next.js server holds
   today).
3. **"Android only" is just a build flag, not an architecture choice.** Expo
   supports single-platform targets natively — we simply never run the iOS
   build/submit steps. No Mac, no Apple Developer account needed.
4. **Solo/small-team maintenance.** One TypeScript codebase end to end
   (server, web, shared logic, mobile) is a materially smaller cognitive load
   than adding Kotlin or Dart as a second/third language.
5. **EAS Build** produces a signed APK/AAB from the cloud — Android Studio is
   convenient for local dev but not required to ship a build.

### Alternatives considered and rejected (for now)

| Option | Why not the default pick |
|---|---|
| **Capacitor** (wrap the deployed web app in a WebView) | Fastest possible path (could be a day of work) but most pages are server components marked `force-dynamic` — there's no real offline story without a much larger rework of the data-fetching architecture, and it still feels like "the website in an icon," not a native app. Worth keeping as a **phase 0 fallback** if the owner needs something *this week* — see §7. |
| **Native Kotlin/Jetpack Compose** | Best possible native feel and performance, but throws away all ~1,000 lines of tested domain logic and every UI decision already made; full rewrite of forms, validation, and the kinship math from a math-heavy TS file into Kotlin, with no shared test suite. Highest quality ceiling, highest cost — reconsider only if Expo's limitations (see §6) become a real blocker. |
| **Flutter** | Cross-platform like Expo, but Dart shares nothing with the existing TS codebase — same rewrite cost as Kotlin for the logic layer, without even the "cross-platform for later iOS" upside mattering here since iOS is out of scope. |

## 4. Proposed repo structure

Keep everything in this one repo (simplest for a solo dev, one place to look),
reorganized as a light monorepo so the shared package is real, not
copy-pasted:

```
d:\qoylar\
  apps\
    web\          <- current Next.js app moves here (or stays at root — TBD, see §9)
    mobile\       <- new Expo app
  packages\
    core\         <- lib/sheep.ts, finance.ts, validation.ts, kinship.ts, i18n messages
                     moved here, imported by both apps
  supabase\       <- unchanged, backend is shared
```

npm/pnpm workspaces (the repo already uses npm) tie `apps/web` and
`apps/mobile` to `packages/core`. This is a mechanical refactor of the
current `lib/` folder — no logic changes, just moving files and fixing
imports — and should happen **before** mobile work starts, not during it, so
web never breaks mid-move.

If a full monorepo move feels like too much churn right now, a lighter
alternative is a local-only `packages/core` published via a `file:` dependency
without touching `apps/web`'s current flat layout — noted as a decision in §9.

## 5. Data & auth approach

- **Auth:** reuse the existing single shared Supabase Auth login to start
  (matches "for the owner himself" — one person, one account, zero new
  backend work). Session persisted on-device via `expo-secure-store`.
  Biometric/PIN app-lock (Expo `LocalAuthentication`) is a cheap add-on worth
  doing given the phone will stay logged in.
- **RLS:** no schema changes needed — `sheep`, `health_notes`, `matings`,
  `weight_records`, `tasks`, `transactions`, `notification_log` are already
  `TO authenticated` with no ownership predicate, which is exactly the
  shared-account model the mobile app also wants.
- **Storage:** `sheep-photos` bucket is already public-read with
  authenticated-only writes — the mobile app's photo upload (camera roll or
  live camera via `expo-image-picker`) uses the same bucket, same policy, no
  changes.
- **Secrets:** the mobile app ships with only `NEXT_PUBLIC_SUPABASE_URL` /
  the publishable key equivalent, embedded in the Expo build config exactly
  like the web app's `NEXT_PUBLIC_*` vars — never the secret key.

## 6. Offline

Farms are exactly the setting where connectivity is unreliable (a barn, a
paddock, a truck). This is the single biggest UX decision for this app and
the biggest reason a "just wrap the website" approach falls short.

Options, cheapest to most capable:

1. **Online-only, graceful failure.** Simplest to build; show a clear
   "you're offline" state and block writes until reconnected. Fine for a v1
   if the owner mostly uses it indoors/near wifi.
2. **Read cache + queued writes.** Cache the last-fetched flock list/details
   locally (Expo SQLite or even AsyncStorage for the data volumes involved —
   ~80 sheep is small); let reads work offline; queue writes (new health
   note, weight entry, task done) and sync when back online. Solid middle
   ground, moderate effort.
3. **Full offline-first sync engine** (e.g. WatermelonDB, or Supabase's own
   offline/sync tooling if usable from RN). Best experience, most engineering
   — conflict resolution, migrations, etc. Likely overkill for one user on
   one device, but worth knowing it's the ceiling if needs grow.

**Recommendation: start at (1) for the true MVP, design the data layer so (2)
is a drop-in upgrade** (i.e., don't hand-wire Supabase calls directly into
every screen; go through a thin data-access layer in `packages/core` from day
one so a cache/queue can be inserted later without touching UI code).

## 7. Feature phasing

Not a full rewrite on day one. Ordered by what a farm owner reaches for daily
vs. occasionally.

**Phase 0 (optional, days not weeks) — Capacitor fallback.** If there's
pressure to get *something* on the owner's phone immediately while the real
app is built, wrap the deployed web app in Capacitor for an installable icon.
Throwaway work, not a foundation for later phases — skip if there's no urgency.

**Phase 1 — MVP (core daily use).**
- Login (shared account) + biometric app-lock
- Dashboard (flock stats, health alerts, upcoming events)
- Sheep list (search/filter) + sheep detail (facts, parents, offspring)
- Add sheep / edit sheep, including photo capture
- Health notes (add + history) — the thing most likely to be logged *in the
  field*, so this one especially benefits from the offline queue in §6
- Tasks (view/add/complete) — same field-use argument

**Phase 2 — record-keeping depth.**
- Weight & growth history + chart
- Bulk add
- History (sold/died archive)
- Finance (ledger, entries, categories, monthly, per-sheep profit)

**Phase 3 — the specialist tools.**
- Family tree (visual, harder to do well on a small screen — may end up as a
  "open in browser" link rather than a native re-implementation)
- Breeding checker (kinship/inbreeding math is easy to port from
  `lib/kinship.ts`; the UI for picking ewe+ram and reading the verdict is not)

**Phase 4 — polish.**
- Push notifications: decide whether to keep Telegram as the sole channel
  (already built, zero extra work, works even without the app installed) or
  add native Android push (FCM) as a *supplement* for in-app badges/alerts.
  Not a replacement for Telegram unless the owner asks — see §9.
- Offline upgrade to §6 option (2) if Phase 1 usage shows it's needed.
- Home-screen widget (flock stats or "tasks due today") — genuinely native
  territory, not something the web app can offer, and a nice differentiator
  for "an app of his own."

## 8. Distribution

Since this is for one person, not a public release:

- **Signing:** EAS Build handles keystore generation/management.
- **Delivery:** two reasonable paths —
  - *Play Store internal testing track* (owner added as a tester): auto-
    updates, installs like any normal app, no "unknown sources" friction.
    Requires a (free-tier-eligible, one-time $25) Google Play Console
    developer account.
  - *Direct APK sideload*: zero Play Console setup, but the owner has to
    enable "install unknown apps" once and there's no auto-update — you'd
    re-send a new APK each release.
  - **Recommendation:** Play Store internal testing — the $25 one-time fee
    buys auto-updates and a normal install experience, which matters more
    for a non-technical daily user than for a developer.
- **App icon/branding:** the PWA already has `icon-192.png`/`icon-512.png`
  and a manifest — reuse those as the source art for Android's adaptive icon
  rather than commissioning anything new.

## 9. Open questions (resolve before coding starts)

1. **Monorepo restructure now vs. later?** §4 proposes moving `lib/` into a
   shared `packages/core` before mobile work starts. Confirm the owner/repo
   is okay with that churn to `apps/web`'s current paths.
2. **Shared login or the owner's own account?** Phase 1 assumes the existing
   single shared farm login. If the owner should have a personal identity
   distinct from "the farm account" (e.g. for audit trail — "who logged this
   note"), that's a schema change (an `actor`/`user_id` column) worth doing
   once, not twice.
3. **Offline depth for v1** — ship at §6 option (1) and iterate, or is (2)
   (queued writes) a hard requirement from day one because the owner is
   frequently out of signal?
4. **Feature scope for v1** — is the phase breakdown in §7 the right cut, or
   does the owner specifically want (or specifically not care about) any of
   those in the MVP (e.g., finance may be a "nice to have on phone" or a
   "definitely need in the field" depending on how he actually works)?
5. **Notifications** — keep Telegram as the only channel, or is native
   Android push (FCM) actually wanted? If Telegram is fine, Phase 4's push
   item can be dropped entirely.
6. **Play Store account** — who owns the $25 developer account and Google
   identity it's registered under (you, the owner, a shared farm entity)?
7. **Device/OS floor** — what Android version(s) does the owner's phone run?
   Sets Expo's `minSdkVersion` and rules out any API we'd otherwise use
   carelessly.

## 10. Rough effort shape (not a committed estimate)

| Phase | Relative size |
|---|---|
| 0 (Capacitor fallback, optional) | XS — a day or two if pursued at all |
| Repo restructure (§4) | S |
| 1 — MVP | M–L (the largest chunk: navigation, forms, camera/photo upload, auth, offline scaffolding) |
| 2 — record-keeping depth | M |
| 3 — specialist tools | M (tree UI is the wildcard) |
| 4 — polish | S–M depending on push-notification decision |

No dates attached on purpose — size, not schedule, until §9 is answered.
