create table if not exists public.route_usage_daily (
  route_key text not null check (
    char_length(route_key) between 1 and 140
    and route_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  usage_date date not null default current_date,
  source text not null check (source in ('route_page', 'map')),
  consultation_count integer not null default 1 check (consultation_count > 0),
  updated_at timestamptz not null default now(),
  primary key (route_key, usage_date, source)
);

create index if not exists route_usage_daily_recent_idx
  on public.route_usage_daily (usage_date desc, consultation_count desc);

alter table public.route_usage_daily enable row level security;
revoke all on table public.route_usage_daily from public, anon, authenticated;
grant select, insert, update, delete on table public.route_usage_daily to service_role;

create or replace function public.record_route_consultation(
  p_route_key text,
  p_source text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_route_key is null
    or char_length(p_route_key) not between 1 and 140
    or p_route_key !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    or p_source is null
    or p_source not in ('route_page', 'map') then
    raise exception 'invalid route consultation parameters';
  end if;

  insert into public.route_usage_daily as usage (
    route_key,
    usage_date,
    source,
    consultation_count,
    updated_at
  ) values (
    p_route_key,
    current_date,
    p_source,
    1,
    clock_timestamp()
  )
  on conflict (route_key, usage_date, source) do update
  set
    consultation_count = least(usage.consultation_count + 1, 2147483647),
    updated_at = clock_timestamp();
end;
$$;

create or replace function public.get_popular_routes(
  p_days integer default 30,
  p_limit integer default 4
)
returns table (
  route_key text,
  consultation_count bigint
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if p_days is null
    or p_days not between 1 and 365
    or p_limit is null
    or p_limit not between 1 and 40 then
    raise exception 'invalid popular route parameters';
  end if;

  return query
  select
    usage.route_key,
    sum(usage.consultation_count)::bigint as consultation_count
  from public.route_usage_daily as usage
  where usage.usage_date >= current_date - (p_days - 1)
  group by usage.route_key
  order by consultation_count desc, max(usage.updated_at) desc, usage.route_key
  limit p_limit;
end;
$$;

revoke all on function public.record_route_consultation(text, text)
  from public, anon, authenticated;
grant execute on function public.record_route_consultation(text, text)
  to service_role;

revoke all on function public.get_popular_routes(integer, integer)
  from public, anon, authenticated;
grant execute on function public.get_popular_routes(integer, integer)
  to service_role;

comment on table public.route_usage_daily is
  'Anonymous daily route consultation totals. Stores no visitor, device, IP, or location identifiers.';
comment on function public.record_route_consultation(text, text) is
  'Atomically increments an anonymous daily route consultation total.';
comment on function public.get_popular_routes(integer, integer) is
  'Returns the most consulted routes over a bounded rolling window.';
