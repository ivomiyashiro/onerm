-- User tables of 07 §2.2 with the server rules of 07 §3 (RLS, LWW, delete wins). Additive only
-- (ADR-0001 R3): never edit this file once merged, add a new migration.

-- ── Trigger functions shared by every user table ──

-- BEFORE INSERT OR UPDATE. Optional args: parent table and FK column. Steps a–j of 07 §3,
-- in that order. Under PostgREST an upsert runs the INSERT branch when the row doesn't exist
-- and the UPDATE branch when it does.
create function public.sync_before_write() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  parent_owner uuid;
  parent_deleted boolean;
begin
  -- a. the server assigns the pull cursor
  new.server_updated_at := clock_timestamp();
  -- b. clamp an updated_at more than 5 min in the future (RN-SYNC-03)
  if new.updated_at > now() + interval '5 minutes' then
    new.updated_at := now();
  end if;
  -- c. a child of a deleted parent is born or stays deleted (RN-SYNC-12). The parent has to be
  --    the caller's: the lookup bypasses RLS, so it must not reveal or accept someone else's row.
  if tg_nargs = 2 then
    execute format('select user_id, deleted_at is not null from public.%I where id = $1', tg_argv[0])
      into parent_owner, parent_deleted
      using (to_jsonb(new) ->> tg_argv[1])::uuid;
    if parent_owner is not null and parent_owner is distinct from (select auth.uid()) then
      raise exception 'parent belongs to another user' using errcode = '42501';
    end if;
    if parent_deleted then
      new.deleted_at := coalesce(new.deleted_at, now());
    end if;
  end if;

  if tg_op = 'INSERT' then
    -- d. nobody writes on behalf of someone else
    new.user_id := (select auth.uid());
    -- e.
    return new;
  end if;

  -- f. the owner never changes
  new.user_id := old.user_id;
  -- g. a tombstone is terminal: the stored row wins, with a new cursor so the client converges
  if old.deleted_at is not null then
    old.server_updated_at := new.server_updated_at;
    return old;
  end if;
  -- h. a delete always wins, whatever its updated_at (RN-SYNC-04)
  if new.deleted_at is not null then
    new.updated_at := greatest(new.updated_at, old.updated_at);
    return new;
  end if;
  -- i. LWW: on a tie the server wins (RN-SYNC-03)
  if old.updated_at >= new.updated_at then
    old.server_updated_at := new.server_updated_at;
    return old;
  end if;
  -- j.
  return new;
end;
$$;

-- AFTER UPDATE OF deleted_at: propagates the delete to the direct children (RN-SYNC-12).
-- Args: child table and its FK column. The child's write goes through its own BEFORE trigger.
create function public.sync_cascade_delete() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.deleted_at is null and new.deleted_at is not null then
    execute format(
      'update public.%I set deleted_at = $1, updated_at = greatest(updated_at, $2)
       where %I = $3 and deleted_at is null',
      tg_argv[0], tg_argv[1])
      using new.deleted_at, new.updated_at, new.id;
  end if;
  return null;
end;
$$;

-- Only the triggers call them.
revoke execute on function public.sync_before_write() from public, anon, authenticated;
revoke execute on function public.sync_cascade_delete() from public, anon, authenticated;

-- ── Tables ──

create table public.profiles (
  -- id = user_id (RN-AUTH-06)
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  server_updated_at timestamptz not null default clock_timestamp(),
  level text not null check (level in ('novice', 'intermediate', 'advanced')),
  goal text not null check (goal in ('health', 'hypertrophy', 'strength')),
  days_per_week int not null check (days_per_week between 2 and 6),
  unit text not null check (unit in ('kg', 'lb')),
  effort_mode text not null check (effort_mode in ('simple', 'rir')),
  effort_mode_explicit boolean not null,
  load_increments_kg jsonb not null,
  load_increments_lb jsonb not null,
  bar_weight_kg double precision not null,
  bar_weight_lb double precision not null,
  -- weak reference, no FK (RN-RUT-02)
  active_routine_id uuid,
  onboarding_completed_at timestamptz,
  constraint profiles_id_is_user_id check (id = user_id),
  constraint profiles_one_per_user unique (user_id)
);

create table public.routines (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  server_updated_at timestamptz not null default clock_timestamp(),
  name text not null check (char_length(trim(name)) between 1 and 50),
  source_template_id text
);

create table public.routine_days (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  server_updated_at timestamptz not null default clock_timestamp(),
  routine_id uuid not null references public.routines (id),
  name text not null,
  position int not null
);

create table public.routine_exercises (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  server_updated_at timestamptz not null default clock_timestamp(),
  routine_day_id uuid not null references public.routine_days (id),
  -- catalog reference, no FK: it may arrive before the exercise (RN-CAT-04)
  exercise_id uuid not null,
  position int not null,
  role text not null check (role in ('main', 'accessory')),
  sets int not null check (sets between 1 and 10),
  rep_min int not null check (rep_min between 1 and 30),
  rep_max int not null check (rep_max between 1 and 30),
  rest_seconds int not null check (rest_seconds between 30 and 600 and rest_seconds % 15 = 0),
  target_rir int not null check (target_rir between 0 and 5),
  notes text check (char_length(notes) <= 280),
  -- RN-RUT-04
  constraint routine_exercises_rep_range check (rep_max >= rep_min)
);

create table public.workouts (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  server_updated_at timestamptz not null default clock_timestamp(),
  -- weak references, no FK (RN-RUT-07)
  routine_id uuid,
  routine_day_id uuid,
  routine_name_snapshot text not null,
  day_name_snapshot text not null,
  -- only finished workouts reach the server (RN-SYNC-13)
  status text not null check (status = 'finished'),
  started_at timestamptz not null,
  finished_at timestamptz,
  notes text
);

create table public.workout_exercises (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  server_updated_at timestamptz not null default clock_timestamp(),
  workout_id uuid not null references public.workouts (id),
  -- weak and catalog references, no FK
  routine_exercise_id uuid,
  planned_exercise_id uuid,
  exercise_id uuid not null,
  position int not null,
  status text not null check (status in ('pending', 'done', 'skipped')),
  -- copies of the prescription and of the exercise attributes (RN-ENT-08)
  role text not null check (role in ('main', 'accessory')),
  sets int not null check (sets between 1 and 10),
  rep_min int not null check (rep_min between 1 and 30),
  rep_max int not null check (rep_max between 1 and 30),
  rest_seconds int not null check (rest_seconds between 30 and 600 and rest_seconds % 15 = 0),
  target_rir int not null check (target_rir between 0 and 5),
  load_type text not null check (load_type in ('external', 'bodyweight')),
  is_unilateral boolean not null,
  constraint workout_exercises_rep_range check (rep_max >= rep_min)
);

create table public.workout_sets (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  server_updated_at timestamptz not null default clock_timestamp(),
  workout_exercise_id uuid not null references public.workout_exercises (id),
  position int not null,
  -- kg, unrounded (RN-PERF-05); null for bodyweight (I-06)
  load_kg double precision check (load_kg between 0 and 1000),
  reps int check (reps between 0 and 100),
  rir int check (rir between 0 and 5),
  reps_left int check (reps_left between 0 and 100),
  reps_right int check (reps_right between 0 and 100),
  rir_left int check (rir_left between 0 and 5),
  rir_right int check (rir_right between 0 and 5),
  is_warmup boolean not null,
  completed_at timestamptz not null,
  -- I-05: either bilateral or unilateral, never both
  constraint workout_sets_laterality check (
    (reps is not null and reps_left is null and reps_right is null and rir_left is null and rir_right is null)
    or (reps is null and rir is null and reps_left is not null and reps_right is not null)
  )
);

-- ── Indexes: the FKs, and (user_id, server_updated_at, id) for the keyset pull ──

create index routine_days_routine_idx on public.routine_days (routine_id);
create index routine_exercises_day_idx on public.routine_exercises (routine_day_id);
create index workout_exercises_workout_idx on public.workout_exercises (workout_id);
create index workout_sets_workout_exercise_idx on public.workout_sets (workout_exercise_id);

create index profiles_pull_idx on public.profiles (user_id, server_updated_at, id);
create index routines_pull_idx on public.routines (user_id, server_updated_at, id);
create index routine_days_pull_idx on public.routine_days (user_id, server_updated_at, id);
create index routine_exercises_pull_idx on public.routine_exercises (user_id, server_updated_at, id);
create index workouts_pull_idx on public.workouts (user_id, server_updated_at, id);
create index workout_exercises_pull_idx on public.workout_exercises (user_id, server_updated_at, id);
create index workout_sets_pull_idx on public.workout_sets (user_id, server_updated_at, id);

-- ── RLS: each user sees and writes only their rows (RNF-06) ──

alter table public.profiles enable row level security;
alter table public.routines enable row level security;
alter table public.routine_days enable row level security;
alter table public.routine_exercises enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.workout_sets enable row level security;

create policy "own rows" on public.profiles for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own rows" on public.routines for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own rows" on public.routine_days for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own rows" on public.routine_exercises for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own rows" on public.workouts for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own rows" on public.workout_exercises for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own rows" on public.workout_sets for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ── Triggers ──

create trigger sync_before_write before insert or update on public.profiles
  for each row execute function public.sync_before_write();
create trigger sync_before_write before insert or update on public.routines
  for each row execute function public.sync_before_write();
create trigger sync_before_write before insert or update on public.routine_days
  for each row execute function public.sync_before_write('routines', 'routine_id');
create trigger sync_before_write before insert or update on public.routine_exercises
  for each row execute function public.sync_before_write('routine_days', 'routine_day_id');
create trigger sync_before_write before insert or update on public.workouts
  for each row execute function public.sync_before_write();
create trigger sync_before_write before insert or update on public.workout_exercises
  for each row execute function public.sync_before_write('workouts', 'workout_id');
create trigger sync_before_write before insert or update on public.workout_sets
  for each row execute function public.sync_before_write('workout_exercises', 'workout_exercise_id');

create trigger sync_cascade_delete after update of deleted_at on public.routines
  for each row execute function public.sync_cascade_delete('routine_days', 'routine_id');
create trigger sync_cascade_delete after update of deleted_at on public.routine_days
  for each row execute function public.sync_cascade_delete('routine_exercises', 'routine_day_id');
create trigger sync_cascade_delete after update of deleted_at on public.workouts
  for each row execute function public.sync_cascade_delete('workout_exercises', 'workout_id');
create trigger sync_cascade_delete after update of deleted_at on public.workout_exercises
  for each row execute function public.sync_cascade_delete('workout_sets', 'workout_exercise_id');
