-- MOD-08 — Ciclo de vida de la contratación

create or replace function public.start_booking(p_booking_id uuid)
returns table (
  booking_id uuid,
  booking_status text,
  scheduled_at timestamptz,
  started_at timestamptz,
  completion_requested_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  booking_row public.bookings%rowtype;
  worker_owner_id uuid;
  transition_at timestamptz := statement_timestamp();
begin
  if caller_id is null or not private.is_current_user_active() then
    raise exception using errcode = '42501', message = 'active confirmed account required';
  end if;
  if p_booking_id is null then
    raise exception using errcode = '22023', message = 'booking is required';
  end if;

  select booking.* into booking_row
  from public.bookings as booking
  where booking.id = p_booking_id
  for update;

  if booking_row.id is null then
    raise exception using errcode = '42501', message = 'booking participation required';
  end if;

  select worker.profile_id into worker_owner_id
  from public.worker_profiles as worker
  where worker.id = booking_row.worker_id;

  if worker_owner_id <> caller_id then
    raise exception using errcode = '42501', message = 'assigned worker required';
  end if;
  if booking_row.status <> 'scheduled' then
    raise exception using errcode = '55000', message = 'booking is not scheduled';
  end if;

  update public.bookings as booking
  set status = 'in_progress', started_at = transition_at
  where booking.id = p_booking_id and booking.status = 'scheduled'
  returning booking.* into booking_row;

  if not found then
    raise exception using errcode = '55000', message = 'booking transition is stale';
  end if;

  insert into public.booking_status_history (
    booking_id, previous_status, new_status, changed_by_profile_id
  ) values (
    p_booking_id, 'scheduled', 'in_progress', caller_id
  );

  insert into public.notifications (
    profile_id, type, title, body, related_entity_type, related_entity_id
  ) values (
    booking_row.customer_profile_id,
    'booking_started',
    'Trabajo iniciado',
    'El profesional inició el trabajo contratado.',
    'booking',
    p_booking_id
  );

  return query select
    booking_row.id,
    booking_row.status,
    booking_row.scheduled_at,
    booking_row.started_at,
    booking_row.completion_requested_at,
    booking_row.completed_at,
    booking_row.updated_at;
end;
$$;

create or replace function public.request_booking_completion(p_booking_id uuid)
returns table (
  booking_id uuid,
  booking_status text,
  scheduled_at timestamptz,
  started_at timestamptz,
  completion_requested_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  booking_row public.bookings%rowtype;
  worker_owner_id uuid;
  transition_at timestamptz := statement_timestamp();
begin
  if caller_id is null or not private.is_current_user_active() then
    raise exception using errcode = '42501', message = 'active confirmed account required';
  end if;
  if p_booking_id is null then
    raise exception using errcode = '22023', message = 'booking is required';
  end if;

  select booking.* into booking_row
  from public.bookings as booking
  where booking.id = p_booking_id
  for update;

  if booking_row.id is null then
    raise exception using errcode = '42501', message = 'booking participation required';
  end if;

  select worker.profile_id into worker_owner_id
  from public.worker_profiles as worker
  where worker.id = booking_row.worker_id;

  if worker_owner_id <> caller_id then
    raise exception using errcode = '42501', message = 'assigned worker required';
  end if;
  if booking_row.status <> 'in_progress' then
    raise exception using errcode = '55000', message = 'booking is not in progress';
  end if;

  update public.bookings as booking
  set status = 'completion_pending', completion_requested_at = transition_at
  where booking.id = p_booking_id and booking.status = 'in_progress'
  returning booking.* into booking_row;

  if not found then
    raise exception using errcode = '55000', message = 'booking transition is stale';
  end if;

  insert into public.booking_status_history (
    booking_id, previous_status, new_status, changed_by_profile_id
  ) values (
    p_booking_id, 'in_progress', 'completion_pending', caller_id
  );

  insert into public.notifications (
    profile_id, type, title, body, related_entity_type, related_entity_id
  ) values (
    booking_row.customer_profile_id,
    'booking_completion_requested',
    'Finalización pendiente',
    'El profesional marcó el trabajo como finalizado. Confirma el resultado.',
    'booking',
    p_booking_id
  );

  return query select
    booking_row.id,
    booking_row.status,
    booking_row.scheduled_at,
    booking_row.started_at,
    booking_row.completion_requested_at,
    booking_row.completed_at,
    booking_row.updated_at;
end;
$$;

create or replace function public.confirm_booking_completion(p_booking_id uuid)
returns table (
  booking_id uuid,
  booking_status text,
  scheduled_at timestamptz,
  started_at timestamptz,
  completion_requested_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  booking_row public.bookings%rowtype;
  worker_owner_id uuid;
  transition_at timestamptz := statement_timestamp();
begin
  if caller_id is null or not private.is_current_user_active() then
    raise exception using errcode = '42501', message = 'active confirmed account required';
  end if;
  if p_booking_id is null then
    raise exception using errcode = '22023', message = 'booking is required';
  end if;

  select booking.* into booking_row
  from public.bookings as booking
  where booking.id = p_booking_id
  for update;

  if booking_row.id is null then
    raise exception using errcode = '42501', message = 'booking participation required';
  end if;

  if booking_row.customer_profile_id <> caller_id then
    raise exception using errcode = '42501', message = 'booking customer required';
  end if;
  if booking_row.status <> 'completion_pending' then
    raise exception using errcode = '55000', message = 'booking is not pending completion';
  end if;

  select worker.profile_id into worker_owner_id
  from public.worker_profiles as worker
  where worker.id = booking_row.worker_id;

  update public.bookings as booking
  set status = 'completed', completed_at = transition_at
  where booking.id = p_booking_id and booking.status = 'completion_pending'
  returning booking.* into booking_row;

  if not found then
    raise exception using errcode = '55000', message = 'booking transition is stale';
  end if;

  insert into public.booking_status_history (
    booking_id, previous_status, new_status, changed_by_profile_id
  ) values (
    p_booking_id, 'completion_pending', 'completed', caller_id
  );

  insert into public.notifications (
    profile_id, type, title, body, related_entity_type, related_entity_id
  ) values (
    worker_owner_id,
    'booking_completed',
    'Trabajo completado',
    'El cliente confirmó la finalización del trabajo.',
    'booking',
    p_booking_id
  );

  return query select
    booking_row.id,
    booking_row.status,
    booking_row.scheduled_at,
    booking_row.started_at,
    booking_row.completion_requested_at,
    booking_row.completed_at,
    booking_row.updated_at;
end;
$$;

create or replace function public.list_my_bookings(
  p_perspective text,
  p_offset integer default 0,
  p_limit integer default 12
)
returns table (
  booking_id uuid,
  perspective text,
  counterpart_display_name text,
  service_request_id uuid,
  service_title text,
  agreed_price_bob numeric,
  scheduled_at timestamptz,
  booking_status text,
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
  if p_offset is null or p_offset < 0 or p_limit is null or p_limit < 1 or p_limit > 20 then
    raise exception using errcode = '22023', message = 'invalid booking pagination';
  end if;

  return query
  select
    booking.id,
    p_perspective,
    case when p_perspective = 'customer'
      then concat_ws(
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
    booking.service_request_id,
    booking.service_title_snapshot,
    booking.agreed_price_bob,
    booking.scheduled_at,
    booking.status,
    booking.created_at,
    count(*) over ()
  from public.bookings as booking
  join public.worker_profiles as worker on worker.id = booking.worker_id
  join public.profiles as worker_profile on worker_profile.id = worker.profile_id
  join public.profiles as customer on customer.id = booking.customer_profile_id
  where (p_perspective = 'customer' and booking.customer_profile_id = caller_id)
     or (p_perspective = 'worker' and worker.profile_id = caller_id)
  order by booking.scheduled_at desc, booking.id desc
  offset p_offset limit p_limit;
end;
$$;

create or replace function public.get_my_booking(p_booking_id uuid)
returns table (
  booking_id uuid,
  perspective text,
  customer_display_name text,
  worker_display_name text,
  service_request_id uuid,
  service_title text,
  agreed_price_bob numeric,
  scheduled_at timestamptz,
  booking_status text,
  started_at timestamptz,
  completion_requested_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  job_description text,
  job_area_label text,
  exact_latitude double precision,
  exact_longitude double precision,
  address_text text,
  status_history jsonb
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
    booking.id,
    case when booking.customer_profile_id = caller_id then 'customer'::text else 'worker'::text end,
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
    booking.service_request_id,
    booking.service_title_snapshot,
    booking.agreed_price_bob,
    booking.scheduled_at,
    booking.status,
    booking.started_at,
    booking.completion_requested_at,
    booking.completed_at,
    booking.created_at,
    booking.updated_at,
    request.description,
    request.job_area_label,
    extensions.st_y(location.exact_location::extensions.geometry),
    extensions.st_x(location.exact_location::extensions.geometry),
    location.address_text,
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'previous_status', history.previous_status,
          'new_status', history.new_status,
          'changed_by_role', case
            when history.changed_by_profile_id is null then 'system'
            when history.changed_by_profile_id = booking.customer_profile_id then 'customer'
            when history.changed_by_profile_id = worker.profile_id then 'worker'
            else 'system'
          end,
          'created_at', history.created_at
        ) order by history.created_at, history.id
      )
      from public.booking_status_history as history
      where history.booking_id = booking.id
    ), '[]'::jsonb)
  from public.bookings as booking
  join public.service_requests as request on request.id = booking.service_request_id
  join public.service_request_locations as location on location.service_request_id = request.id
  join public.worker_profiles as worker on worker.id = booking.worker_id
  join public.profiles as worker_profile on worker_profile.id = worker.profile_id
  join public.profiles as customer on customer.id = booking.customer_profile_id
  where booking.id = p_booking_id
    and (booking.customer_profile_id = caller_id or worker.profile_id = caller_id);
end;
$$;

-- Extend the participant request detail with the already-created booking id so
-- the mobile handoff can navigate without an additional lookup.
drop function public.get_my_service_request(uuid);
create function public.get_my_service_request(p_request_id uuid)
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
  address_text text,
  booking_id uuid
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
    case when request.customer_profile_id = caller_id or booking.id is not null
      then extensions.st_y(location.exact_location::extensions.geometry) else null end,
    case when request.customer_profile_id = caller_id or booking.id is not null
      then extensions.st_x(location.exact_location::extensions.geometry) else null end,
    case when request.customer_profile_id = caller_id or booking.id is not null
      then location.address_text else null end,
    booking.id
  from public.service_requests as request
  join public.worker_profiles as worker on worker.id = request.worker_id
  join public.profiles as worker_profile on worker_profile.id = worker.profile_id
  join public.profiles as customer on customer.id = request.customer_profile_id
  join public.worker_services as service on service.id = request.worker_service_id
  join public.service_request_locations as location on location.service_request_id = request.id
  left join public.bookings as booking on booking.service_request_id = request.id
  where request.id = p_request_id
    and (request.customer_profile_id = caller_id or worker.profile_id = caller_id);
end;
$$;

revoke all on function public.start_booking(uuid) from public, anon;
revoke all on function public.request_booking_completion(uuid) from public, anon;
revoke all on function public.confirm_booking_completion(uuid) from public, anon;
revoke all on function public.list_my_bookings(text, integer, integer) from public, anon;
revoke all on function public.get_my_booking(uuid) from public, anon;
revoke all on function public.get_my_service_request(uuid) from public, anon;

grant execute on function public.start_booking(uuid) to authenticated;
grant execute on function public.request_booking_completion(uuid) to authenticated;
grant execute on function public.confirm_booking_completion(uuid) to authenticated;
grant execute on function public.list_my_bookings(text, integer, integer) to authenticated;
grant execute on function public.get_my_booking(uuid) to authenticated;
grant execute on function public.get_my_service_request(uuid) to authenticated;

comment on function public.start_booking(uuid) is
  'MOD-08 worker-only scheduled to in_progress transition with server timestamp, immutable history and customer notification.';
comment on function public.request_booking_completion(uuid) is
  'MOD-08 worker-only in_progress to completion_pending transition with server timestamp, immutable history and customer notification.';
comment on function public.confirm_booking_completion(uuid) is
  'MOD-08 customer-only completion_pending to completed transition with server timestamp, immutable history and worker notification.';
comment on function public.list_my_bookings(text, integer, integer) is
  'MOD-08 participant booking list with explicit customer/worker perspective, deterministic pagination and safe fields.';
comment on function public.get_my_booking(uuid) is
  'MOD-08 participant booking detail with post-booking location and safe immutable lifecycle history.';
comment on function public.get_my_service_request(uuid) is
  'MOD-08 participant request detail. Preserves post-booking location privacy and includes only the real booking id for navigation handoff.';
