-- MOD-05 — Perfil público del trabajador

create or replace function private.can_read_public_worker_portfolio_object(p_object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_current_user_active() and exists (
    select 1
    from public.worker_portfolio_items as item
    join public.worker_profiles as worker on worker.id = item.worker_id
    join public.profiles as profile on profile.id = worker.profile_id
    join public.worker_locations as location on location.worker_id = worker.id
    where item.storage_path = p_object_name
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
  );
$$;

revoke all on function private.can_read_public_worker_portfolio_object(text)
  from public, anon;
grant execute on function private.can_read_public_worker_portfolio_object(text)
  to authenticated;

create or replace function public.get_public_worker_profile(p_worker_id uuid)
returns table (
  worker_id uuid,
  display_name text,
  professional_bio text,
  years_experience smallint,
  public_area_label text,
  city text,
  department text,
  service_radius_m integer,
  services jsonb,
  availability jsonb,
  portfolio jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not private.is_current_user_active() then
    raise exception using errcode = '42501', message = 'active confirmed account required';
  end if;

  return query
  select
    worker.id,
    concat_ws(
      ' ',
      btrim(profile.first_name),
      case
        when btrim(profile.last_name) = '' then null
        else left(btrim(profile.last_name), 1) || '.'
      end
    ),
    worker.bio,
    worker.years_experience,
    location.public_area_label,
    location.city,
    location.department,
    location.service_radius_m,
    (
      select jsonb_agg(
        jsonb_build_object(
          'service_id', service.id,
          'category_id', category.id,
          'category_name', category.name,
          'category_slug', category.slug,
          'category_icon_key', category.icon_key,
          'title', service.title,
          'description', service.description,
          'pricing_type', service.pricing_type,
          'price_bob', service.price_bob
        )
        order by category.sort_order, lower(service.title), service.id
      )
      from public.worker_services as service
      join public.service_categories as category on category.id = service.category_id
      where service.worker_id = worker.id
        and service.active
        and category.active
    ),
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'day_of_week', available.day_of_week,
          'start_time', to_char(available.start_time, 'HH24:MI'),
          'end_time', to_char(available.end_time, 'HH24:MI')
        )
        order by available.day_of_week, available.start_time, available.end_time
      )
      from public.worker_availability as available
      where available.worker_id = worker.id
        and available.active
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'portfolio_item_id', item.id,
          'storage_path', item.storage_path,
          'title', item.title,
          'description', item.description,
          'sort_order', item.sort_order
        )
        order by item.sort_order, item.id
      )
      from public.worker_portfolio_items as item
      where item.worker_id = worker.id
    ), '[]'::jsonb)
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
    );
end;
$$;

revoke all on function public.get_public_worker_profile(uuid)
  from public, anon;
grant execute on function public.get_public_worker_profile(uuid)
  to authenticated;

create policy worker_portfolio_objects_select_public_eligible
on storage.objects for select to authenticated
using (
  bucket_id = 'worker-portfolio'
  and private.can_read_public_worker_portfolio_object(name)
);

comment on function public.get_public_worker_profile(uuid) is
  'MOD-05 authenticated public profile allowlist. Rechecks worker eligibility and returns safe identity, public area, active services, active availability and portfolio metadata without private coordinates, contact, approval, certification or review data.';

comment on function private.can_read_public_worker_portfolio_object(text) is
  'MOD-05 Storage guard. Allows a confirmed active caller to read only a registered portfolio object whose worker remains publicly eligible.';
