-- Flock schema. Run in the Supabase SQL editor (or `supabase db execute`).
-- v1 is single-farmer with no auth; RLS is left open. Add auth + policies
-- before any multi-user or public deployment (see README security note).

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

-- Open access for v1 (no auth). Replace with real policies when auth is added.
alter table sheep enable row level security;
alter table health_notes enable row level security;
alter table matings enable row level security;
alter table weight_records enable row level security;

drop policy if exists sheep_all on sheep;
create policy sheep_all on sheep for all using (true) with check (true);

drop policy if exists health_notes_all on health_notes;
create policy health_notes_all on health_notes for all using (true) with check (true);

drop policy if exists matings_all on matings;
create policy matings_all on matings for all using (true) with check (true);

drop policy if exists weight_records_all on weight_records;
create policy weight_records_all on weight_records for all using (true) with check (true);

-- Public storage bucket for sheep photos. Open like the tables above (v1, no
-- auth) — lock down before any public deployment.
insert into storage.buckets (id, name, public)
values ('sheep-photos', 'sheep-photos', true)
on conflict (id) do nothing;

drop policy if exists sheep_photos_read on storage.objects;
create policy sheep_photos_read on storage.objects for select using (bucket_id = 'sheep-photos');

drop policy if exists sheep_photos_write on storage.objects;
create policy sheep_photos_write on storage.objects for insert with check (bucket_id = 'sheep-photos');

drop policy if exists sheep_photos_update on storage.objects;
create policy sheep_photos_update on storage.objects for update using (bucket_id = 'sheep-photos') with check (bucket_id = 'sheep-photos');
