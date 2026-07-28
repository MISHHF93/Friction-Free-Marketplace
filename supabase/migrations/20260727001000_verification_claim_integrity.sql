begin;

drop policy if exists user_verification_checks_owner_insert on public.user_verification_checks;

create policy user_verification_checks_owner_insert
on public.user_verification_checks
for insert
with check (
  user_id = auth.uid()
  and status = 'pending'
  and provider = 'marketplace_self_attested'
  and provider_check_id is null
  and verified_at is null
  and expires_at is null
  and failure_reason is null
  or public.current_user_is_admin()
);

comment on policy user_verification_checks_owner_insert on public.user_verification_checks is
  'Users may only submit pending self-attested checks. Only administrators/service integrations may assert provider verification.';

commit;
