-- SPIKE #16: RN-AUTH-03, one sign-in method per account. GoTrue links a verified Google identity
-- to an existing account with the same email; this rejects that second identity.
create function public.reject_second_identity() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from auth.identities
    where user_id = new.user_id and provider <> new.provider
  ) then
    raise exception 'single_auth_method: account already uses another sign-in method'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger reject_second_identity before insert on auth.identities
  for each row execute function public.reject_second_identity();
