-- MOD-02 — Perfil profesional y onboarding del trabajador

create extension if not exists postgis with schema extensions;

create table public.worker_profiles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id),
  bio text,
  years_experience smallint,
  approval_status text not null default 'draft'
    check (approval_status in ('draft', 'pending_approval', 'approved', 'rejected', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id),
  check (bio is null or char_length(btrim(bio)) between 40 and 600),
  check (years_experience is null or years_experience between 0 and 60)
);

create index worker_profiles_approval_status_idx on public.worker_profiles (approval_status);

create table public.worker_locations (
  worker_id uuid primary key references public.worker_profiles (id),
  private_location extensions.geography(Point, 4326) not null,
  public_location extensions.geography(Point, 4326),
  public_area_label text not null,
  city text not null,
  department text not null,
  country_code char(2) not null,
  service_radius_m integer not null,
  updated_at timestamptz not null default now(),
  check (service_radius_m > 0),
  check (country_code = 'BO')
);

create index worker_locations_private_location_gix
  on public.worker_locations using gist (private_location);
create index worker_locations_public_location_gix
  on public.worker_locations using gist (public_location);

create table public.service_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  icon_key text,
  active boolean not null default true,
  sort_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(btrim(name)) > 0),
  check (char_length(btrim(slug)) > 0),
  check (sort_order >= 0)
);

create table public.worker_services (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.worker_profiles (id),
  category_id uuid not null references public.service_categories (id),
  title text not null,
  description text,
  pricing_type text not null check (pricing_type in ('hourly', 'daily', 'fixed', 'quote')),
  price_bob numeric(12, 2),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (pricing_type = 'quote' and (price_bob is null or price_bob > 0))
    or (pricing_type <> 'quote' and price_bob > 0)
  )
);

create index worker_services_worker_id_idx on public.worker_services (worker_id);
create index worker_services_category_id_idx on public.worker_services (category_id);
create index worker_services_active_idx on public.worker_services (active);

create table public.worker_availability (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.worker_profiles (id),
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time),
  unique (worker_id, day_of_week, start_time, end_time)
);

create index worker_availability_worker_day_idx
  on public.worker_availability (worker_id, day_of_week);

create table public.worker_portfolio_items (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.worker_profiles (id),
  storage_path text not null,
  title text,
  description text,
  sort_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (sort_order >= 0)
);

create index worker_portfolio_worker_idx on public.worker_portfolio_items (worker_id);

create table public.worker_approval_requests (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.worker_profiles (id),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  profile_snapshot jsonb not null,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by_profile_id uuid references public.profiles (id),
  rejection_reason text,
  admin_notes text,
  created_at timestamptz not null default now(),
  check (
    (status = 'pending' and reviewed_at is null and reviewed_by_profile_id is null)
    or (status = 'approved' and reviewed_at is not null and reviewed_by_profile_id is not null)
    or (
      status = 'rejected' and reviewed_at is not null and reviewed_by_profile_id is not null
      and char_length(btrim(coalesce(rejection_reason, ''))) > 0
    )
  )
);

create unique index worker_approval_requests_one_pending_idx
  on public.worker_approval_requests (worker_id) where status = 'pending';
create index worker_approval_requests_worker_idx
  on public.worker_approval_requests (worker_id, submitted_at desc);

insert into public.service_categories (id, name, slug, icon_key, active, sort_order)
values
  ('00000000-0000-4000-8000-000000000001', 'Electricidad', 'electricidad', 'bolt', true, 10),
  ('00000000-0000-4000-8000-000000000002', 'Plomería', 'plomeria', 'water', true, 20),
  ('00000000-0000-4000-8000-000000000003', 'Carpintería', 'carpinteria', 'carpentry', true, 30),
  ('00000000-0000-4000-8000-000000000004', 'Construcción', 'construccion', 'construction', true, 40),
  ('00000000-0000-4000-8000-000000000005', 'Limpieza', 'limpieza', 'cleaning', true, 50),
  ('00000000-0000-4000-8000-000000000006', 'Jardinería', 'jardineria', 'garden', true, 60),
  ('00000000-0000-4000-8000-000000000007', 'Pintura', 'pintura', 'paint', true, 70),
  ('00000000-0000-4000-8000-000000000008', 'Mecánica', 'mecanica', 'mechanic', true, 80)
on conflict (slug) do nothing;

create or replace function private.is_current_user_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_current_user_active() and exists (
    select 1
    from public.user_roles
    where profile_id = (select auth.uid()) and role = 'admin'
  );
$$;

create or replace function private.owns_worker(p_worker_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_current_user_active() and exists (
    select 1
    from public.worker_profiles
    where id = p_worker_id and profile_id = (select auth.uid())
  );
$$;

create or replace function private.owns_editable_worker(p_worker_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_current_user_active() and exists (
    select 1
    from public.worker_profiles
    where id = p_worker_id
      and profile_id = (select auth.uid())
      and approval_status in ('draft', 'rejected')
  );
$$;

create or replace function private.assert_owned_editable_worker(p_worker_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_id uuid;
  worker_status text;
begin
  if (select auth.uid()) is null or not private.is_current_user_active() then
    raise exception using errcode = '42501', message = 'active confirmed account required';
  end if;

  select profile_id, approval_status
  into owner_id, worker_status
  from public.worker_profiles
  where id = p_worker_id
  for update;

  if owner_id is null or owner_id <> (select auth.uid()) then
    raise exception using errcode = '42501', message = 'worker ownership required';
  end if;
  if worker_status not in ('draft', 'rejected') then
    raise exception using errcode = '55000', message = 'worker onboarding is read-only in the current state';
  end if;
end;
$$;

revoke all on function private.is_current_user_admin() from public, anon;
revoke all on function private.owns_worker(uuid) from public, anon;
revoke all on function private.owns_editable_worker(uuid) from public, anon;
revoke all on function private.assert_owned_editable_worker(uuid) from public, anon, authenticated;
grant execute on function private.is_current_user_admin() to authenticated;
grant execute on function private.owns_worker(uuid) to authenticated;
grant execute on function private.owns_editable_worker(uuid) to authenticated;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger worker_profiles_set_updated_at
  before update on public.worker_profiles
  for each row execute function private.set_updated_at();
create trigger service_categories_set_updated_at
  before update on public.service_categories
  for each row execute function private.set_updated_at();
create trigger worker_services_set_updated_at
  before update on public.worker_services
  for each row execute function private.set_updated_at();
create trigger worker_locations_set_updated_at
  before update on public.worker_locations
  for each row execute function private.set_updated_at();
create trigger worker_availability_set_updated_at
  before update on public.worker_availability
  for each row execute function private.set_updated_at();
create trigger worker_portfolio_set_updated_at
  before update on public.worker_portfolio_items
  for each row execute function private.set_updated_at();

create or replace function private.validate_worker_profile_edit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null then
    if not private.owns_editable_worker(old.id) then
      raise exception using errcode = '42501', message = 'editable worker ownership required';
    end if;
    if new.id <> old.id or new.profile_id <> old.profile_id
       or new.created_at <> old.created_at then
      raise exception using errcode = '42501', message = 'worker identity is not client editable';
    end if;
  end if;

  new.bio := nullif(btrim(coalesce(new.bio, '')), '');
  if new.bio is not null and char_length(new.bio) not between 40 and 600 then
    raise exception using errcode = '22023', message = 'bio must contain between 40 and 600 characters';
  end if;
  if new.years_experience is not null and new.years_experience not between 0 and 60 then
    raise exception using errcode = '22023', message = 'years_experience must be between 0 and 60';
  end if;
  return new;
end;
$$;

create trigger validate_worker_profile_edit
  before update on public.worker_profiles
  for each row execute function private.validate_worker_profile_edit();

create or replace function private.validate_worker_service()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.worker_id <> old.worker_id then
    raise exception using errcode = '42501', message = 'worker_id is immutable';
  end if;
  if tg_op = 'UPDATE' and (new.id <> old.id or new.created_at <> old.created_at) then
    raise exception using errcode = '42501', message = 'service identity is immutable';
  end if;
  perform private.assert_owned_editable_worker(new.worker_id);
  new.title := btrim(new.title);
  new.description := nullif(btrim(coalesce(new.description, '')), '');

  if not exists (select 1 from public.service_categories where id = new.category_id and active) then
    raise exception using errcode = '22023', message = 'active service category required';
  end if;
  if char_length(new.title) not between 5 and 80 then
    raise exception using errcode = '22023', message = 'service title must contain between 5 and 80 characters';
  end if;
  if new.description is null or char_length(new.description) not between 20 and 500 then
    raise exception using errcode = '22023', message = 'service description must contain between 20 and 500 characters';
  end if;
  if new.pricing_type = 'quote' and new.price_bob is not null then
    raise exception using errcode = '22023', message = 'quote services must not have a fixed price';
  end if;
  if new.pricing_type <> 'quote' and (new.price_bob is null or new.price_bob <= 0) then
    raise exception using errcode = '22023', message = 'priced services require a positive BOB price';
  end if;
  return new;
end;
$$;

create trigger validate_worker_service
  before insert or update on public.worker_services
  for each row execute function private.validate_worker_service();

create or replace function private.guard_worker_child_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.assert_owned_editable_worker(old.worker_id);
  return old;
end;
$$;

create trigger guard_worker_service_delete
  before delete on public.worker_services
  for each row execute function private.guard_worker_child_delete();

create or replace function private.validate_worker_location()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.worker_id <> old.worker_id then
    raise exception using errcode = '42501', message = 'worker_id is immutable';
  end if;
  perform private.assert_owned_editable_worker(new.worker_id);
  new.public_location := null;
  new.public_area_label := btrim(new.public_area_label);
  new.city := btrim(new.city);
  new.department := btrim(new.department);
  if char_length(new.public_area_label) = 0 or char_length(new.city) = 0 or char_length(new.department) = 0 then
    raise exception using errcode = '22023', message = 'area label, city and department are required';
  end if;
  if new.country_code <> 'BO' then
    raise exception using errcode = '22023', message = 'country_code must be BO';
  end if;
  if extensions.st_isempty(new.private_location::extensions.geometry)
     or not extensions.st_isvalid(new.private_location::extensions.geometry) then
    raise exception using errcode = '22023', message = 'a valid private point is required';
  end if;
  if new.service_radius_m not between 1000 and 50000 or new.service_radius_m % 1000 <> 0 then
    raise exception using errcode = '22023', message = 'service radius must be a whole kilometer between 1 and 50 km';
  end if;
  return new;
end;
$$;

create trigger validate_worker_location
  before insert or update on public.worker_locations
  for each row execute function private.validate_worker_location();
create trigger guard_worker_location_delete
  before delete on public.worker_locations
  for each row execute function private.guard_worker_child_delete();

create or replace function private.validate_worker_availability()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.worker_id <> old.worker_id then
    raise exception using errcode = '42501', message = 'worker_id is immutable';
  end if;
  if tg_op = 'UPDATE' and (new.id <> old.id or new.created_at <> old.created_at) then
    raise exception using errcode = '42501', message = 'availability identity is immutable';
  end if;
  perform private.assert_owned_editable_worker(new.worker_id);

  if new.start_time >= new.end_time then
    raise exception using errcode = '22023', message = 'availability must start before it ends';
  end if;
  if extract(minute from new.start_time)::integer % 30 <> 0
     or extract(second from new.start_time) <> 0
     or extract(minute from new.end_time)::integer % 30 <> 0
     or extract(second from new.end_time) <> 0 then
    raise exception using errcode = '22023', message = 'availability must use 30-minute increments';
  end if;

  if new.active and exists (
    select 1
    from public.worker_availability existing
    where existing.worker_id = new.worker_id
      and existing.day_of_week = new.day_of_week
      and existing.active
      and (tg_op = 'INSERT' or existing.id <> new.id)
      and new.start_time < existing.end_time
      and new.end_time > existing.start_time
  ) then
    raise exception using errcode = '23P01', message = 'availability ranges must not overlap';
  end if;
  return new;
end;
$$;

create trigger validate_worker_availability
  before insert or update on public.worker_availability
  for each row execute function private.validate_worker_availability();
create trigger guard_worker_availability_delete
  before delete on public.worker_availability
  for each row execute function private.guard_worker_child_delete();

create or replace function private.validate_worker_portfolio_item()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  item_count integer;
begin
  if tg_op = 'UPDATE' and new.worker_id <> old.worker_id then
    raise exception using errcode = '42501', message = 'worker_id is immutable';
  end if;
  if tg_op = 'UPDATE' and (new.id <> old.id or new.created_at <> old.created_at) then
    raise exception using errcode = '42501', message = 'portfolio identity is immutable';
  end if;
  perform private.assert_owned_editable_worker(new.worker_id);
  new.title := nullif(btrim(coalesce(new.title, '')), '');
  new.description := nullif(btrim(coalesce(new.description, '')), '');

  if new.title is null or char_length(new.title) not between 3 and 80 then
    raise exception using errcode = '22023', message = 'portfolio title must contain between 3 and 80 characters';
  end if;
  if new.description is not null and char_length(new.description) > 300 then
    raise exception using errcode = '22023', message = 'portfolio description must not exceed 300 characters';
  end if;
  if new.storage_path !~ ('^' || new.worker_id::text || '/' || new.id::text || '/image\.(jpe?g|png|webp)$') then
    raise exception using errcode = '22023', message = 'invalid portfolio storage path';
  end if;
  if tg_op = 'INSERT' then
    select count(*) into item_count
    from public.worker_portfolio_items where worker_id = new.worker_id;
    if item_count >= 12 then
      raise exception using errcode = '22023', message = 'portfolio supports at most 12 items';
    end if;
  end if;
  return new;
end;
$$;

create trigger validate_worker_portfolio_item
  before insert or update on public.worker_portfolio_items
  for each row execute function private.validate_worker_portfolio_item();
create trigger guard_worker_portfolio_delete
  before delete on public.worker_portfolio_items
  for each row execute function private.guard_worker_child_delete();

create or replace function private.protect_worker_approval_history()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception using errcode = '55000', message = 'approval history cannot be deleted';
  end if;
  if new.id <> old.id or new.worker_id <> old.worker_id
     or new.profile_snapshot <> old.profile_snapshot
     or new.submitted_at <> old.submitted_at or new.created_at <> old.created_at then
    raise exception using errcode = '55000', message = 'approval submission snapshot is immutable';
  end if;
  return new;
end;
$$;

create trigger protect_worker_approval_history
  before update or delete on public.worker_approval_requests
  for each row execute function private.protect_worker_approval_history();

create or replace function public.start_or_resume_worker_onboarding()
returns public.worker_profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.worker_profiles;
begin
  if (select auth.uid()) is null or not private.is_current_user_active() then
    raise exception using errcode = '42501', message = 'active confirmed account required';
  end if;

  insert into public.worker_profiles (profile_id, approval_status)
  values ((select auth.uid()), 'draft')
  on conflict (profile_id) do nothing;

  select * into result
  from public.worker_profiles
  where profile_id = (select auth.uid());
  return result;
end;
$$;

create or replace function public.submit_worker_profile_for_approval()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  worker_row public.worker_profiles;
  location_row public.worker_locations;
  request_id uuid;
  services_snapshot jsonb;
  availability_snapshot jsonb;
  portfolio_snapshot jsonb;
  snapshot jsonb;
begin
  if caller_id is null or not private.is_current_user_active() then
    raise exception using errcode = '42501', message = 'active confirmed account required';
  end if;

  select * into worker_row
  from public.worker_profiles
  where profile_id = caller_id
  for update;

  if worker_row.id is null then
    raise exception using errcode = 'P0002', message = 'worker profile not found';
  end if;
  if worker_row.approval_status not in ('draft', 'rejected') then
    raise exception using errcode = '55000', message = 'worker profile is not eligible for submission';
  end if;
  if exists (
    select 1 from public.worker_approval_requests
    where worker_id = worker_row.id and status = 'pending'
  ) then
    raise exception using errcode = '23505', message = 'a pending approval request already exists';
  end if;
  if worker_row.bio is null or char_length(btrim(worker_row.bio)) not between 40 and 600
     or worker_row.years_experience is null or worker_row.years_experience not between 0 and 60 then
    raise exception using errcode = '22023', message = 'professional profile is incomplete';
  end if;

  if not exists (
    select 1 from public.worker_services
    where worker_id = worker_row.id and active
  ) then
    raise exception using errcode = '22023', message = 'at least one active service is required';
  end if;
  if exists (
    select 1
    from public.worker_services service
    left join public.service_categories category on category.id = service.category_id
    where service.worker_id = worker_row.id and service.active
      and (
        category.id is null or not category.active
        or char_length(btrim(service.title)) not between 5 and 80
        or service.description is null or char_length(btrim(service.description)) not between 20 and 500
        or (service.pricing_type = 'quote' and service.price_bob is not null)
        or (service.pricing_type <> 'quote' and (service.price_bob is null or service.price_bob <= 0))
      )
  ) then
    raise exception using errcode = '22023', message = 'an active service is invalid';
  end if;

  select * into location_row
  from public.worker_locations where worker_id = worker_row.id;
  if location_row.worker_id is null
     or extensions.st_isempty(location_row.private_location::extensions.geometry)
     or not extensions.st_isvalid(location_row.private_location::extensions.geometry)
     or char_length(btrim(location_row.public_area_label)) = 0
     or char_length(btrim(location_row.city)) = 0
     or char_length(btrim(location_row.department)) = 0
     or location_row.country_code <> 'BO'
     or location_row.service_radius_m not between 1000 and 50000
     or location_row.service_radius_m % 1000 <> 0 then
    raise exception using errcode = '22023', message = 'work area is incomplete';
  end if;

  if not exists (
    select 1 from public.worker_availability
    where worker_id = worker_row.id and active
  ) then
    raise exception using errcode = '22023', message = 'at least one availability range is required';
  end if;
  if exists (
    select 1 from public.worker_availability availability
    where availability.worker_id = worker_row.id and availability.active
      and (
        availability.start_time >= availability.end_time
        or extract(minute from availability.start_time)::integer % 30 <> 0
        or extract(second from availability.start_time) <> 0
        or extract(minute from availability.end_time)::integer % 30 <> 0
        or extract(second from availability.end_time) <> 0
      )
  ) or exists (
    select 1
    from public.worker_availability first_range
    join public.worker_availability second_range
      on second_range.worker_id = first_range.worker_id
      and second_range.day_of_week = first_range.day_of_week
      and second_range.id > first_range.id
      and second_range.active
      and first_range.start_time < second_range.end_time
      and first_range.end_time > second_range.start_time
    where first_range.worker_id = worker_row.id and first_range.active
  ) then
    raise exception using errcode = '22023', message = 'availability contains an invalid or overlapping range';
  end if;

  if (select count(*) from public.worker_portfolio_items where worker_id = worker_row.id) > 12
     or exists (
       select 1 from public.worker_portfolio_items item
       where item.worker_id = worker_row.id and (
          item.title is null or char_length(btrim(item.title)) not between 3 and 80
          or (item.description is not null and char_length(btrim(item.description)) > 300)
          or item.storage_path !~ ('^' || worker_row.id::text || '/' || item.id::text || '/image\.(jpe?g|png|webp)$')
          or not exists (
           select 1 from storage.objects object
           where object.bucket_id = 'worker-portfolio' and object.name = item.storage_path
         )
       )
     ) then
    raise exception using errcode = '22023', message = 'portfolio contains an invalid or missing image';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', service.id,
    'category_id', service.category_id,
    'category_name', category.name,
    'title', service.title,
    'description', service.description,
    'pricing_type', service.pricing_type,
    'price_bob', service.price_bob,
    'active', service.active
  ) order by service.created_at, service.id), '[]'::jsonb)
  into services_snapshot
  from public.worker_services service
  join public.service_categories category on category.id = service.category_id
  where service.worker_id = worker_row.id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', availability.id,
    'day_of_week', availability.day_of_week,
    'start_time', availability.start_time,
    'end_time', availability.end_time,
    'active', availability.active,
    'timezone', 'America/La_Paz'
  ) order by availability.day_of_week, availability.start_time, availability.id), '[]'::jsonb)
  into availability_snapshot
  from public.worker_availability availability
  where availability.worker_id = worker_row.id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', item.id,
    'storage_path', item.storage_path,
    'title', item.title,
    'description', item.description,
    'sort_order', item.sort_order
  ) order by item.sort_order, item.created_at, item.id), '[]'::jsonb)
  into portfolio_snapshot
  from public.worker_portfolio_items item
  where item.worker_id = worker_row.id;

  snapshot := jsonb_build_object(
    'snapshot_version', 1,
    'submitted_by_profile_id', caller_id,
    'submitted_at', now(),
    'professional_profile', jsonb_build_object(
      'worker_id', worker_row.id,
      'profile_id', worker_row.profile_id,
      'bio', worker_row.bio,
      'years_experience', worker_row.years_experience
    ),
    'services', services_snapshot,
    'location', jsonb_build_object(
      'private_location_geojson', extensions.st_asgeojson(location_row.private_location)::jsonb,
      'public_location_geojson', case when location_row.public_location is null then null
        else extensions.st_asgeojson(location_row.public_location)::jsonb end,
      'public_area_label', location_row.public_area_label,
      'city', location_row.city,
      'department', location_row.department,
      'country_code', location_row.country_code,
      'service_radius_m', location_row.service_radius_m
    ),
    'availability', availability_snapshot,
    'portfolio', portfolio_snapshot
  );

  insert into public.worker_approval_requests (
    worker_id, status, profile_snapshot, submitted_at
  ) values (
    worker_row.id, 'pending', snapshot, now()
  ) returning id into request_id;

  update public.worker_profiles
  set approval_status = 'pending_approval', updated_at = now()
  where id = worker_row.id;

  return request_id;
end;
$$;

revoke all on function public.start_or_resume_worker_onboarding() from public, anon;
revoke all on function public.submit_worker_profile_for_approval() from public, anon;
grant execute on function public.start_or_resume_worker_onboarding() to authenticated;
grant execute on function public.submit_worker_profile_for_approval() to authenticated;

revoke all on function private.set_updated_at() from public, anon, authenticated;
revoke all on function private.validate_worker_profile_edit() from public, anon, authenticated;
revoke all on function private.validate_worker_service() from public, anon, authenticated;
revoke all on function private.guard_worker_child_delete() from public, anon, authenticated;
revoke all on function private.validate_worker_location() from public, anon, authenticated;
revoke all on function private.validate_worker_availability() from public, anon, authenticated;
revoke all on function private.validate_worker_portfolio_item() from public, anon, authenticated;
revoke all on function private.protect_worker_approval_history() from public, anon, authenticated;

alter table public.worker_profiles enable row level security;
alter table public.worker_locations enable row level security;
alter table public.service_categories enable row level security;
alter table public.worker_services enable row level security;
alter table public.worker_availability enable row level security;
alter table public.worker_portfolio_items enable row level security;
alter table public.worker_approval_requests enable row level security;

revoke all on table public.worker_profiles from anon, authenticated;
revoke all on table public.worker_locations from anon, authenticated;
revoke all on table public.service_categories from anon, authenticated;
revoke all on table public.worker_services from anon, authenticated;
revoke all on table public.worker_availability from anon, authenticated;
revoke all on table public.worker_portfolio_items from anon, authenticated;
revoke all on table public.worker_approval_requests from anon, authenticated;

grant select on public.worker_profiles, public.worker_locations, public.service_categories,
  public.worker_services, public.worker_availability, public.worker_portfolio_items,
  public.worker_approval_requests to authenticated;
grant update (bio, years_experience) on public.worker_profiles to authenticated;
grant insert, update, delete on public.worker_locations, public.worker_services,
  public.worker_availability, public.worker_portfolio_items to authenticated;

create policy worker_profiles_select_owner_or_admin
on public.worker_profiles for select to authenticated
using (private.owns_worker(id) or private.is_current_user_admin());
create policy worker_profiles_update_owner_editable
on public.worker_profiles for update to authenticated
using (private.owns_editable_worker(id))
with check (private.owns_editable_worker(id));

create policy service_categories_select_active
on public.service_categories for select to authenticated
using (active and private.is_current_user_active());

create policy worker_locations_select_owner_or_admin
on public.worker_locations for select to authenticated
using (private.owns_worker(worker_id) or private.is_current_user_admin());
create policy worker_locations_insert_owner_editable
on public.worker_locations for insert to authenticated
with check (private.owns_editable_worker(worker_id));
create policy worker_locations_update_owner_editable
on public.worker_locations for update to authenticated
using (private.owns_editable_worker(worker_id))
with check (private.owns_editable_worker(worker_id));
create policy worker_locations_delete_owner_editable
on public.worker_locations for delete to authenticated
using (private.owns_editable_worker(worker_id));

create policy worker_services_select_owner_or_admin
on public.worker_services for select to authenticated
using (private.owns_worker(worker_id) or private.is_current_user_admin());
create policy worker_services_insert_owner_editable
on public.worker_services for insert to authenticated
with check (private.owns_editable_worker(worker_id));
create policy worker_services_update_owner_editable
on public.worker_services for update to authenticated
using (private.owns_editable_worker(worker_id))
with check (private.owns_editable_worker(worker_id));
create policy worker_services_delete_owner_editable
on public.worker_services for delete to authenticated
using (private.owns_editable_worker(worker_id));

create policy worker_availability_select_owner_or_admin
on public.worker_availability for select to authenticated
using (private.owns_worker(worker_id) or private.is_current_user_admin());
create policy worker_availability_insert_owner_editable
on public.worker_availability for insert to authenticated
with check (private.owns_editable_worker(worker_id));
create policy worker_availability_update_owner_editable
on public.worker_availability for update to authenticated
using (private.owns_editable_worker(worker_id))
with check (private.owns_editable_worker(worker_id));
create policy worker_availability_delete_owner_editable
on public.worker_availability for delete to authenticated
using (private.owns_editable_worker(worker_id));

create policy worker_portfolio_select_owner_or_admin
on public.worker_portfolio_items for select to authenticated
using (private.owns_worker(worker_id) or private.is_current_user_admin());
create policy worker_portfolio_insert_owner_editable
on public.worker_portfolio_items for insert to authenticated
with check (private.owns_editable_worker(worker_id));
create policy worker_portfolio_update_owner_editable
on public.worker_portfolio_items for update to authenticated
using (private.owns_editable_worker(worker_id))
with check (private.owns_editable_worker(worker_id));
create policy worker_portfolio_delete_owner_editable
on public.worker_portfolio_items for delete to authenticated
using (private.owns_editable_worker(worker_id));

create policy worker_approval_requests_select_owner_or_admin
on public.worker_approval_requests for select to authenticated
using (private.owns_worker(worker_id) or private.is_current_user_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'worker-portfolio',
  'worker-portfolio',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy worker_portfolio_objects_select_owner_or_admin
on storage.objects for select to authenticated
using (
  bucket_id = 'worker-portfolio'
  and (
    exists (
      select 1 from public.worker_profiles worker
      where worker.id::text = (storage.foldername(name))[1]
        and worker.profile_id = (select auth.uid())
        and private.is_current_user_active()
    )
    or private.is_current_user_admin()
  )
);

create policy worker_portfolio_objects_insert_owner_editable
on storage.objects for insert to authenticated
with check (
  bucket_id = 'worker-portfolio'
  and name ~ '^[0-9a-f-]{36}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/image\.(jpe?g|png|webp)$'
  and exists (
    select 1 from public.worker_profiles worker
    where worker.id::text = (storage.foldername(name))[1]
      and worker.profile_id = (select auth.uid())
      and worker.approval_status in ('draft', 'rejected')
      and private.is_current_user_active()
  )
);

create policy worker_portfolio_objects_update_owner_editable
on storage.objects for update to authenticated
using (
  bucket_id = 'worker-portfolio'
  and exists (
    select 1 from public.worker_profiles worker
    where worker.id::text = (storage.foldername(name))[1]
      and worker.profile_id = (select auth.uid())
      and worker.approval_status in ('draft', 'rejected')
      and private.is_current_user_active()
  )
)
with check (
  bucket_id = 'worker-portfolio'
  and name ~ '^[0-9a-f-]{36}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/image\.(jpe?g|png|webp)$'
  and exists (
    select 1 from public.worker_profiles worker
    where worker.id::text = (storage.foldername(name))[1]
      and worker.profile_id = (select auth.uid())
      and worker.approval_status in ('draft', 'rejected')
      and private.is_current_user_active()
  )
);

create policy worker_portfolio_objects_delete_owner_editable
on storage.objects for delete to authenticated
using (
  bucket_id = 'worker-portfolio'
  and exists (
    select 1 from public.worker_profiles worker
    where worker.id::text = (storage.foldername(name))[1]
      and worker.profile_id = (select auth.uid())
      and worker.approval_status in ('draft', 'rejected')
      and private.is_current_user_active()
  )
);

comment on function public.start_or_resume_worker_onboarding() is
  'MOD-02 idempotent explicit worker onboarding start for the authenticated active profile.';
comment on function public.submit_worker_profile_for_approval() is
  'MOD-02 atomic owner-only submission. Revalidates the complete profile, creates an immutable snapshot and transitions to pending_approval.';
