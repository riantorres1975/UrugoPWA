-- A receipt code is a bearer secret. Store its SHA-256 hash, never the code itself.
alter table public.support_contributions
  add column management_hash text check (management_hash ~ '^[a-f0-9]{64}$'),
  add column publication_status text not null default 'pending' check (publication_status in ('pending','approved','withdrawn'));
update public.support_contributions set publication_status=case when status='confirmed' and visibility='private' then 'withdrawn' when status='confirmed' then 'approved' else 'pending' end;
create unique index support_management_hash on public.support_contributions(management_hash) where management_hash is not null;
create index support_publication_queue on public.support_contributions(updated_at desc) where status='confirmed' and publication_status='pending';
create index support_reviews_contribution on public.support_contribution_reviews(contribution_id);
create index support_reviews_actor on public.support_contribution_reviews(actor_id);
create index support_contributions_reviewer on public.support_contributions(reviewed_by);

create table public.support_privacy_changes (
  id uuid primary key default gen_random_uuid(),
  contribution_id uuid not null references public.support_contributions(id) on delete cascade,
  visibility text not null check (visibility in ('anonymous','named','private')),
  publication_status text not null check (publication_status in ('pending','approved','withdrawn')),
  kind text not null default 'privacy' check (kind in ('privacy','access_rotated')),
  actor_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index support_privacy_contribution on public.support_privacy_changes(contribution_id);
create index support_privacy_actor on public.support_privacy_changes(actor_id);
alter table public.support_privacy_changes enable row level security;
revoke all on public.support_privacy_changes from public,anon,authenticated;
grant select,insert on public.support_privacy_changes to service_role;

create table public.support_monthly_goals (
  month date primary key check (extract(day from month)=1),
  target_cents integer not null check (target_cents between 100 and 10000000),
  description text not null check (char_length(description) between 12 and 300),
  enabled boolean not null default false,
  revision integer not null default 1 check (revision > 0),
  updated_by uuid not null references auth.users(id),
  updated_at timestamptz not null default now()
);
create index support_goals_editor on public.support_monthly_goals(updated_by);
alter table public.support_monthly_goals enable row level security;
revoke all on public.support_monthly_goals from public,anon,authenticated;
grant select,insert,update on public.support_monthly_goals to service_role;

create or replace function public.review_support_contribution(p_id uuid,p_revision integer,p_status text,p_amount_cents integer,p_note text,p_actor_id uuid)
returns void language plpgsql security invoker set search_path='' as $$
declare previous public.support_contributions%rowtype;
begin
  if p_id is null or p_revision is null or p_revision<1 or p_status is null or p_status not in ('confirmed','rejected') or p_amount_cents is null or p_amount_cents not between 100 and 10000000 or char_length(p_note)>1000 or p_actor_id is null then
    raise exception 'Invalid review' using errcode='22023';
  end if;
  select * into previous from public.support_contributions where id=p_id for update;
  if not found or previous.revision<>p_revision then raise exception 'Contribution changed' using errcode='40001'; end if;
  update public.support_contributions set status=p_status,amount_cents=p_amount_cents,
    publication_status=case when p_status='confirmed' then case when visibility='private' then 'withdrawn' else 'approved' end else 'pending' end,
    moderator_note=nullif(btrim(p_note),''),reviewed_by=p_actor_id,
    confirmed_at=case when p_status='confirmed' then coalesce(previous.confirmed_at,now()) else null end,
    updated_at=now(),revision=revision+1 where id=p_id;
  insert into public.support_contribution_reviews(contribution_id,actor_id,previous_status,status,amount_cents,note)
    values(p_id,p_actor_id,previous.status,p_status,p_amount_cents,nullif(btrim(p_note),''));
end;
$$;

create function public.update_support_privacy(p_hash text,p_revision integer,p_visibility text,p_name text,p_show_amount boolean)
returns void language plpgsql security invoker set search_path='' as $$
declare previous public.support_contributions%rowtype; publication text;
begin
  if p_hash is null or p_hash !~ '^[a-f0-9]{64}$' or p_revision is null or p_revision<1 or p_visibility is null or p_visibility not in ('anonymous','named','private') or p_show_amount is null
    or (p_visibility='named' and (p_name is null or char_length(btrim(p_name)) not between 2 and 60 or p_name ~ '[[:cntrl:]<>]')) then
    raise exception 'Invalid privacy choice' using errcode='22023';
  end if;
  select * into previous from public.support_contributions where management_hash=p_hash for update;
  if not found then raise exception 'Receipt unavailable' using errcode='P0002'; end if;
  if previous.revision<>p_revision then raise exception 'Contribution changed' using errcode='40001'; end if;
  publication:=case
    when p_visibility='private' then 'withdrawn'
    when previous.status<>'confirmed' then 'pending'
    when p_visibility='anonymous' then 'approved'
    when previous.visibility='named' and previous.display_name=btrim(p_name) and previous.publication_status='approved' then 'approved'
    else 'pending' end;
  update public.support_contributions set visibility=p_visibility,
    display_name=case when p_visibility='named' then btrim(p_name) else null end,
    show_amount=p_visibility<>'private' and p_show_amount,publication_status=publication,
    updated_at=now(),revision=revision+1 where id=previous.id;
  insert into public.support_privacy_changes(contribution_id,visibility,publication_status) values(previous.id,p_visibility,publication);
end;
$$;

create function public.rotate_support_access(p_id uuid,p_revision integer,p_hash text,p_actor_id uuid)
returns void language plpgsql security invoker set search_path='' as $$
declare updated public.support_contributions%rowtype;
begin
  if p_hash is null or p_hash !~ '^[a-f0-9]{64}$' or p_revision is null or p_revision<1 or p_actor_id is null then raise exception 'Invalid receipt' using errcode='22023'; end if;
  update public.support_contributions set management_hash=p_hash,revision=revision+1,updated_at=now() where id=p_id and revision=p_revision returning * into updated;
  if not found then raise exception 'Contribution changed' using errcode='40001'; end if;
  insert into public.support_privacy_changes(contribution_id,visibility,publication_status,kind,actor_id)
    values(updated.id,updated.visibility,updated.publication_status,'access_rotated',p_actor_id);
end;
$$;

create function public.register_verified_support(p_input jsonb,p_actor_id uuid)
returns uuid language plpgsql security invoker set search_path='' as $$
declare new_id uuid;
begin
  if p_actor_id is null or char_length(coalesce(p_input->>'note','')) not between 8 and 1000 then raise exception 'Verification required' using errcode='22023'; end if;
  insert into public.support_contributions(method,amount_cents,payment_reference,reference_hash,management_hash,visibility,display_name,show_amount)
    values(p_input->>'method',(p_input->>'amount_cents')::integer,p_input->>'reference',p_input->>'reference_hash',p_input->>'management_hash',
      p_input->>'visibility',case when p_input->>'visibility'='named' then p_input->>'name' else null end,
      p_input->>'visibility'<>'private' and (p_input->>'show_amount')::boolean) returning id into new_id;
  perform public.review_support_contribution(new_id,1,'confirmed',(p_input->>'amount_cents')::integer,p_input->>'note',p_actor_id);
  return new_id;
end;
$$;

create function public.save_support_monthly_goal(p_month date,p_target integer,p_description text,p_enabled boolean,p_revision integer,p_actor_id uuid)
returns void language plpgsql security invoker set search_path='' as $$
declare previous public.support_monthly_goals%rowtype;
begin
  if p_month is null or extract(day from p_month)<>1 or p_target is null or p_target not between 100 and 10000000 or p_description is null or char_length(btrim(p_description)) not between 12 and 300
    or p_enabled is null or p_revision is null or p_revision<0 or p_actor_id is null then raise exception 'Invalid goal' using errcode='22023'; end if;
  select * into previous from public.support_monthly_goals where month=p_month for update;
  if found then
    if previous.revision<>p_revision then raise exception 'Goal changed' using errcode='40001'; end if;
    update public.support_monthly_goals set target_cents=p_target,description=btrim(p_description),enabled=p_enabled,revision=revision+1,updated_by=p_actor_id,updated_at=now() where month=p_month;
  else
    if p_revision<>0 then raise exception 'Goal changed' using errcode='40001'; end if;
    begin
      insert into public.support_monthly_goals(month,target_cents,description,enabled,updated_by) values(p_month,p_target,btrim(p_description),p_enabled,p_actor_id);
    exception when unique_violation then raise exception 'Goal changed' using errcode='40001'; end;
  end if;
end;
$$;

create or replace function public.get_support_wall()
returns jsonb language sql stable security invoker set search_path='' as $$
  with bounds as (select date_trunc('month',now() at time zone 'America/Mexico_City')::date as month),
  visible as (select * from public.support_contributions where status='confirmed' and publication_status='approved' and visibility<>'private')
  select jsonb_build_object(
    'confirmedCount',(select count(*) from visible),
    'supporters',coalesce((select jsonb_agg(row_to_json(s)) from (
      select id,case when visibility='named' then display_name else 'Apoyo anónimo' end as name,
        case when show_amount then amount_cents else null end as amount_cents,confirmed_at
      from visible order by confirmed_at desc,id desc limit 8
    ) s),'[]'::jsonb),
    'goal',(select jsonb_build_object('month',g.month,'target_cents',g.target_cents,'description',g.description,
      'raised_cents',coalesce((select sum(v.amount_cents) from visible v where v.show_amount
        and v.confirmed_at >= (b.month::timestamp at time zone 'America/Mexico_City')
        and v.confirmed_at < ((b.month+interval '1 month')::timestamp at time zone 'America/Mexico_City')),0))
      from public.support_monthly_goals g join bounds b on g.month=b.month where g.enabled)
  );
$$;

revoke all on function public.update_support_privacy(text,integer,text,text,boolean) from public,anon,authenticated;
revoke all on function public.rotate_support_access(uuid,integer,text,uuid) from public,anon,authenticated;
revoke all on function public.register_verified_support(jsonb,uuid) from public,anon,authenticated;
revoke all on function public.save_support_monthly_goal(date,integer,text,boolean,integer,uuid) from public,anon,authenticated;
grant execute on function public.update_support_privacy(text,integer,text,text,boolean) to service_role;
grant execute on function public.rotate_support_access(uuid,integer,text,uuid) to service_role;
grant execute on function public.register_verified_support(jsonb,uuid) to service_role;
grant execute on function public.save_support_monthly_goal(date,integer,text,boolean,integer,uuid) to service_role;
-- No goals, receipts or example donations are seeded by this migration.
