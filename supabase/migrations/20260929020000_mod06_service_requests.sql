-- MOD-06 — Solicitudes directas de servicio

create table public.service_requests (
  id uuid primary key default gen_random_uuid(),
  customer_profile_id uuid not null references public.profiles (id),
  worker_id uuid not null references public.worker_profiles (id),
  worker_service_id uuid not null references public.worker_services (id),
  description text not null,
  preferred_date date,
  preferred_time time,
  budget_reference_bob numeric(12, 2),
  job_area_label text not null,
  status text not null default 'pending'
    check (status in ('pending', 'quoted', 'accepted', 'rejected', 'cancelled', 'expired')),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(btrim(description)) between 1 and 2000),
  check (char_length(btrim(job_area_label)) between 1 and 160),
  check (budget_reference_bob is null or budget_reference_bob > 0)
);

create index service_requests_customer_idx
  on public.service_requests (customer_profile_id, created_at desc);
create index service_requests_worker_idx
  on public.service_requests (worker_id, status, created_at desc);
create index service_requests_worker_service_idx
  on public.service_requests (worker_service_id);

create table public.service_request_locations (
  service_request_id uuid primary key references public.service_requests (id),
  exact_location extensions.geography(Point, 4326) not null,
  address_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (address_text is null or char_length(btrim(address_text)) between 1 and 300),
  check (not extensions.st_isempty(exact_location::extensions.geometry)),
  check (extensions.st_y(exact_location::extensions.geometry) between -90 and 90),
  check (extensions.st_x(exact_location::extensions.geometry) between -180 and 180)
);

create index service_request_locations_exact_location_gix
  on public.service_request_locations using gist (exact_location);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  service_request_id uuid not null unique references public.service_requests (id),
  status text not null default 'active' check (status in ('active', 'closed')),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id),
  type text not null,
  title text not null,
  body text not null,
  related_entity_type text,
  related_entity_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create trigger service_requests_set_updated_at
  before update on public.service_requests
  for each row execute function private.set_updated_at();
create trigger service_request_locations_set_updated_at
  before update on public.service_request_locations
  for each row execute function private.set_updated_at();
create trigger conversations_set_updated_at
  before update on public.conversations
  for each row execute function private.set_updated_at();

create or replace function public.create_service_request(
  p_worker_id uuid,
  p_worker_service_id uuid,
  p_description text,
  p_job_area_label text,
  p_latitude double precision,
  p_longitude double precision,
  p_preferred_date date default null,
  p_preferred_time time default null,
  p_budget_reference_bob numeric default null,
  p_address_text text default null
)
returns table (
  request_id uuid,
  request_status text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  clean_description text := regexp_replace(btrim(coalesce(p_description, '')), '[[:space:]]+', ' ', 'g');
  clean_job_area_label text := regexp_replace(btrim(coalesce(p_job_area_label, '')), '[[:space:]]+', ' ', 'g');
  clean_address_text text := nullif(regexp_replace(btrim(coalesce(p_address_text, '')), '[[:space:]]+', ' ', 'g'), '');
  target_profile_id uuid;
  created_request_id uuid;
begin
  if caller_id is null or not private.is_current_user_active() then
    raise exception using errcode = '42501', message = 'active confirmed account required';
  end if;
  if p_worker_id is null or p_worker_service_id is null then
    raise exception using errcode = '22023', message = 'worker and service are required';
  end if;
  if char_length(clean_description) not between 1 and 2000 then
    raise exception using errcode = '22023', message = 'description must contain between 1 and 2000 characters';
  end if;
  if char_length(clean_job_area_label) not between 1 and 160 then
    raise exception using errcode = '22023', message = 'job_area_label must contain between 1 and 160 characters';
  end if;
  if clean_address_text is not null and char_length(clean_address_text) > 300 then
    raise exception using errcode = '22023', message = 'address_text must not exceed 300 characters';
  end if;
  if p_latitude is null or p_longitude is null
     or p_latitude not between -90 and 90
     or p_longitude not between -180 and 180 then
    raise exception using errcode = '22023', message = 'valid latitude and longitude are required';
  end if;
  if p_budget_reference_bob is not null
     and (p_budget_reference_bob <= 0 or p_budget_reference_bob > 9999999999.99) then
    raise exception using errcode = '22023', message = 'budget_reference_bob must be a positive supported amount';
  end if;

  select worker.profile_id
  into target_profile_id
  from public.worker_profiles as worker
  join public.profiles as profile on profile.id = worker.profile_id
  join public.worker_locations as location on location.worker_id = worker.id
  join public.worker_services as service
    on service.id = p_worker_service_id and service.worker_id = worker.id
  join public.service_categories as category on category.id = service.category_id
  where worker.id = p_worker_id
    and profile.account_status = 'active'
    and worker.approval_status = 'approved'
    and service.active
    and category.active
  for share of worker, profile, location, service, category;

  if target_profile_id is null then
    raise exception using errcode = '22023', message = 'worker or service is not eligible';
  end if;

  insert into public.service_requests (
    customer_profile_id,
    worker_id,
    worker_service_id,
    description,
    preferred_date,
    preferred_time,
    budget_reference_bob,
    job_area_label,
    status
  ) values (
    caller_id,
    p_worker_id,
    p_worker_service_id,
    clean_description,
    p_preferred_date,
    p_preferred_time,
    p_budget_reference_bob,
    clean_job_area_label,
    'pending'
  )
  returning id into created_request_id;

  insert into public.service_request_locations (
    service_request_id,
    exact_location,
    address_text
  ) values (
    created_request_id,
    extensions.st_setsrid(extensions.st_makepoint(p_longitude, p_latitude), 4326)::extensions.geography,
    clean_address_text
  );

  insert into public.conversations (service_request_id, status)
  values (created_request_id, 'active');

  insert into public.notifications (
    profile_id,
    type,
    title,
    body,
    related_entity_type,
    related_entity_id
  ) values (
    target_profile_id,
    'service_request_created',
    'Nueva solicitud de servicio',
    'Recibiste una nueva solicitud directa de servicio.',
    'service_request',
    created_request_id
  );

  return query select created_request_id, 'pending'::text;
end;
$$;

create or replace function public.list_my_service_requests(
  p_perspective text,
  p_offset integer default 0,
  p_limit integer default 12
)
returns table (
  request_id uuid,
  perspective text,
  counterpart_display_name text,
  worker_id uuid,
  worker_service_id uuid,
  service_title text,
  description text,
  preferred_date date,
  preferred_time time,
  budget_reference_bob numeric,
  job_area_label text,
  status text,
  created_at timestamptz,
  total_count bigint
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
  if p_perspective not in ('customer', 'worker') then
    raise exception using errcode = '22023', message = 'perspective must be customer or worker';
  end if;
  if p_offset is null or p_offset < 0 then
    raise exception using errcode = '22023', message = 'offset must be zero or greater';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 20 then
    raise exception using errcode = '22023', message = 'limit must be between 1 and 20';
  end if;

  return query
  select
    request.id,
    p_perspective,
    case
      when p_perspective = 'customer' then concat_ws(
        ' ', btrim(worker_profile.first_name),
        case when btrim(worker_profile.last_name) = '' then null
          else left(btrim(worker_profile.last_name), 1) || '.' end
      )
      else concat_ws(
        ' ', btrim(customer.first_name),
        case when btrim(customer.last_name) = '' then null
          else left(btrim(customer.last_name), 1) || '.' end
      )
    end,
    request.worker_id,
    request.worker_service_id,
    service.title,
    request.description,
    request.preferred_date,
    request.preferred_time,
    request.budget_reference_bob,
    request.job_area_label,
    request.status,
    request.created_at,
    count(*) over()
  from public.service_requests as request
  join public.worker_profiles as worker on worker.id = request.worker_id
  join public.profiles as worker_profile on worker_profile.id = worker.profile_id
  join public.profiles as customer on customer.id = request.customer_profile_id
  join public.worker_services as service on service.id = request.worker_service_id
  where (p_perspective = 'customer' and request.customer_profile_id = caller_id)
     or (p_perspective = 'worker' and worker.profile_id = caller_id)
  order by request.created_at desc, request.id desc
  offset p_offset
  limit p_limit;
end;
$$;

create or replace function public.get_my_service_request(p_request_id uuid)
returns table (
  request_id uuid,
  perspective text,
  customer_display_name text,
  worker_display_name text,
  worker_id uuid,
  worker_service_id uuid,
  service_title text,
  description text,
  preferred_date date,
  preferred_time time,
  budget_reference_bob numeric,
  job_area_label text,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  exact_latitude double precision,
  exact_longitude double precision,
  address_text text
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

  return query
  select
    request.id,
    case when request.customer_profile_id = caller_id then 'customer'::text else 'worker'::text end,
    concat_ws(
      ' ', btrim(customer.first_name),
      case when btrim(customer.last_name) = '' then null
        else left(btrim(customer.last_name), 1) || '.' end
    ),
    concat_ws(
      ' ', btrim(worker_profile.first_name),
      case when btrim(worker_profile.last_name) = '' then null
        else left(btrim(worker_profile.last_name), 1) || '.' end
    ),
    request.worker_id,
    request.worker_service_id,
    service.title,
    request.description,
    request.preferred_date,
    request.preferred_time,
    request.budget_reference_bob,
    request.job_area_label,
    request.status,
    request.created_at,
    request.updated_at,
    case when request.customer_profile_id = caller_id
      then extensions.st_y(location.exact_location::extensions.geometry) else null end,
    case when request.customer_profile_id = caller_id
      then extensions.st_x(location.exact_location::extensions.geometry) else null end,
    case when request.customer_profile_id = caller_id then location.address_text else null end
  from public.service_requests as request
  join public.worker_profiles as worker on worker.id = request.worker_id
  join public.profiles as worker_profile on worker_profile.id = worker.profile_id
  join public.profiles as customer on customer.id = request.customer_profile_id
  join public.worker_services as service on service.id = request.worker_service_id
  join public.service_request_locations as location on location.service_request_id = request.id
  where request.id = p_request_id
    and (request.customer_profile_id = caller_id or worker.profile_id = caller_id);
end;
$$;

revoke all on function public.create_service_request(
  uuid, uuid, text, text, double precision, double precision, date, time, numeric, text
) from public, anon;
revoke all on function public.list_my_service_requests(text, integer, integer)
  from public, anon;
revoke all on function public.get_my_service_request(uuid)
  from public, anon;
grant execute on function public.create_service_request(
  uuid, uuid, text, text, double precision, double precision, date, time, numeric, text
) to authenticated;
grant execute on function public.list_my_service_requests(text, integer, integer)
  to authenticated;
grant execute on function public.get_my_service_request(uuid)
  to authenticated;

alter table public.service_requests enable row level security;
alter table public.service_request_locations enable row level security;
alter table public.conversations enable row level security;
alter table public.notifications enable row level security;

revoke all on table public.service_requests from public, anon, authenticated;
revoke all on table public.service_request_locations from public, anon, authenticated;
revoke all on table public.conversations from public, anon, authenticated;
revoke all on table public.notifications from public, anon, authenticated;

create policy service_requests_select_participants
on public.service_requests for select to authenticated
using (
  private.is_current_user_active()
  and (
    customer_profile_id = (select auth.uid())
    or exists (
      select 1 from public.worker_profiles as worker
      where worker.id = service_requests.worker_id
        and worker.profile_id = (select auth.uid())
    )
  )
);

create policy service_request_locations_select_customer
on public.service_request_locations for select to authenticated
using (
  private.is_current_user_active()
  and exists (
    select 1 from public.service_requests as request
    where request.id = service_request_locations.service_request_id
      and request.customer_profile_id = (select auth.uid())
  )
);

create policy conversations_select_participants
on public.conversations for select to authenticated
using (
  private.is_current_user_active()
  and exists (
    select 1
    from public.service_requests as request
    join public.worker_profiles as worker on worker.id = request.worker_id
    where request.id = conversations.service_request_id
      and (
        request.customer_profile_id = (select auth.uid())
        or worker.profile_id = (select auth.uid())
      )
  )
);

create policy notifications_select_receiver
on public.notifications for select to authenticated
using (profile_id = (select auth.uid()) and private.is_current_user_active());

comment on function public.create_service_request(
  uuid, uuid, text, text, double precision, double precision, date, time, numeric, text
) is
  'MOD-06 atomic creation path. Derives the customer from auth.uid(), validates current public eligibility and creates the request, private location, conversation and receiver notification.';
comment on function public.list_my_service_requests(text, integer, integer) is
  'MOD-06 paginated participant list. Returns only requests owned by the caller as customer or addressed to the caller worker, without exact location.';
comment on function public.get_my_service_request(uuid) is
  'MOD-06 participant detail. Exact location is returned only to the customer owner; the worker receives only job_area_label before a booking exists.';

