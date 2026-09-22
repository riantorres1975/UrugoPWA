-- Receipts deduplicate retries; no device identifiers or coordinates are collected.
create table public.trip_activity_receipts (
  id uuid primary key,
  route_keys text[] not null check (cardinality(route_keys) between 1 and 2),
  started_at timestamptz not null,
  arrived_at timestamptz
);
create index trip_activity_receipts_started_idx on public.trip_activity_receipts(started_at);
create table public.trip_activity_daily (
  activity_day date primary key,
  started bigint not null default 0 check (started >= 0),
  arrived bigint not null default 0 check (arrived >= 0)
);
create table public.trip_route_activity_daily (
  activity_day date not null,
  route_key text not null,
  started bigint not null default 0 check (started >= 0),
  primary key (activity_day, route_key)
);
alter table public.trip_activity_receipts enable row level security;
alter table public.trip_activity_daily enable row level security;
alter table public.trip_route_activity_daily enable row level security;
revoke all on public.trip_activity_receipts, public.trip_activity_daily, public.trip_route_activity_daily from public, anon, authenticated;
grant select, insert, update, delete on public.trip_activity_receipts to service_role;
grant select, insert, update on public.trip_activity_daily, public.trip_route_activity_daily to service_role;

create function public.record_trip_activity(p_id uuid, p_route_keys text[], p_started_at timestamptz, p_arrived boolean)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  inserted integer;
  receipt public.trip_activity_receipts;
  day date := (p_started_at at time zone 'America/Mexico_City')::date;
begin
  if p_started_at < now() - interval '24 hours' or p_started_at > now() + interval '1 minute'
    or p_started_at is null or p_arrived is null or p_route_keys is null
    or cardinality(p_route_keys) not between 1 and 2
    or exists (select 1 from unnest(p_route_keys) k where k is null or length(k) not between 1 and 140)
    or (select count(distinct k) from unnest(p_route_keys) k) <> cardinality(p_route_keys)
  then raise exception 'Invalid trip activity'; end if;

  insert into public.trip_activity_receipts(id, route_keys, started_at)
    values(p_id, p_route_keys, p_started_at) on conflict (id) do nothing;
  get diagnostics inserted = row_count;
  select * into receipt from public.trip_activity_receipts where id = p_id for update;
  if receipt.route_keys <> p_route_keys or receipt.started_at <> p_started_at then
    raise exception 'Trip identity cannot change';
  end if;
  if inserted = 1 then
    insert into public.trip_activity_daily(activity_day, started) values(day, 1)
      on conflict (activity_day) do update set started = trip_activity_daily.started + 1;
    insert into public.trip_route_activity_daily(activity_day, route_key, started)
      select day, k, 1 from unnest(p_route_keys) k
      on conflict (activity_day, route_key) do update set started = trip_route_activity_daily.started + 1;
  end if;
  if p_arrived and receipt.arrived_at is null then
    update public.trip_activity_receipts set arrived_at = now() where id = p_id;
    insert into public.trip_activity_daily(activity_day, arrived)
      values((now() at time zone 'America/Mexico_City')::date, 1)
      on conflict (activity_day) do update set arrived = trip_activity_daily.arrived + 1;
  end if;
  -- Expired events are rejected above; removing old receipts cannot count them again.
  delete from public.trip_activity_receipts where started_at < now() - interval '30 days';
end;
$$;
revoke all on function public.record_trip_activity(uuid, text[], timestamptz, boolean) from public, anon, authenticated;
grant execute on function public.record_trip_activity(uuid, text[], timestamptz, boolean) to service_role;

create function public.get_trip_activity_summary()
returns jsonb language sql stable security invoker set search_path = '' as $$
  with calendar as (select (now() at time zone 'America/Mexico_City')::date as day),
  ranked as (
    select route_key,
      sum(started) filter(where activity_day >= c.day - 6) as started,
      coalesce(sum(started) filter(where activity_day < c.day - 6), 0) as previous
    from public.trip_route_activity_daily cross join calendar c
    where activity_day between c.day - 13 and c.day group by route_key
  ), transfers as (
    select route_keys, max(route_names) as names,
      count(*) as total, count(*) filter(where useful) as positive
    from public.journey_feedback
    where created_at >= now() - interval '30 days' and cardinality(route_keys) = 2
    group by route_keys having count(*) >= 10 and count(distinct device_hash) >= 5
      and count(*) filter(where useful)::numeric / count(*) >= 0.7
    order by count(*) filter(where useful)::numeric / count(*) desc, count(*) desc, route_keys limit 3
  )
  select jsonb_build_object(
    'updatedAt', now(), 'day', c.day,
    'today', jsonb_build_object(
      'started', coalesce((select started from public.trip_activity_daily where activity_day = c.day), 0),
      'arrived', coalesce((select arrived from public.trip_activity_daily where activity_day = c.day), 0),
      'routes', (select count(*) from public.trip_route_activity_daily where activity_day = c.day and started > 0)),
    'weeklyTrips', coalesce((select sum(started) from public.trip_activity_daily where activity_day between c.day - 6 and c.day), 0),
    'routes', coalesce((select jsonb_agg(to_jsonb(r) order by r.started desc, r.route_key)
      from (select * from ranked where started >= 3 order by started desc, route_key limit 4) r), '[]'::jsonb),
    'transfers', coalesce((select jsonb_agg(to_jsonb(t)) from transfers t), '[]'::jsonb)
  ) from calendar c;
$$;
revoke all on function public.get_trip_activity_summary() from public, anon, authenticated;
grant execute on function public.get_trip_activity_summary() to service_role;
