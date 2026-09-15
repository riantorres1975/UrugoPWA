-- Safe to run on an existing database: unique test keys, all writes rolled back.
begin;
set local role service_role;
do $verify$
declare
  k text := '__verify_feedback_' || gen_random_uuid()::text;
  r text;
  summary jsonb;
begin
  foreach r in array array['boarding_far', 'alighting_far', 'walking_blocked'] loop
    perform public.record_journey_feedback(array[k], array['Verification'], repeat('a',32), false, r);
    assert (select reason = r from public.journey_feedback where route_keys = array[k]), 'reason not stored';
    summary := public.journey_feedback_summary(now() - interval '1 minute', now() + interval '1 minute');
    assert (select (g->>r)::int = 1 from jsonb_array_elements(summary->'groups') g where g->'route_keys' = to_jsonb(array[k])), 'reason not aggregated';
    begin
      perform public.record_journey_feedback(array[k], array['Verification'], repeat('b',32), true, r);
      raise exception 'positive reason accepted';
    exception when check_violation then null; end;
  end loop;
  assert (select count(*) = 1 from public.journey_feedback where route_keys = array[k]), 'reason update duplicated vote';
end;
$verify$;
reset role;
do $verify$
begin
  assert not has_table_privilege('anon', 'public.journey_feedback', 'select'), 'anon can read';
  assert not has_table_privilege('authenticated', 'public.journey_feedback', 'insert'), 'authenticated can insert';
  assert not has_function_privilege('anon', 'public.record_journey_feedback(text[],text[],text,boolean,text)', 'execute'), 'anon can call write RPC';
  assert not has_function_privilege('authenticated', 'public.journey_feedback_summary(timestamptz,timestamptz)', 'execute'), 'authenticated can read summary';
  assert (select relrowsecurity from pg_class where oid = 'public.journey_feedback'::regclass), 'RLS disabled';
end;
$verify$;
rollback;
