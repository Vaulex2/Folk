# Flock — flock & pedigree manager

Record-keeping and pedigree tracking for a farm flock (~80 sheep, growing each autumn as
lambs are born). Built with Next.js (App Router) + Supabase, styled with the warm **Organic**
design system imported from Claude Design.

## Features

- **Dashboard** — flock stats, health alerts, upcoming lambing & vaccinations.
- **Sheep list** — search by tag/breed, filter by sex and health status.
- **Sheep detail** — facts, parents, offspring, and a dated **health-notes history**.
- **Add / edit** — register a lamb and link its dam & sire; edit any record.
- **Soft remove** — mark a sheep *Sold* or *Died*; pedigree links to its offspring stay intact.
- **Family tree** — parents → animal → offspring, tap any relative to re-centre.
- **Breeding check** — pick a ewe + ram to get their **kinship**, the predicted **inbreeding
  of the offspring** (Wright's coefficients over the pedigree), common ancestors, and a
  plain-language verdict before you pair them.

## Setup

1. **Create a Supabase project** (or provision Supabase via the Vercel Marketplace, which
   injects the env vars automatically).
2. **Environment** — copy `.env.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable key — auth/session)
   - `SUPABASE_SECRET_KEY` (secret key — server data layer and seed script)
   - `NEXT_PUBLIC_FLOCK_NAME` (optional display name, default "Flock")
3. **Schema** — run `supabase/schema.sql` in the Supabase SQL editor (replace
   `<PROJECT_REF>` in the cron block first).
4. **Auth** — create the farm login and disable signups (see "Security" below).
5. **Demo flock** — `npm run seed` generates ~80 head with pedigree and health data.
6. **Run** — `npm run dev` and open http://localhost:3000, then sign in.

## Scripts

- `npm run dev` / `npm run build` / `npm run start`
- `npm run seed` — (re)load the demo flock (clears existing rows first)
- `npm run test:kinship` — sanity-check the genetics math against known relationships

## Data model

`sheep` (id, tag, sex, birth, breed, color, weight, mother_id, father_id, health, due_date,
status) and `health_notes` (sheep_id, date, status, note). Offspring are **derived** from
parent references, never stored. See `supabase/schema.sql`.

## Notifications (Telegram)

The app can post to a Telegram group whenever a sheep is added, its health status
changes, it's marked Sold/Died, or a vaccination is coming due (checked daily,
3 days ahead). Delivery runs entirely through two Supabase Edge Functions —
`supabase/functions/notify-event` (called synchronously from `app/actions.ts`
after a write succeeds) and `supabase/functions/vaccination-reminder` (called
daily by a `pg_cron` job defined in `supabase/schema.sql`). "Who did it" comes
from the free-text **Acting as** picker in the top bar / sidebar — the app has
no real login system, so this is a name cookie, not authentication.

Each Edge Function (`supabase/functions/notify-event/index.ts`,
`supabase/functions/vaccination-reminder/index.ts`) is a single self-contained
file — no shared imports, just a direct `npm:@supabase/supabase-js@2`
specifier — so it can be pasted straight into the Dashboard's function editor,
no CLI required.

Setup (via the Supabase Dashboard):

1. Create a bot: message `@BotFather` on Telegram → `/newbot` → copy the token.
2. Add the bot to your Telegram group, send any message in the group, then
   open `https://api.telegram.org/bot<token>/getUpdates` in a browser and read
   `result[0].message.chat.id` (a negative number for groups) — that's your
   `TELEGRAM_CHAT_ID`.
3. Generate two random secrets, e.g. `openssl rand -hex 32` twice — one for
   `NOTIFY_SECRET` (guards `notify-event`), one for `CRON_SECRET` (guards
   `vaccination-reminder`, which pg_cron calls with no user JWT).
4. **Dashboard → Edge Functions → Secrets** — add `TELEGRAM_BOT_TOKEN`,
   `TELEGRAM_CHAT_ID`, `NOTIFY_SECRET`, `CRON_SECRET`.
5. **Dashboard → Edge Functions → Deploy a new function** — name it exactly
   `notify-event`, paste in the full contents of
   `supabase/functions/notify-event/index.ts`, and turn **off** "Enforce JWT
   verification" (auth is handled by the `NOTIFY_SECRET` header check inside
   the function instead).
6. Repeat for `vaccination-reminder`, pasting
   `supabase/functions/vaccination-reminder/index.ts`, JWT verification off.
7. Set `NOTIFY_SECRET=<random1>` in `.env.local` (same value as step 3/4), so
   the Next.js app can authenticate its calls to `notify-event`.
8. **Dashboard → SQL Editor** — paste in the full contents of
   `supabase/schema.sql` and run it (safe to re-run — everything is
   `if not exists`/`on conflict`). This creates `notification_log`, enables
   `pg_cron`/`pg_net`, and schedules the daily reminder job. If the two
   `create extension` lines fail for permission reasons, enable `pg_cron` and
   `pg_net` instead via **Dashboard → Database → Extensions**, then re-run.
9. Still in the SQL Editor, run once (do not commit the value):
   `select vault.create_secret('<same value as CRON_SECRET>', 'cron_secret');`
10. Smoke-test: add a sheep in the app and confirm a Telegram message arrives.
    Test the digest path directly from **Dashboard → Edge Functions →
    vaccination-reminder → Invoke**, adding header
    `x-cron-secret: <CRON_SECRET>`.

(The CLI equivalents — `supabase link`, `supabase secrets set`,
`supabase functions deploy <name> [--no-verify-jwt]` — work the same way if
you'd rather script this.)

## Security

The app is gated behind a **single shared Supabase Auth login** (one farm, one account).
Every page and server action requires a signed-in session; RLS policies grant access
`TO authenticated` only, so the publishable key alone can read/write nothing.
The Next.js server talks to the database with the secret key (`SUPABASE_SECRET_KEY`,
server-only, bypasses RLS) — the RLS policies exist to seal the directly-reachable
REST/Storage APIs.

One deliberate trade-off: the `sheep-photos` bucket stays **public-read** (writes are
authenticated-only). Stored `photo_url` values are plain public URLs that cached pages
depend on; sheep photos are low-sensitivity. Switch to signed URLs if that ever changes.

### One-time setup (Supabase Dashboard)

1. **Create the farm user** — Auth → Users → Add user (email + password). This is the
   login everyone on the farm shares.
2. **Disable public signups** — Auth → Sign In / Providers → turn off "Allow new users
   to sign up" (mirrored in `supabase/config.toml` for local dev). Leave anonymous
   sign-ins off — anonymous users carry the `authenticated` role and would defeat RLS.
3. **Apply the schema** — re-run `supabase/schema.sql` in the SQL editor (idempotent;
   it drops the old open policies and creates the authenticated-only ones). If you
   prefer a minimal delta, run just the `drop policy` / `create policy` statements.
4. **Keys** — Project Settings → API Keys. Use the publishable key as
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` and the secret key as `SUPABASE_SECRET_KEY`.
   If this project ever had keys committed to git history, rotate them here
   (enable the new `sb_publishable_`/`sb_secret_` keys, then disable the legacy
   JWT-based anon/service_role keys once everything is migrated).
