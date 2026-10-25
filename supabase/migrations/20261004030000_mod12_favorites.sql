-- MOD-12 — Favoritos (subalcance independiente y completamente definido)

create table public.favorites (
  profile_id uuid not null references public.profiles (id),
  worker_id uuid not null references public.worker_profiles (id),
  created_at timestamptz not null default now(),
  primary key (profile_id, worker_id)
);

create index favorites_profile_created_worker_idx
  on public.favorites (profile_id, created_at desc, worker_id desc);
create index favorites_worker_idx
  on public.favorites (worker_id);

alter table public.favorites enable row level security;
revoke all on table public.favorites from public, anon, authenticated;

create policy favorites_select_owner
on public.favorites for select to authenticated
using (
  profile_id = (select auth.uid())
  and private.is_current_user_active()
);

create or replace function public.get_my_worker_favorite_state(p_worker_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
begin
  if caller_id is null or not private.is_current_user_active() then
    raise exception using errcode = '42501', message = 'active confirmed account required';
  end if;
  if p_worker_id is null then
    raise exception using errcode = '22023', message = 'worker id is required';
  end if;

  return exists (
    select 1
    from public.favorites as favorite
    where favorite.profile_id = caller_id
      and favorite.worker_id = p_worker_id
  );
end;
$$;

create or replace function public.add_worker_favorite(p_worker_id uuid)
returns table (
  worker_id uuid,
  is_favorite boolean,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  favorite_created_at timestamptz;
begin
  if caller_id is null or not private.is_current_user_active() then
    raise exception using errcode = '42501', message = 'active confirmed account required';
  end if;
  if p_worker_id is null then
    raise exception using errcode = '22023', message = 'worker id is required';
  end if;

  if not exists (
    select 1
    from public.worker_profiles as worker
    join public.profiles as profile on profile.id = worker.profile_id
    join public.worker_locations as location on location.worker_id = worker.id
    where worker.id = p_worker_id
      and profile.account_status = 'active'
      and worker.approval_status = 'approved'
      and exists (
        select 1
        from public.worker_services as service
        join public.service_categories as category on category.id = service.category_id
        where service.worker_id = worker.id
          and service.active
          and category.active
      )
  ) then
    raise exception using errcode = 'P0002', message = 'public worker not available';
  end if;

  insert into public.favorites (profile_id, worker_id)
  values (caller_id, p_worker_id)
  on conflict on constraint favorites_pkey do nothing;

  select favorite.created_at into favorite_created_at
  from public.favorites as favorite
  where favorite.profile_id = caller_id
    and favorite.worker_id = p_worker_id;

  return query select p_worker_id, true, favorite_created_at;
end;
$$;

create or replace function public.remove_worker_favorite(p_worker_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
begin
  if caller_id is null or not private.is_current_user_active() then
    raise exception using errcode = '42501', message = 'active confirmed account required';
  end if;
  if p_worker_id is null then
    raise exception using errcode = '22023', message = 'worker id is required';
  end if;

  delete from public.favorites as favorite
  where favorite.profile_id = caller_id
    and favorite.worker_id = p_worker_id;

  return false;
end;
$$;

create or replace function public.list_my_worker_favorites(
  p_before_created_at timestamptz default null,
  p_before_worker_id uuid default null,
  p_limit integer default 20
)
returns table (
  worker_id uuid,
  favorite_created_at timestamptz,
  available boolean,
  display_name text,
  professional_bio text,
  years_experience smallint,
  public_area_label text,
  city text,
  department text,
  service_title text,
  category_name text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
begin
  if caller_id is null or not private.is_current_user_active() then
    raise exception using errcode = '42501', message = 'active confirmed account required';
  end if;
  if (p_before_created_at is null) <> (p_before_worker_id is null) then
    raise exception using errcode = '22023', message = 'complete favorite cursor required';
  end if;
  if p_limit is null or p_limit not between 1 and 50 then
    raise exception using errcode = '22023', message = 'favorite page size must be between 1 and 50';
  end if;

  return query
  with selected as (
    select
      favorite.worker_id as selected_worker_id,
      favorite.created_at as selected_created_at,
      worker.bio as selected_bio,
      worker.years_experience as selected_years,
      profile.first_name as selected_first_name,
      profile.last_name as selected_last_name,
      location.public_area_label as selected_area,
      location.city as selected_city,
      location.department as selected_department,
      profile.account_status = 'active'
        and worker.approval_status = 'approved'
        and location.worker_id is not null
        and exists (
          select 1
          from public.worker_services as eligible_service
          join public.service_categories as eligible_category
            on eligible_category.id = eligible_service.category_id
          where eligible_service.worker_id = worker.id
            and eligible_service.active
            and eligible_category.active
        ) as selected_available
    from public.favorites as favorite
    join public.worker_profiles as worker on worker.id = favorite.worker_id
    join public.profiles as profile on profile.id = worker.profile_id
    left join public.worker_locations as location on location.worker_id = worker.id
    where favorite.profile_id = caller_id
      and (
        p_before_created_at is null
        or (favorite.created_at, favorite.worker_id) < (p_before_created_at, p_before_worker_id)
      )
    order by favorite.created_at desc, favorite.worker_id desc
    limit p_limit
  )
  select
    selected.selected_worker_id,
    selected.selected_created_at,
    selected.selected_available,
    case when selected.selected_available then concat_ws(
      ' ',
      btrim(selected.selected_first_name),
      case when btrim(selected.selected_last_name) = '' then null
        else left(btrim(selected.selected_last_name), 1) || '.' end
    ) else null end,
    case when selected.selected_available then selected.selected_bio else null end,
    case when selected.selected_available then selected.selected_years else null end,
    case when selected.selected_available then selected.selected_area else null end,
    case when selected.selected_available then selected.selected_city else null end,
    case when selected.selected_available then selected.selected_department else null end,
    case when selected.selected_available then service.title else null end,
    case when selected.selected_available then service.category_name else null end
  from selected
  left join lateral (
    select
      worker_service.title,
      category.name as category_name
    from public.worker_services as worker_service
    join public.service_categories as category on category.id = worker_service.category_id
    where selected.selected_available
      and worker_service.worker_id = selected.selected_worker_id
      and worker_service.active
      and category.active
    order by category.sort_order, lower(worker_service.title), worker_service.id
    limit 1
  ) as service on true
  order by selected.selected_created_at desc, selected.selected_worker_id desc;
end;
$$;

revoke all on function public.get_my_worker_favorite_state(uuid) from public, anon;
revoke all on function public.add_worker_favorite(uuid) from public, anon;
revoke all on function public.remove_worker_favorite(uuid) from public, anon;
revoke all on function public.list_my_worker_favorites(timestamptz, uuid, integer)
  from public, anon;

grant execute on function public.get_my_worker_favorite_state(uuid) to authenticated;
grant execute on function public.add_worker_favorite(uuid) to authenticated;
grant execute on function public.remove_worker_favorite(uuid) to authenticated;
grant execute on function public.list_my_worker_favorites(timestamptz, uuid, integer)
  to authenticated;

comment on table public.favorites is
  'Frozen private marker between an authenticated profile and a worker profile. It creates no notification, request, conversation or booking.';
comment on function public.add_worker_favorite(uuid) is
  'MOD-12 idempotent caller-derived favorite creation restricted to workers currently eligible under the MOD-04/MOD-05 public contract.';
comment on function public.remove_worker_favorite(uuid) is
  'MOD-12 idempotent caller-derived removal that remains available even when the worker is no longer public.';
comment on function public.list_my_worker_favorites(timestamptz, uuid, integer) is
  'MOD-12 bounded owner-only keyset list. Unavailable workers remain removable placeholders and expose no private worker data.';
