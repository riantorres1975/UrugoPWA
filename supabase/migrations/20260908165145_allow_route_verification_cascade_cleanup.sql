create or replace function private.prevent_route_verification_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Preserve the declared FK cascade so privileged route fixture cleanup can
  -- remove its dependent history without allowing direct history mutations.
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then
    return old;
  end if;

  raise exception 'route field verifications are immutable';
end;
$$;
