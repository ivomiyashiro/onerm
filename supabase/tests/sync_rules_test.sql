-- The mandatory SQL tests of 07 §3 (LWW, delete wins, bounded updated_at, RLS), on routines
-- (parent) and routine_days (child).
begin;
create extension if not exists pgtap with schema extensions;
select plan(19);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.local'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.local');

create function pg_temp.login(uid uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

select pg_temp.login('00000000-0000-0000-0000-00000000000a');

-- 1. New row: accepted, server assigns server_updated_at
insert into public.routines (id, created_at, updated_at, name)
values ('10000000-0000-0000-0000-000000000001', '2026-10-01 10:00Z', '2026-10-01 10:00Z', 'v1');
select is((select name from public.routines where id = '10000000-0000-0000-0000-000000000001'),
          'v1', 'new row is accepted');
select ok((select server_updated_at > '2026-10-01 10:00Z' from public.routines
           where id = '10000000-0000-0000-0000-000000000001'), 'server assigns server_updated_at');

-- 2. Update that wins
update public.routines set name = 'v2', updated_at = '2026-10-01 11:00Z'
where id = '10000000-0000-0000-0000-000000000001';
select is((select name from public.routines where id = '10000000-0000-0000-0000-000000000001'),
          'v2', 'newer update wins');

-- 3. Update that loses, and a tie (the server wins); the cursor still moves
select server_updated_at as before_cursor from public.routines
  where id = '10000000-0000-0000-0000-000000000001' \gset
update public.routines set name = 'old', updated_at = '2026-10-01 10:30Z'
where id = '10000000-0000-0000-0000-000000000001';
select is((select name from public.routines where id = '10000000-0000-0000-0000-000000000001'),
          'v2', 'older update loses');
select ok((select server_updated_at > :'before_cursor' from public.routines
           where id = '10000000-0000-0000-0000-000000000001'), 'a losing update still moves the cursor');
update public.routines set name = 'tie', updated_at = '2026-10-01 11:00Z'
where id = '10000000-0000-0000-0000-000000000001';
select is((select name from public.routines where id = '10000000-0000-0000-0000-000000000001'),
          'v2', 'tie: server wins');

-- 4. updated_at from the future is clamped, the change is still applied
update public.routines set name = 'future', updated_at = now() + interval '1 day'
where id = '10000000-0000-0000-0000-000000000001';
select ok((select updated_at <= now() + interval '5 minutes' from public.routines
           where id = '10000000-0000-0000-0000-000000000001'), 'future updated_at is clamped');
select is((select name from public.routines where id = '10000000-0000-0000-0000-000000000001'),
          'future', 'clamped update is still applied');

-- 5. Tombstone over a live row: accepted with an old updated_at, keeps the greatest, and propagates
insert into public.routine_days (id, created_at, updated_at, routine_id, name, position)
values ('20000000-0000-0000-0000-000000000001', '2026-10-01 10:00Z', '2026-10-01 10:00Z',
        '10000000-0000-0000-0000-000000000001', 'Day A', 1);
update public.routines set deleted_at = '2026-09-01 00:00Z', updated_at = '2026-09-01 00:00Z'
where id = '10000000-0000-0000-0000-000000000001';
select isnt((select deleted_at from public.routines where id = '10000000-0000-0000-0000-000000000001'),
            null, 'tombstone wins regardless of updated_at');
select ok((select updated_at >= '2026-10-01 11:00Z' from public.routines
           where id = '10000000-0000-0000-0000-000000000001'), 'tombstone keeps the greatest updated_at');
select isnt((select deleted_at from public.routine_days where id = '20000000-0000-0000-0000-000000000001'),
            null, 'delete propagates to the children');

-- 6. Update over a tombstone is ignored and deleted_at can't be cleared
update public.routines set deleted_at = null, name = 'revived', updated_at = now()
where id = '10000000-0000-0000-0000-000000000001';
select isnt((select deleted_at from public.routines where id = '10000000-0000-0000-0000-000000000001'),
            null, 'a tombstone cannot be revived');
select isnt((select name from public.routines where id = '10000000-0000-0000-0000-000000000001'),
            'revived', 'update over a tombstone is ignored');

-- 7. Child with a deleted parent is born deleted
insert into public.routine_days (id, created_at, updated_at, routine_id, name, position)
values ('20000000-0000-0000-0000-000000000002', now(), now(), '10000000-0000-0000-0000-000000000001', 'Day B', 2);
select isnt((select deleted_at from public.routine_days where id = '20000000-0000-0000-0000-000000000002'),
            null, 'child of a deleted parent is born deleted');

-- 8. Foreign user_id: replaced on insert, never changed on update
insert into public.routines (id, user_id, created_at, updated_at, name)
values ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000b', now(), now(), 'x');
select is((select user_id from public.routines where id = '10000000-0000-0000-0000-000000000002'),
          '00000000-0000-0000-0000-00000000000a'::uuid, 'foreign user_id is replaced by auth.uid()');
update public.routines set user_id = '00000000-0000-0000-0000-00000000000b', updated_at = now() + interval '1 second'
where id = '10000000-0000-0000-0000-000000000002';
select is((select user_id from public.routines where id = '10000000-0000-0000-0000-000000000002'),
          '00000000-0000-0000-0000-00000000000a'::uuid, 'owner never changes');

-- 9. RLS: B sees and changes nothing of A, and can't hang a child under A's parent
select pg_temp.login('00000000-0000-0000-0000-00000000000b');
select is((select count(*) from public.routines), 0::bigint, 'B cannot read A rows');
update public.routines set name = 'hacked', updated_at = now() + interval '1 minute';
select throws_ok(
  $$insert into public.routine_days (id, created_at, updated_at, routine_id, name, position)
    values ('20000000-0000-0000-0000-000000000003', now(), now(), '10000000-0000-0000-0000-000000000002', 'x', 1)$$,
  '42501', null, 'B cannot attach a child to A''s parent');
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
select is((select name from public.routines where id = '10000000-0000-0000-0000-000000000002'),
          'x', 'B cannot update A rows');

select * from finish();
rollback;
