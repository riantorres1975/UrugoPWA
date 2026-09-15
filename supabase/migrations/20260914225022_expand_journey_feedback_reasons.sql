-- Backward-compatible extension: existing votes and RPC signatures are preserved.
alter table public.journey_feedback drop constraint journey_feedback_reason_check;
alter table public.journey_feedback add constraint journey_feedback_reason_check
  check (reason in ('bus_missing', 'route_incorrect', 'transfer_far', 'boarding_far', 'alighting_far', 'walking_blocked', 'other'));

create or replace function public.journey_feedback_summary(p_from timestamptz, p_until timestamptz)
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
      count(*) filter (where reason = 'boarding_far') as boarding_far,
      count(*) filter (where reason = 'alighting_far') as alighting_far,
      count(*) filter (where reason = 'walking_blocked') as walking_blocked,
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

comment on table public.journey_feedback is 'Daily journey usefulness votes without coordinates or raw device identifiers. Aggregated evidence guides reviews and bounded recommendation adjustments.';
