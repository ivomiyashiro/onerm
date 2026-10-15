-- A finished workout always has its finish time (RN-SYNC-13, 07 §2.2). Written so it keeps being
-- right if the set of statuses ever grows. Additive: the only thing it can reject is a row that no
-- client produces.
alter table public.workouts
  add constraint workouts_finished_has_finished_at
  check (status <> 'finished' or finished_at is not null);
