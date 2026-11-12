create table public.route_editor_drafts (
  route_id bigint not null references public.routes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  base_version integer not null check (base_version > 0),
  revision integer not null default 1 check (revision > 0),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object' and octet_length(snapshot::text) <= 1600000),
  updated_at timestamptz not null default now(),
  primary key (route_id, user_id)
);
create table public.route_editor_presence (
  route_id bigint not null references public.routes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null,
  seen_at timestamptz not null default now(),
  primary key (route_id, user_id, session_id)
);
create index route_editor_presence_seen_idx on public.route_editor_presence(seen_at);
alter table public.route_editor_drafts enable row level security;
alter table public.route_editor_presence enable row level security;
revoke all on public.route_editor_drafts, public.route_editor_presence from anon, authenticated;
grant select, insert, update, delete on public.route_editor_drafts, public.route_editor_presence to service_role;

-- Authenticated admin server actions supply the verified user ID. No browser role can call this RPC.
create function public.save_route_editor_draft(p_route_id bigint, p_user_id uuid, p_base_version integer, p_revision integer, p_snapshot jsonb)
returns integer language plpgsql security invoker set search_path = '' as $$
declare current_version integer; next_revision integer;
begin
  select data_version into current_version from public.routes where id = p_route_id for share;
  if current_version is distinct from p_base_version then
    raise exception 'Route version changed' using errcode = '40001';
  end if;
  if p_revision = 0 then
    insert into public.route_editor_drafts(route_id,user_id,base_version,snapshot)
      values(p_route_id,p_user_id,p_base_version,p_snapshot)
      on conflict do nothing returning revision into next_revision;
  else
    update public.route_editor_drafts set snapshot=p_snapshot, base_version=p_base_version,
      revision=revision+1, updated_at=now()
      where route_id=p_route_id and user_id=p_user_id and revision=p_revision returning revision into next_revision;
  end if;
  if next_revision is null then raise exception 'Draft version changed' using errcode = '40001'; end if;
  return next_revision;
end;
$$;
revoke all on function public.save_route_editor_draft(bigint,uuid,integer,integer,jsonb) from public, anon, authenticated;
grant execute on function public.save_route_editor_draft(bigint,uuid,integer,integer,jsonb) to service_role;

alter table public.community_reports
  add column resolution_note text check (char_length(resolution_note) between 10 and 1000),
  add column resolved_at timestamptz,
  add column resolved_by uuid references auth.users(id),
  add constraint community_reports_resolution_complete check (
    (resolution_note is null and resolved_at is null and resolved_by is null) or
    (resolution_note is not null and resolved_at is not null and resolved_by is not null)
  );
create index community_reports_resolved_idx on public.community_reports(resolved_at) where resolved_at is not null;
