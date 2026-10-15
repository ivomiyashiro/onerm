-- A finished workout always has its finish time (RN-SYNC-13, 07 §2.2). Additive: the only thing it
-- can reject is a row that no client produces.
alter table public.workouts
  add constraint workouts_finished_has_finished_at check (finished_at is not null);
