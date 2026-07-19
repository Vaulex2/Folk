-- Flock schema. Run in the Supabase SQL editor (or `supabase db execute`).
-- Access model: one farm, one shared Supabase Auth login. Policies grant full
-- access TO authenticated; the anon role has no access. The Next.js server
-- itself uses the secret key (bypasses RLS) — these policies exist to seal
-- the directly-reachable REST/Storage APIs. See README "Security".

create table if not exists sheep (
  id         bigint generated always as identity primary key,
  tag        text not null unique,
  sex        text not null check (sex in ('Ewe', 'Ram')),
  birth      date not null,
  breed      text,
  color      text,
  weight     integer,
  mother_id  bigint references sheep(id) on delete set null,
  father_id  bigint references sheep(id) on delete set null,
  health     text not null default 'Healthy'
             check (health in ('Healthy','Needs attention','Under treatment','Pregnant','Vaccination due')),
  due_date   date,          -- lambing due (pregnant ewes)
  vaccination_date date,     -- next scheduled vaccination
  status     text not null default 'Active' check (status in ('Active','Sold','Died')),
  created_at timestamptz not null default now()
);

alter table sheep add column if not exists photo_url text;

-- Money (sales & purchases). Bought-in animals carry a purchase price/date;
-- selling a sheep records its price/date alongside status = 'Sold'.
alter table sheep add column if not exists purchase_price numeric(14,2) check (purchase_price >= 0);
alter table sheep add column if not exists purchase_date date;
alter table sheep add column if not exists sale_price numeric(14,2) check (sale_price >= 0);
alter table sheep add column if not exists sale_date date;

-- Set when a sheep is marked Died; cleared on restore. Sold animals use
-- sale_date instead. Together they date every entry in the History screen.
alter table sheep add column if not exists death_date date;

create index if not exists sheep_mother_idx on sheep(mother_id);
create index if not exists sheep_father_idx on sheep(father_id);
create index if not exists sheep_status_idx on sheep(status);

create table if not exists health_notes (
  id         bigint generated always as identity primary key,
  sheep_id   bigint not null references sheep(id) on delete cascade,
  date       date not null,
  status     text check (status in ('Healthy','Needs attention','Under treatment','Pregnant','Vaccination due')),
  note       text not null,
  created_at timestamptz not null default now()
);

create index if not exists health_notes_sheep_idx on health_notes(sheep_id);

create table if not exists matings (
  id          bigint generated always as identity primary key,
  ewe_id      bigint not null references sheep(id) on delete cascade,
  ram_id      bigint not null references sheep(id) on delete cascade,
  mating_date date not null,
  due_date    date not null,   -- mating_date + 152 days, computed in the server action
  status      text not null default 'Planned'
              check (status in ('Planned','Confirmed','Lambed','Failed')),
  created_at  timestamptz not null default now()
);

create index if not exists matings_ewe_idx on matings(ewe_id);

create table if not exists weight_records (
  id         bigint generated always as identity primary key,
  sheep_id   bigint not null references sheep(id) on delete cascade,
  date       date not null,
  weight_kg  numeric(5,1) not null check (weight_kg > 0),
  created_at timestamptz not null default now()
);

create index if not exists weight_records_sheep_idx on weight_records(sheep_id);

-- General farm to-do list (shearing, hoof trimming, feed…). A task may
-- optionally point at one animal; flock-wide tasks leave sheep_id null.
create table if not exists tasks (
  id         bigint generated always as identity primary key,
  title      text not null,
  due_date   date,
  sheep_id   bigint references sheep(id) on delete cascade,
  done       boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists tasks_due_idx on tasks(done, due_date);

-- Farm money ledger: any expense or extra income (wool, milk…). Sheep sales
-- and purchases are NOT duplicated here — they live on the sheep table
-- (purchase_price/purchase_date, sale_price/sale_date) and are merged into
-- the Finances screen in code. Category alone implies income vs expense.
create table if not exists transactions (
  id         bigint generated always as identity primary key,
  category   text not null check (category in (
    'feed','vet','medicine','shearing','equipment','labor','transport','other_expense',
    'wool','milk','other_income'
  )),
  amount     numeric(14,2) not null check (amount > 0),
  date       date not null,
  note       text,
  sheep_id   bigint references sheep(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists transactions_date_idx on transactions(date);
create index if not exists transactions_sheep_idx on transactions(sheep_id);

-- Authenticated-only access. Single shared farm login, so no ownership
-- predicate exists — the TO clause is the whole access model. (Old open
-- policies are dropped by name so re-running this file upgrades v1 installs.)
alter table sheep enable row level security;
alter table health_notes enable row level security;
alter table matings enable row level security;
alter table weight_records enable row level security;
alter table tasks enable row level security;
alter table transactions enable row level security;

drop policy if exists tasks_rw on tasks;
create policy tasks_rw on tasks for all to authenticated using (true) with check (true);

drop policy if exists transactions_rw on transactions;
create policy transactions_rw on transactions for all to authenticated using (true) with check (true);

drop policy if exists sheep_all on sheep;
drop policy if exists sheep_rw on sheep;
create policy sheep_rw on sheep for all to authenticated using (true) with check (true);

drop policy if exists health_notes_all on health_notes;
drop policy if exists health_notes_rw on health_notes;
create policy health_notes_rw on health_notes for all to authenticated using (true) with check (true);

drop policy if exists matings_all on matings;
drop policy if exists matings_rw on matings;
create policy matings_rw on matings for all to authenticated using (true) with check (true);

drop policy if exists weight_records_all on weight_records;
drop policy if exists weight_records_rw on weight_records;
create policy weight_records_rw on weight_records for all to authenticated using (true) with check (true);

-- Storage bucket for sheep photos: public READ (photo_url values are stored as
-- public URLs and cached pages depend on them not expiring — an accepted
-- trade-off, sheep photos are low-sensitivity), authenticated-only WRITE.
-- Upsert needs INSERT + SELECT + UPDATE; the public select policy supplies SELECT.
insert into storage.buckets (id, name, public)
values ('sheep-photos', 'sheep-photos', true)
on conflict (id) do nothing;

drop policy if exists sheep_photos_read on storage.objects;
create policy sheep_photos_read on storage.objects for select using (bucket_id = 'sheep-photos');

drop policy if exists sheep_photos_write on storage.objects;
create policy sheep_photos_write on storage.objects
  for insert to authenticated with check (bucket_id = 'sheep-photos');

drop policy if exists sheep_photos_update on storage.objects;
create policy sheep_photos_update on storage.objects
  for update to authenticated using (bucket_id = 'sheep-photos') with check (bucket_id = 'sheep-photos');

-- Notifications (Telegram). See README "Notifications" section for the manual
-- secrets/vault steps this depends on — they cannot live in this file.
create table if not exists notification_log (
  id         bigint generated always as identity primary key,
  sheep_id   bigint references sheep(id) on delete cascade,
  type       text not null,
  ref_date   date,           -- for vaccination_due: the vaccination_date this reminder covers; null otherwise
  sent_at    timestamptz not null default now(),
  unique (sheep_id, type, ref_date)
);

-- Task reminders attribute their log rows to a task, not a sheep. Dedupe for
-- task_due happens in the reminder function keyed on (task_id, ref_date) —
-- the sheep-scoped unique constraint can't cover null sheep_id rows.
alter table notification_log add column if not exists task_id bigint references tasks(id) on delete cascade;
create index if not exists notification_log_task_type_idx on notification_log(task_id, type);

-- Named so it can be redefined on re-run as the set of event types grows.
alter table notification_log drop constraint if exists notification_log_type_check;
alter table notification_log add constraint notification_log_type_check
  check (type in (
    'new_sheep','health_changed','removed','restored','vaccination_due',
    'mating_recorded','mating_failed','sheep_edited','note_added','task_due',
    'bulk_added'
  ));

create index if not exists notification_log_sheep_type_idx on notification_log(sheep_id, type);

alter table notification_log enable row level security;
drop policy if exists notification_log_all on notification_log;
drop policy if exists notification_log_rw on notification_log;
create policy notification_log_rw on notification_log for all to authenticated using (true) with check (true);

-- Enable the extensions needed for the daily vaccination-reminder cron job.
-- If the SQL editor role lacks privilege to create these, enable them
-- manually via Dashboard → Database → Extensions (search "pg_cron" and
-- "pg_net") and skip these two lines.
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- MANUAL STEP (run once, do NOT commit the real value): store a random shared
-- secret in Vault that the cron job below sends as a header, checked by the
-- vaccination-reminder Edge Function against its own CRON_SECRET secret
-- (`supabase secrets set CRON_SECRET=<same value>`).
--   select vault.create_secret('<generate-a-random-string>', 'cron_secret');

-- Calls the vaccination-reminder Edge Function once a day at 05:00 UTC.
-- Named jobs upsert on re-run, so re-applying this file is safe.
-- MANUAL STEP: replace <PROJECT_REF> below with your own project ref (the
-- subdomain of your NEXT_PUBLIC_SUPABASE_URL) before running.
select cron.schedule(
  'vaccination-reminder-daily',
  '0 5 * * *',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/vaccination-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);
