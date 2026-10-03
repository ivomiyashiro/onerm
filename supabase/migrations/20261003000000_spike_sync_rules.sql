-- SPIKE #12: sync rules of 07 §3 on two sample tables.

create table public.workouts (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  server_updated_at timestamptz not null default clock_timestamp(),
  routine_name_snapshot text not null,
  status text not null check (status in ('finished'))
);

create table public.workout_sets (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  server_updated_at timestamptz not null default clock_timestamp(),
  workout_id uuid not null references public.workouts (id),
  position int not null,
  load_kg numeric(6, 2) check (load_kg between 0 and 1000),
  reps int check (reps between 0 and 100)
);

create index workout_sets_workout_id_idx on public.workout_sets (workout_id);
create index workouts_pull_idx on public.workouts (user_id, server_updated_at, id);
create index workout_sets_pull_idx on public.workout_sets (user_id, server_updated_at, id);

alter table public.workouts enable row level security;
alter table public.workout_sets enable row level security;

create policy "own rows" on public.workouts
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own rows" on public.workout_sets
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- BEFORE INSERT OR UPDATE, shared by every user table. Optional args: parent table and FK column.
-- Steps a–j of 07 §3; the order matters.
create function public.sync_before_write() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  parent_deleted boolean;
begin
  -- a. the server assigns the pull cursor
  new.server_updated_at := clock_timestamp();
  -- b. clamp updated_at more than 5 min in the future (RN-SYNC-03)
  if new.updated_at > now() + interval '5 minutes' then
    new.updated_at := now();
  end if;
  -- c. a child of a deleted parent is born or stays deleted (RN-SYNC-12)
  if tg_nargs = 2 then
    execute format('select deleted_at is not null from public.%I where id = $1', tg_argv[0])
      into parent_deleted
      using (to_jsonb(new) ->> tg_argv[1])::uuid;
    if parent_deleted then
      new.deleted_at := coalesce(new.deleted_at, now());
    end if;
  end if;

  if tg_op = 'INSERT' then
    -- d. nobody writes on behalf of someone else
    new.user_id := auth.uid();
    -- e.
    return new;
  end if;

  -- f. the owner never changes
  new.user_id := old.user_id;
  -- g. a tombstone is terminal
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

-- AFTER UPDATE OF deleted_at: propagate the delete to direct children (RN-SYNC-12).
-- Args: child table and its FK column.
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

create trigger sync_before_write before insert or update on public.workouts
  for each row execute function public.sync_before_write();
create trigger sync_before_write before insert or update on public.workout_sets
  for each row execute function public.sync_before_write('workouts', 'workout_id');
create trigger sync_cascade_delete after update of deleted_at on public.workouts
  for each row execute function public.sync_cascade_delete('workout_sets', 'workout_id');
