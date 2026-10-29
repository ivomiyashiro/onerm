-- Server rules beyond LWW: only finished workouts (RN-SYNC-13), profile id = user_id
-- (RN-AUTH-06), read-only catalog and app_config (RN-SYNC-14, RNF-08), one sign-in method
-- (RN-AUTH-03), and the data checks of 07 §2.2.
begin;
create extension if not exists pgtap with schema extensions;
select plan(19);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.local');

create function pg_temp.login(uid uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

-- Catalog fixtures, written as the seed would (service_role: the test runs as postgres)
insert into public.exercises (id, slug, name, load_type, primary_muscles, primary_equipment, equipment, mechanic, is_unilateral)
values ('30000000-0000-0000-0000-000000000001', 'leg-press', 'Leg press', 'external', '["quads"]', 'machine', '["machine"]', 'compound', false);
insert into public.routine_templates (id, name, level, days_per_week, estimated_minutes, rationale)
values ('PLT-1', 'Full body', 'novice', 3, 60, 'x');

-- #306: the machine comes from the vocabulary and the video is https, also for the seed
select throws_ok(
  $$update public.exercises set machine = 'rowing-boat' where id = '30000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'a machine outside the vocabulary is rejected (#306)');
select throws_ok(
  $$update public.exercises set video_url = 'http://example.com/v' where id = '30000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'a video that is not https is rejected (#306)');

-- Anonymous: reads the catalog and app_config, writes nothing, sees no user data
set local role anon;
select is((select count(*) from public.exercises where id = '30000000-0000-0000-0000-000000000001'), 1::bigint, 'anonymous reads the catalog');
select is((select count(*) from public.routine_templates where id = 'PLT-1'), 1::bigint, 'anonymous reads the templates');
select is((select min_app_version from public.app_config), '0.0.0', 'anonymous reads the minimum app version');
select throws_ok($$update public.app_config set min_app_version = '99.0.0'$$, '42501', null,
                 'anonymous cannot write app_config');
select throws_ok($$select * from public.exercise_source_refs$$, '42501', null,
                 'exercise_source_refs is not readable by the app');
reset role;

select pg_temp.login('00000000-0000-0000-0000-00000000000a');

-- Authenticated: the same read, no write
select is((select count(*) from public.exercises where id = '30000000-0000-0000-0000-000000000001'), 1::bigint, 'a user reads the catalog');
select throws_ok(
  $$insert into public.exercises (id, slug, name, load_type, primary_muscles, primary_equipment, equipment, mechanic, is_unilateral)
    values ('30000000-0000-0000-0000-000000000002', 'x', 'X', 'external', '[]', 'machine', '[]', 'compound', false)$$,
  '42501', null, 'a user cannot write the catalog');

-- RN-SYNC-13: only finished workouts
select throws_ok(
  $$insert into public.workouts (id, created_at, updated_at, routine_name_snapshot, day_name_snapshot, status, started_at)
    values ('40000000-0000-0000-0000-000000000001', now(), now(), 'r', 'd', 'in_progress', now())$$,
  '23514', null, 'an in-progress workout is rejected (RN-SYNC-13)');
select lives_ok(
  $$insert into public.workouts (id, created_at, updated_at, routine_name_snapshot, day_name_snapshot, status, started_at, finished_at)
    values ('40000000-0000-0000-0000-000000000002', now(), now(), 'r', 'd', 'finished', now(), now())$$,
  'a finished workout is accepted');

select throws_ok(
  $$insert into public.workouts (id, created_at, updated_at, routine_name_snapshot, day_name_snapshot, status, started_at)
    values ('40000000-0000-0000-0000-000000000003', now(), now(), 'r', 'd', 'finished', now())$$,
  '23514', null, 'a finished workout without finished_at is rejected');

-- RN-AUTH-06: the profile id is the user id, and there is one per user
select throws_ok(
  $$insert into public.profiles (id, created_at, updated_at, level, goal, days_per_week, unit, effort_mode,
      effort_mode_explicit, load_increments_kg, load_increments_lb, bar_weight_kg, bar_weight_lb)
    values ('50000000-0000-0000-0000-000000000001', now(), now(), 'novice', 'health', 3, 'kg', 'simple',
      false, '{}', '{}', 20, 45)$$,
  '23514', null, 'a profile whose id is not the user id is rejected (RN-AUTH-06)');
select lives_ok(
  $$insert into public.profiles (id, created_at, updated_at, level, goal, days_per_week, unit, effort_mode,
      effort_mode_explicit, load_increments_kg, load_increments_lb, bar_weight_kg, bar_weight_lb)
    values ('00000000-0000-0000-0000-00000000000a', now(), now(), 'novice', 'health', 3, 'kg', 'simple',
      false, '{}', '{}', 20, 45)$$,
  'a profile with id = user id is accepted');

-- 07 §2.2 checks the client's CHECKs also enforce
select throws_ok(
  $$insert into public.routines (id, created_at, updated_at, name)
    values ('10000000-0000-0000-0000-000000000001', now(), now(), '   ')$$,
  '23514', null, 'a blank routine name is rejected');
select throws_ok(
  $$insert into public.workout_sets (id, created_at, updated_at, workout_exercise_id, position, load_kg, reps, reps_left, reps_right, is_warmup, completed_at)
    values ('60000000-0000-0000-0000-000000000001', now(), now(), '60000000-0000-0000-0000-000000000009', 1, 50, 8, 8, 8, false, now())$$,
  '23514', null, 'a set that is both bilateral and unilateral is rejected (I-05)');

-- RN-AUTH-03: a second identity of another provider is rejected
reset role;
insert into auth.identities (provider_id, user_id, identity_data, provider)
values ('a@test.local', '00000000-0000-0000-0000-00000000000a', '{}', 'email');
select throws_ok(
  $$insert into auth.identities (provider_id, user_id, identity_data, provider)
    values ('google-sub-1', '00000000-0000-0000-0000-00000000000a', '{}', 'google')$$,
  'P0001', null, 'a second identity of another provider is rejected (RN-AUTH-03)');
select is(public.sign_in_method_for_email('A@test.local'), 'email', 'the sign-in method of an email is found');
select is(public.sign_in_method_for_email('nobody@test.local'), null, 'an unknown email has no method');

select * from finish();
rollback;
