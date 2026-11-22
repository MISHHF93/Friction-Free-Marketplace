-- Add ads.manage to the admin permission enum.
-- ALTER TYPE ... ADD VALUE cannot be used in the same transaction as the new
-- value, so this file only changes the enum. The next r11 ads migration
-- grants it and creates the ad tables.

do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'admin_permission'
      and e.enumlabel = 'ads.manage'
  ) then
    alter type public.admin_permission add value 'ads.manage';
  end if;
end $$;
