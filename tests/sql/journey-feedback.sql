-- Run against an isolated database with the journey_feedback migration applied.
begin;
set local role service_role;
select public.record_journey_feedback(array['ruta-a','ruta-b'], array['A','B'], repeat('a',32), false, null);
select public.record_journey_feedback(array['ruta-a','ruta-b'], array['A','B'], repeat('a',32), false, 'transfer_far');
select public.record_journey_feedback(array['ruta-a','ruta-b'], array['A','B'], repeat('a',32), false, null);
do $$ begin
  assert (select count(*) from public.journey_feedback) = 1, 'retry duplicated vote';
  assert (select reason from public.journey_feedback) = 'transfer_far', 'retry erased reason';
end $$;
select public.record_journey_feedback(array['ruta-b','ruta-a'], array['B','A'], repeat('a',32), true, null);
select public.record_journey_feedback(array['ruta-a','ruta-b'], array['A','B'], repeat('b',32), true, null);
do $$ declare summary jsonb; begin
  assert (select count(*) from public.journey_feedback) = 3, 'device or direction collapsed';
  summary := public.journey_feedback_summary(now() - interval '1 day', now() + interval '1 day');
  assert jsonb_array_length(summary->'groups') = 2, 'wrong number of groups';
  assert (summary->'groups'->0->>'negative')::int = 1, 'negative count incorrect';
  assert (summary->'groups'->0->>'transfer_far')::int = 1, 'reason count incorrect';
  assert (summary->'groups'->0->>'total')::int = 2, 'total count incorrect';
  begin
    perform public.record_journey_feedback(array['ruta-a'], array['A'], repeat('a',32), true, 'other');
    raise exception 'invalid positive reason accepted';
  exception when check_violation then null; end;
  begin
    perform public.record_journey_feedback(array['ruta-a'], array['A'], repeat('a',32), false, 'transfer_far');
    raise exception 'transfer reason accepted for direct route';
  exception when check_violation then null; end;
end $$;
reset role;
do $$ begin
  assert not has_table_privilege('anon', 'public.journey_feedback', 'select'), 'anon can read';
  assert not has_table_privilege('authenticated', 'public.journey_feedback', 'insert'), 'authenticated can insert';
  assert not has_function_privilege('anon', 'public.record_journey_feedback(text[],text[],text,boolean,text)', 'execute'), 'anon can call write RPC';
  assert not has_function_privilege('authenticated', 'public.journey_feedback_summary(timestamptz,timestamptz)', 'execute'), 'authenticated can read summary';
  assert (select relrowsecurity from pg_class where oid = 'public.journey_feedback'::regclass), 'RLS disabled';
end $$;
rollback;
