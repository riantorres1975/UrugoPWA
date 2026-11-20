-- PostgREST 14 automatically retries 40001. A deterministic stale version can
-- therefore keep one HTTP request retrying indefinitely, even after disconnect.
-- PT409 returns an HTTP conflict once. Preserve each function's existing body,
-- signature, owner, search_path, SECURITY INVOKER setting and EXECUTE grants.
do $migration$
declare
  target record;
  definition text;
  function_count integer := 0;
begin
  for target in
    select p.oid, p.proname
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f'
      and p.proname = any(array[
        'publish_route_revision', 'record_route_field_verification',
        'save_route_editor_draft', 'review_support_contribution',
        'update_support_privacy', 'rotate_support_access',
        'save_support_monthly_goal'
      ])
  loop
    definition := pg_get_functiondef(target.oid);
    if position('''40001''' in definition) > 0 then
      execute replace(definition, '''40001''', '''PT409''');
    elsif position('''PT409''' in definition) = 0 then
      raise exception 'Expected version conflict guard in %', target.proname;
    end if;
    function_count := function_count + 1;
  end loop;
  if function_count <> 7 then
    raise exception 'Expected 7 version-checked RPC functions, found %', function_count;
  end if;
end;
$migration$;
