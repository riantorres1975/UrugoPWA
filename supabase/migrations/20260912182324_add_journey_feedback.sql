-- Opinion data is private. Only the validated application endpoint and admin use it.
create table public.journey_feedback (
  id uuid primary key default gen_random_uuid(),
  route_keys text[] not null check (cardinality(route_keys) between 1 and 2),
  route_names text[] not null check (cardinality(route_names) = cardinality(route_keys)),
  useful boolean not null,
  reason text check (reason in ('bus_missing', 'route_incorrect', 'transfer_far', 'other')),
  device_hash text not null check (length(device_hash) = 32),
  feedback_day date not null default (now() at time zone 'America/Mexico_City')::date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (reason is null or not useful),
  check (reason is distinct from 'transfer_far' or cardinality(route_keys) = 2),
  unique (device_hash, route_keys, feedback_day)
);
create index journey_feedback_created_idx on public.journey_feedback (created_at desc);
alter table public.journey_feedback enable row level security;
revoke all on public.journey_feedback from public, anon, authenticated;
grant select, insert, update on public.journey_feedback to service_role;

-- Atomic deduplication: retrying or adding a reason updates the same daily vote.
create function public.record_journey_feedback(
  p_route_keys text[], p_route_names text[], p_device_hash text,
  p_useful boolean, p_reason text default null
) returns void language sql security invoker set search_path = '' as $$
  insert into public.journey_feedback (route_keys, route_names, device_hash, useful, reason)
  values (p_route_keys, p_route_names, p_device_hash, p_useful, p_reason)
  on conflict (device_hash, route_keys, feedback_day) do update
    set useful = excluded.useful,
        reason = case when excluded.useful then null else coalesce(excluded.reason, journey_feedback.reason) end,
        updated_at = now();
$$;
revoke all on function public.record_journey_feedback(text[], text[], text, boolean, text) from public, anon, authenticated;
grant execute on function public.record_journey_feedback(text[], text[], text, boolean, text) to service_role;

-- Aggregate in Postgres so totals never depend on the Data API row limit.
create function public.journey_feedback_summary(p_from timestamptz, p_until timestamptz)
returns jsonb language sql stable security invoker set search_path = '' as $$
  with selected as (
    select * from public.journey_feedback where created_at >= p_from and created_at < p_until
  ), grouped as (
    select route_keys, max(route_names) as route_names,
      count(*) as total, count(*) filter (where useful) as positive,
      count(*) filter (where not useful) as negative,
      count(*) filter (where reason = 'bus_missing') as bus_missing,
      count(*) filter (where reason = 'route_incorrect') as route_incorrect,
      count(*) filter (where reason = 'transfer_far') as transfer_far,
      count(*) filter (where reason = 'other') as other,
      count(*) filter (where not useful and reason is null) as unspecified
    from selected group by route_keys
  ), previous as (
    select count(*) as total, count(*) filter (where useful) as positive
    from public.journey_feedback
    where created_at >= p_from - (p_until - p_from) and created_at < p_from
  )
  select jsonb_build_object(
    'groups', coalesce((select jsonb_agg(to_jsonb(g) order by g.negative desc, g.total desc, g.route_keys) from grouped g), '[]'::jsonb),
    'previous', (select to_jsonb(p) from previous p)
  );
$$;
revoke all on function public.journey_feedback_summary(timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.journey_feedback_summary(timestamptz, timestamptz) to service_role;

comment on table public.journey_feedback is 'Daily journey usefulness votes, no coordinates or raw device identifiers. Does not alter route recommendations.';
