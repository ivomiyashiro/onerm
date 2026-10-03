-- SPIKE #12: the mandatory SQL tests of 07 §3.
begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.local'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.local');

create function pg_temp.login(uid uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

-- User A
select pg_temp.login('00000000-0000-0000-0000-00000000000a');

-- 1. New row: accepted, owner forced to auth.uid(), server_updated_at assigned
insert into public.workouts (id, user_id, created_at, updated_at, routine_name_snapshot, status)
values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a',
        '2026-10-01 10:00Z', '2026-10-01 10:00Z', 'v1', 'finished');
select is((select routine_name_snapshot from public.workouts where id = '10000000-0000-0000-0000-000000000001'),
          'v1', 'new row is accepted');
select isnt((select server_updated_at from public.workouts where id = '10000000-0000-0000-0000-000000000001'),
            null, 'server assigns server_updated_at');

-- 2. Update that wins (newer updated_at)
update public.workouts set routine_name_snapshot = 'v2', updated_at = '2026-10-01 11:00Z'
where id = '10000000-0000-0000-0000-000000000001';
select is((select routine_name_snapshot from public.workouts where id = '10000000-0000-0000-0000-000000000001'),
          'v2', 'newer update wins');

-- 3. Update that loses (older) and tie (server wins)
update public.workouts set routine_name_snapshot = 'old', updated_at = '2026-10-01 10:30Z'
where id = '10000000-0000-0000-0000-000000000001';
select is((select routine_name_snapshot from public.workouts where id = '10000000-0000-0000-0000-000000000001'),
          'v2', 'older update loses');
update public.workouts set routine_name_snapshot = 'tie', updated_at = '2026-10-01 11:00Z'
where id = '10000000-0000-0000-0000-000000000001';
select is((select routine_name_snapshot from public.workouts where id = '10000000-0000-0000-0000-000000000001'),
          'v2', 'tie: server wins');

-- 4. updated_at from the future is clamped
update public.workouts set routine_name_snapshot = 'future', updated_at = now() + interval '1 day'
where id = '10000000-0000-0000-0000-000000000001';
select ok((select updated_at <= now() + interval '5 minutes' from public.workouts
           where id = '10000000-0000-0000-0000-000000000001'), 'future updated_at is clamped');
select is((select routine_name_snapshot from public.workouts where id = '10000000-0000-0000-0000-000000000001'),
          'future', 'clamped update is still applied');

-- 5. Tombstone over a live row: accepted even with an old updated_at; children are deleted too
insert into public.workout_sets (id, created_at, updated_at, workout_id, position, reps)
values ('20000000-0000-0000-0000-000000000001', '2026-10-01 10:00Z', '2026-10-01 10:00Z',
        '10000000-0000-0000-0000-000000000001', 1, 8);
update public.workouts set deleted_at = '2026-09-01 00:00Z', updated_at = '2026-09-01 00:00Z'
where id = '10000000-0000-0000-0000-000000000001';
select isnt((select deleted_at from public.workouts where id = '10000000-0000-0000-0000-000000000001'),
            null, 'tombstone wins regardless of updated_at');
select ok((select updated_at >= '2026-10-01 11:00Z' from public.workouts
           where id = '10000000-0000-0000-0000-000000000001'), 'tombstone keeps the greatest updated_at');
select isnt((select deleted_at from public.workout_sets where id = '20000000-0000-0000-0000-000000000001'),
            null, 'delete propagates to children');

-- 6. Update over a tombstone: ignored, deleted_at can't be cleared
update public.workouts set deleted_at = null, routine_name_snapshot = 'revived', updated_at = now()
where id = '10000000-0000-0000-0000-000000000001';
select isnt((select deleted_at from public.workouts where id = '10000000-0000-0000-0000-000000000001'),
            null, 'a tombstone cannot be revived');
select isnt((select routine_name_snapshot from public.workouts where id = '10000000-0000-0000-0000-000000000001'),
            'revived', 'update over a tombstone is ignored');

-- 7. Child with a deleted parent is born deleted
insert into public.workout_sets (id, created_at, updated_at, workout_id, position, reps)
values ('20000000-0000-0000-0000-000000000002', now(), now(), '10000000-0000-0000-0000-000000000001', 2, 8);
select isnt((select deleted_at from public.workout_sets where id = '20000000-0000-0000-0000-000000000002'),
            null, 'child of a deleted parent is born deleted');

-- 8. Foreign user_id: insert on behalf of B is rewritten to A
insert into public.workouts (id, user_id, created_at, updated_at, routine_name_snapshot, status)
values ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000b', now(), now(), 'x', 'finished');
select is((select user_id from public.workouts where id = '10000000-0000-0000-0000-000000000002'),
          '00000000-0000-0000-0000-00000000000a'::uuid, 'foreign user_id is replaced by auth.uid()');
update public.workouts set user_id = '00000000-0000-0000-0000-00000000000b', updated_at = now() + interval '1 second'
where id = '10000000-0000-0000-0000-000000000002';
select is((select user_id from public.workouts where id = '10000000-0000-0000-0000-000000000002'),
          '00000000-0000-0000-0000-00000000000a'::uuid, 'owner never changes');

-- 9. RLS: B sees and changes nothing of A
select pg_temp.login('00000000-0000-0000-0000-00000000000b');
select is((select count(*) from public.workouts), 0::bigint, 'B cannot read A rows');
update public.workouts set routine_name_snapshot = 'hacked', updated_at = now() + interval '1 minute';
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
select is((select routine_name_snapshot from public.workouts where id = '10000000-0000-0000-0000-000000000002'),
          'x', 'B cannot update A rows');

select * from finish();
rollback;
