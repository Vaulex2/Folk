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
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (app)
   - `SUPABASE_SERVICE_ROLE_KEY` (seed script only)
3. **Schema** — run `supabase/schema.sql` in the Supabase SQL editor.
4. **Demo flock** — `npm run seed` generates ~80 head with pedigree and health data.
5. **Run** — `npm run dev` and open http://localhost:3000.

## Scripts

- `npm run dev` / `npm run build` / `npm run start`
- `npm run seed` — (re)load the demo flock (clears existing rows first)
- `npm run test:kinship` — sanity-check the genetics math against known relationships

## Data model

`sheep` (id, tag, sex, birth, breed, color, weight, mother_id, father_id, health, due_date,
status) and `health_notes` (sheep_id, date, status, note). Offspring are **derived** from
parent references, never stored. See `supabase/schema.sql`.

## Security note (v1)

v1 is single-farmer with **no authentication**; the Supabase RLS policies are open so the
anon key can read/write. **Before any multi-user or public deployment**, add Supabase Auth
and replace the open policies in `supabase/schema.sql` with per-user rules.
