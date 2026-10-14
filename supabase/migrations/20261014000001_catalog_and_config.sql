-- Catalog, templates and app config (07 §2.3): public read, written only by the seed with the
-- service_role (RNF-08). No write policy exists, so RLS denies the app any write.

create function public.touch_server_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.server_updated_at := clock_timestamp();
  return new;
end;
$$;

create table public.exercises (
  id uuid primary key,
  slug text not null unique,
  name text not null,
  aliases jsonb not null default '[]',
  load_type text not null check (load_type in ('external', 'bodyweight')),
  primary_muscles jsonb not null,
  secondary_muscles jsonb not null default '[]',
  primary_equipment text not null
    check (primary_equipment in ('barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'kettlebell')),
  equipment jsonb not null,
  mechanic text not null check (mechanic in ('compound', 'isolation')),
  is_unilateral boolean not null,
  description text,
  attributions jsonb not null default '[]',
  -- never deleted, only deprecated (RN-CAT-01)
  deprecated_at timestamptz,
  -- the pull cursor of RF-CAT-04
  server_updated_at timestamptz not null default clock_timestamp()
);

create table public.exercise_source_refs (
  exercise_id uuid not null references public.exercises (id),
  source text not null,
  external_id text not null,
  primary key (source, external_id)
);

create table public.routine_templates (
  id text primary key,
  name text not null,
  level text not null check (level in ('novice', 'intermediate', 'advanced')),
  days_per_week int not null,
  estimated_minutes int not null,
  rationale text not null,
  server_updated_at timestamptz not null default clock_timestamp()
);

create table public.template_days (
  id text primary key,
  template_id text not null references public.routine_templates (id),
  name text not null,
  position int not null,
  server_updated_at timestamptz not null default clock_timestamp()
);

create table public.template_exercises (
  id text primary key,
  template_day_id text not null references public.template_days (id),
  -- catalog reference, no FK (RN-CAT-04)
  exercise_id uuid not null,
  position int not null,
  role text not null check (role in ('main', 'accessory')),
  sets int not null check (sets between 1 and 10),
  server_updated_at timestamptz not null default clock_timestamp()
);

-- RN-SYNC-14: the minimum app version that can sync. A single row.
create table public.app_config (
  id int primary key default 1 check (id = 1),
  min_app_version text not null default '0.0.0'
);
insert into public.app_config (id) values (1);

create index exercises_pull_idx on public.exercises (server_updated_at, id);
create index routine_templates_pull_idx on public.routine_templates (server_updated_at, id);
create index template_days_pull_idx on public.template_days (server_updated_at, id);
create index template_exercises_pull_idx on public.template_exercises (server_updated_at, id);
create index template_days_template_idx on public.template_days (template_id);
create index template_exercises_day_idx on public.template_exercises (template_day_id);

create trigger touch_server_updated_at before insert or update on public.exercises
  for each row execute function public.touch_server_updated_at();
create trigger touch_server_updated_at before insert or update on public.routine_templates
  for each row execute function public.touch_server_updated_at();
create trigger touch_server_updated_at before insert or update on public.template_days
  for each row execute function public.touch_server_updated_at();
create trigger touch_server_updated_at before insert or update on public.template_exercises
  for each row execute function public.touch_server_updated_at();

alter table public.exercises enable row level security;
alter table public.exercise_source_refs enable row level security;
alter table public.routine_templates enable row level security;
alter table public.template_days enable row level security;
alter table public.template_exercises enable row level security;
alter table public.app_config enable row level security;

create policy "public read" on public.exercises for select to anon, authenticated using (true);
create policy "public read" on public.routine_templates for select to anon, authenticated using (true);
create policy "public read" on public.template_days for select to anon, authenticated using (true);
create policy "public read" on public.template_exercises for select to anon, authenticated using (true);
create policy "public read" on public.app_config for select to anon, authenticated using (true);
-- exercise_source_refs exists only on the server: no policy, so only the service_role reads it.

-- The app can only read these; default grants would also allow writes before RLS says no.
revoke insert, update, delete, truncate on
  public.exercises, public.exercise_source_refs, public.routine_templates,
  public.template_days, public.template_exercises, public.app_config
  from anon, authenticated;
revoke all on public.exercise_source_refs from anon, authenticated;
