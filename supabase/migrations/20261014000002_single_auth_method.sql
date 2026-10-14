-- RN-AUTH-03: one sign-in method per account (spike #16). GoTrue links a verified Google identity
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

-- The client only gets a generic error from the trigger, so it asks which method an email uses to
-- show the messages of RN-AUTH-03. It reveals whether the email exists, accepted in RN-AUTH-02.
-- Returns 'email', 'google' (the provider name) or null.
create function public.sign_in_method_for_email(p_email text) returns text
language sql
security definer
stable
set search_path = ''
as $$
  select i.provider
  from auth.identities i
  join auth.users u on u.id = i.user_id
  where lower(u.email) = lower(p_email)
  limit 1;
$$;

revoke execute on function public.reject_second_identity() from public, anon, authenticated;
revoke execute on function public.sign_in_method_for_email(text) from public;
grant execute on function public.sign_in_method_for_email(text) to anon, authenticated;
