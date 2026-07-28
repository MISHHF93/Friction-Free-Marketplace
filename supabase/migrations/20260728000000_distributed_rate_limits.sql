create table if not exists public.rate_limit_counters (
  policy_name text not null,
  key_hash text not null check (length(key_hash) = 64),
  request_count integer not null check (request_count > 0),
  reset_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (policy_name, key_hash)
);

alter table public.rate_limit_counters enable row level security;
revoke all on table public.rate_limit_counters from public, anon, authenticated;

create or replace function public.consume_rate_limit(
  p_key_hash text,
  p_policy_name text,
  p_window_seconds integer,
  p_request_limit integer
)
returns table (allowed boolean, remaining integer, reset_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_reset_at timestamptz;
begin
  if length(p_key_hash) <> 64
     or p_policy_name !~ '^[a-z0-9][a-z0-9_-]{1,63}$'
     or p_window_seconds < 1
     or p_window_seconds > 86400
     or p_request_limit < 1
     or p_request_limit > 10000 then
    raise exception 'Invalid rate-limit policy';
  end if;

  insert into public.rate_limit_counters as counters (
    policy_name, key_hash, request_count, reset_at, updated_at
  )
  values (
    p_policy_name, p_key_hash, 1, now() + make_interval(secs => p_window_seconds), now()
  )
  on conflict (policy_name, key_hash) do update
  set request_count = case
        when counters.reset_at <= now() then 1
        else counters.request_count + 1
      end,
      reset_at = case
        when counters.reset_at <= now() then now() + make_interval(secs => p_window_seconds)
        else counters.reset_at
      end,
      updated_at = now()
  returning counters.request_count, counters.reset_at
  into v_count, v_reset_at;

  allowed := v_count <= p_request_limit;
  remaining := greatest(0, p_request_limit - v_count);
  reset_at := v_reset_at;
  return next;
end;
$$;

revoke all on function public.consume_rate_limit(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, text, integer, integer) to service_role;

create index if not exists rate_limit_counters_reset_at_idx
  on public.rate_limit_counters (reset_at);
