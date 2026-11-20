-- Read-only launch preflight. Safe to run on production.

select version
from supabase_migrations.schema_migrations
order by version;

select c.relname as table_name
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relrowsecurity = false
order by c.relname;

select count(*) as seed_or_example_users
from public.users
where email::text ilike '%@example.com'
   or id in (
     '11111111-1111-4111-8111-111111111111',
     '22222222-2222-4222-8222-222222222222'
   );

select count(*) as active_categories
from public.categories
where is_active = true;
