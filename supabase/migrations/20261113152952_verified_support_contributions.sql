create table public.support_contributions (
  id uuid primary key default gen_random_uuid(),
  method text not null check (method in ('paypal','mercadopago','spei')),
  amount_cents integer not null check (amount_cents between 100 and 10000000),
  payment_reference text not null check (char_length(payment_reference) between 6 and 120),
  reference_hash text not null check (reference_hash ~ '^[a-f0-9]{64}$'),
  visibility text not null default 'anonymous' check (visibility in ('anonymous','named','private')),
  display_name text check (char_length(display_name) between 2 and 60),
  show_amount boolean not null default false,
  status text not null default 'pending' check (status in ('pending','confirmed','rejected')),
  moderator_note text check (char_length(moderator_note) <= 1000),
  reviewed_by uuid references auth.users(id),
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision integer not null default 1 check (revision > 0),
  unique (method, reference_hash),
  check ((visibility = 'named' and display_name is not null) or (visibility <> 'named' and display_name is null)),
  check (status <> 'confirmed' or (confirmed_at is not null and reviewed_by is not null))
);
create index support_contributions_inbox on public.support_contributions(status, created_at desc);
create index support_contributions_wall on public.support_contributions(confirmed_at desc) where status='confirmed' and visibility <> 'private';
alter table public.support_contributions enable row level security;
revoke all on public.support_contributions from anon, authenticated;
grant select, insert, update on public.support_contributions to service_role;

create table public.support_contribution_reviews (
  id uuid primary key default gen_random_uuid(),
  contribution_id uuid not null references public.support_contributions(id) on delete cascade,
  actor_id uuid not null references auth.users(id),
  previous_status text not null,
  status text not null,
  amount_cents integer not null,
  note text,
  created_at timestamptz not null default now()
);
alter table public.support_contribution_reviews enable row level security;
revoke all on public.support_contribution_reviews from anon, authenticated;
grant select, insert on public.support_contribution_reviews to service_role;

create function public.review_support_contribution(p_id uuid, p_revision integer, p_status text, p_amount_cents integer, p_note text, p_actor_id uuid)
returns void language plpgsql security invoker set search_path='' as $$
declare previous public.support_contributions%rowtype;
begin
  if p_id is null or p_revision is null or p_revision < 1 or p_status is null or p_status not in ('confirmed','rejected') or p_amount_cents is null or p_amount_cents not between 100 and 10000000 or char_length(p_note)>1000 or p_actor_id is null then
    raise exception 'Invalid review' using errcode='22023';
  end if;
  select * into previous from public.support_contributions where id=p_id for update;
  if not found or previous.revision <> p_revision then raise exception 'Contribution changed' using errcode='40001'; end if;
  update public.support_contributions set status=p_status, amount_cents=p_amount_cents,
    moderator_note=nullif(btrim(p_note),''), reviewed_by=p_actor_id,
    confirmed_at=case when p_status='confirmed' then coalesce(previous.confirmed_at,now()) else null end,
    updated_at=now(), revision=revision+1 where id=p_id;
  insert into public.support_contribution_reviews(contribution_id,actor_id,previous_status,status,amount_cents,note)
    values(p_id,p_actor_id,previous.status,p_status,p_amount_cents,nullif(btrim(p_note),''));
end;
$$;
revoke all on function public.review_support_contribution(uuid,integer,text,integer,text,uuid) from public,anon,authenticated;
grant execute on function public.review_support_contribution(uuid,integer,text,integer,text,uuid) to service_role;

-- Only this projection is used by public pages. No reference, provider or actor leaves the server.
create function public.get_support_wall()
returns jsonb language sql stable security invoker set search_path='' as $$
  select jsonb_build_object(
    'confirmedCount',(select count(*) from public.support_contributions where status='confirmed' and visibility<>'private'),
    'supporters',coalesce((select jsonb_agg(row_to_json(s)) from (
      select id, case when visibility='named' then display_name else 'Apoyo anónimo' end as name,
        case when show_amount then amount_cents else null end as amount_cents, confirmed_at
      from public.support_contributions where status='confirmed' and visibility<>'private'
      order by confirmed_at desc, id desc limit 8
    ) s),'[]'::jsonb)
  );
$$;
revoke all on function public.get_support_wall() from public,anon,authenticated;
grant execute on function public.get_support_wall() to service_role;
