-- MOD-04 — Marketplace / Explorar

create extension if not exists pg_trgm with schema extensions;

create index worker_profiles_marketplace_approved_idx
  on public.worker_profiles (id, profile_id, years_experience)
  where approval_status = 'approved';

create index worker_services_marketplace_active_idx
  on public.worker_services (category_id, worker_id, id)
  where active;

create index service_categories_marketplace_active_idx
  on public.service_categories (sort_order, id)
  where active;

create index worker_availability_marketplace_active_day_idx
  on public.worker_availability (day_of_week, worker_id)
  where active;

create index worker_services_marketplace_title_trgm_idx
  on public.worker_services using gin (lower(title) extensions.gin_trgm_ops)
  where active;

create index worker_services_marketplace_description_trgm_idx
  on public.worker_services using gin (lower(coalesce(description, '')) extensions.gin_trgm_ops)
  where active;

create index worker_profiles_marketplace_bio_trgm_idx
  on public.worker_profiles using gin (lower(coalesce(bio, '')) extensions.gin_trgm_ops)
  where approval_status = 'approved';

create or replace function public.search_marketplace_workers(
  p_query text default null,
  p_category_id uuid default null,
  p_city text default null,
  p_department text default null,
  p_latitude double precision default null,
  p_longitude double precision default null,
  p_radius_m integer default null,
  p_pricing_type text default null,
  p_min_price_bob numeric default null,
  p_max_price_bob numeric default null,
  p_min_years_experience smallint default null,
  p_availability_day smallint default null,
  p_sort text default 'default',
  p_offset integer default 0,
  p_limit integer default 12
)
returns table (
  worker_id uuid,
  display_name text,
  professional_bio text,
  years_experience smallint,
  public_area_label text,
  city text,
  department text,
  service_radius_m integer,
  service_id uuid,
  category_id uuid,
  category_name text,
  category_slug text,
  service_title text,
  service_description text,
  pricing_type text,
  price_bob numeric(12, 2),
  distance_m integer,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  clean_query text := nullif(btrim(coalesce(p_query, '')), '');
  clean_city text := nullif(btrim(coalesce(p_city, '')), '');
  clean_department text := nullif(btrim(coalesce(p_department, '')), '');
  clean_pricing_type text := nullif(lower(btrim(coalesce(p_pricing_type, ''))), '');
  clean_sort text := lower(btrim(coalesce(p_sort, 'default')));
  customer_point extensions.geography;
begin
  if (select auth.uid()) is null or not private.is_current_user_active() then
    raise exception using errcode = '42501', message = 'active confirmed account required';
  end if;

  if clean_query is not null and char_length(clean_query) > 100 then
    raise exception using errcode = '22023', message = 'search query must not exceed 100 characters';
  end if;
  if clean_city is not null and char_length(clean_city) > 100 then
    raise exception using errcode = '22023', message = 'city filter must not exceed 100 characters';
  end if;
  if clean_department is not null and char_length(clean_department) > 100 then
    raise exception using errcode = '22023', message = 'department filter must not exceed 100 characters';
  end if;

  if (p_latitude is null) <> (p_longitude is null) then
    raise exception using errcode = '22023', message = 'latitude and longitude must be supplied together';
  end if;
  if p_latitude is not null then
    if p_latitude not between -90 and 90 or p_longitude not between -180 and 180 then
      raise exception using errcode = '22023', message = 'invalid customer coordinates';
    end if;
    customer_point := extensions.st_setsrid(
      extensions.st_makepoint(p_longitude, p_latitude),
      4326
    )::extensions.geography;
  end if;

  if p_radius_m is not null and customer_point is null then
    raise exception using errcode = '22023', message = 'search radius requires customer coordinates';
  end if;
  if p_radius_m is not null and p_radius_m not between 1000 and 50000 then
    raise exception using errcode = '22023', message = 'search radius must be between 1000 and 50000 metres';
  end if;
  if clean_pricing_type is not null and clean_pricing_type not in ('hourly', 'daily', 'fixed', 'quote') then
    raise exception using errcode = '22023', message = 'invalid pricing type';
  end if;
  if p_min_price_bob is not null and p_min_price_bob < 0 then
    raise exception using errcode = '22023', message = 'minimum price must not be negative';
  end if;
  if p_max_price_bob is not null and p_max_price_bob < 0 then
    raise exception using errcode = '22023', message = 'maximum price must not be negative';
  end if;
  if p_min_price_bob is not null and p_max_price_bob is not null
     and p_min_price_bob > p_max_price_bob then
    raise exception using errcode = '22023', message = 'minimum price must not exceed maximum price';
  end if;
  if p_min_years_experience is not null and p_min_years_experience not between 0 and 60 then
    raise exception using errcode = '22023', message = 'minimum experience must be between 0 and 60';
  end if;
  if p_availability_day is not null and p_availability_day not between 0 and 6 then
    raise exception using errcode = '22023', message = 'availability day must be between 0 and 6';
  end if;
  if clean_sort not in ('default', 'distance', 'experience_desc', 'price_asc') then
    raise exception using errcode = '22023', message = 'invalid marketplace sort';
  end if;
  if clean_sort = 'distance' and customer_point is null then
    raise exception using errcode = '22023', message = 'distance sort requires customer coordinates';
  end if;
  if clean_sort = 'price_asc'
     and (clean_pricing_type is null or clean_pricing_type not in ('hourly', 'daily', 'fixed')) then
    raise exception using errcode = '22023', message = 'price sort requires one comparable priced service type';
  end if;
  if p_offset is null or p_offset < 0 then
    raise exception using errcode = '22023', message = 'offset must not be negative';
  end if;
  if p_limit is null or p_limit not between 1 and 20 then
    raise exception using errcode = '22023', message = 'page size must be between 1 and 20';
  end if;

  return query
  with eligible as (
    select
      worker.id as selected_worker_id,
      concat_ws(
        ' ',
        btrim(profile.first_name),
        case when btrim(profile.last_name) = '' then null else left(btrim(profile.last_name), 1) || '.' end
      ) as selected_display_name,
      worker.bio as selected_bio,
      worker.years_experience as selected_years_experience,
      location.public_area_label as selected_area_label,
      location.city as selected_city,
      location.department as selected_department,
      location.service_radius_m as selected_service_radius_m,
      service.id as selected_service_id,
      category.id as selected_category_id,
      category.name as selected_category_name,
      category.slug as selected_category_slug,
      category.sort_order as selected_category_sort,
      service.title as selected_service_title,
      service.description as selected_service_description,
      service.pricing_type as selected_pricing_type,
      service.price_bob as selected_price_bob,
      case when customer_point is null then null
        else round(extensions.st_distance(location.private_location, customer_point))::integer
      end as selected_distance_m
    from public.worker_profiles as worker
    join public.profiles as profile on profile.id = worker.profile_id
    join public.worker_locations as location on location.worker_id = worker.id
    join public.worker_services as service on service.worker_id = worker.id
    join public.service_categories as category on category.id = service.category_id
    where profile.account_status = 'active'
      and worker.approval_status = 'approved'
      and service.active
      and category.active
      and (p_category_id is null or category.id = p_category_id)
      and (clean_city is null or lower(btrim(location.city)) = lower(clean_city))
      and (clean_department is null or lower(btrim(location.department)) = lower(clean_department))
      and (clean_pricing_type is null or service.pricing_type = clean_pricing_type)
      and (p_min_price_bob is null or (service.price_bob is not null and service.price_bob >= p_min_price_bob))
      and (p_max_price_bob is null or (service.price_bob is not null and service.price_bob <= p_max_price_bob))
      and (p_min_years_experience is null or worker.years_experience >= p_min_years_experience)
      and (
        p_availability_day is null
        or exists (
          select 1
          from public.worker_availability as availability
          where availability.worker_id = worker.id
            and availability.active
            and availability.day_of_week = p_availability_day
        )
      )
      and (
        clean_query is null
        or lower(service.title) like '%' || lower(clean_query) || '%'
        or lower(coalesce(service.description, '')) like '%' || lower(clean_query) || '%'
        or lower(category.name) like '%' || lower(clean_query) || '%'
        or lower(coalesce(worker.bio, '')) like '%' || lower(clean_query) || '%'
      )
      and (
        customer_point is null
        or extensions.st_dwithin(location.private_location, customer_point, location.service_radius_m)
      )
      and (
        p_radius_m is null
        or extensions.st_dwithin(location.private_location, customer_point, p_radius_m)
      )
  ), ranked as (
    select
      eligible.*,
      row_number() over (
        partition by eligible.selected_worker_id
        order by
          case when clean_sort = 'price_asc' then eligible.selected_price_bob end asc nulls last,
          eligible.selected_category_sort,
          lower(eligible.selected_service_title),
          eligible.selected_service_id
      ) as service_rank
    from eligible
  ), selected as (
    select * from ranked where service_rank = 1
  ), counted as (
    select selected.*, count(*) over () as selected_total_count
    from selected
  )
  select
    counted.selected_worker_id,
    counted.selected_display_name,
    counted.selected_bio,
    counted.selected_years_experience,
    counted.selected_area_label,
    counted.selected_city,
    counted.selected_department,
    counted.selected_service_radius_m,
    counted.selected_service_id,
    counted.selected_category_id,
    counted.selected_category_name,
    counted.selected_category_slug,
    counted.selected_service_title,
    counted.selected_service_description,
    counted.selected_pricing_type,
    counted.selected_price_bob,
    counted.selected_distance_m,
    counted.selected_total_count
  from counted
  order by
    case when clean_sort = 'distance' then counted.selected_distance_m end asc nulls last,
    case when clean_sort = 'experience_desc' then counted.selected_years_experience end desc nulls last,
    case when clean_sort = 'price_asc' then counted.selected_price_bob end asc nulls last,
    case when clean_sort = 'default' then counted.selected_category_sort end asc,
    case when clean_sort = 'default' then lower(counted.selected_service_title) end asc,
    counted.selected_worker_id
  offset p_offset
  limit p_limit;
end;
$$;

revoke all on function public.search_marketplace_workers(
  text, uuid, text, text, double precision, double precision, integer,
  text, numeric, numeric, smallint, smallint, text, integer, integer
) from public, anon;

grant execute on function public.search_marketplace_workers(
  text, uuid, text, text, double precision, double precision, integer,
  text, numeric, numeric, smallint, smallint, text, integer, integer
) to authenticated;

comment on function public.search_marketplace_workers(
  text, uuid, text, text, double precision, double precision, integer,
  text, numeric, numeric, smallint, smallint, text, integer, integer
) is
  'MOD-04 authenticated marketplace allowlist. Enforces public eligibility, uses private PostGIS coordinates internally, and never returns exact locations or approval data.';
