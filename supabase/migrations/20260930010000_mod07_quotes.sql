-- MOD-07 — Cotizaciones, revisiones y aceptación

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  service_request_id uuid not null references public.service_requests (id),
  revision_number integer not null check (revision_number > 0),
  amount_bob numeric(12, 2) not null check (amount_bob > 0),
  message text,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected', 'withdrawn', 'expired', 'superseded')),
  valid_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (service_request_id, revision_number)
);

create unique index quotes_one_pending_per_request_uidx
  on public.quotes (service_request_id) where status = 'pending';
create unique index quotes_one_accepted_per_request_uidx
  on public.quotes (service_request_id) where status = 'accepted';
create index quotes_request_revision_idx
  on public.quotes (service_request_id, revision_number desc);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  service_request_id uuid not null unique references public.service_requests (id),
  accepted_quote_id uuid not null unique references public.quotes (id),
  customer_profile_id uuid not null references public.profiles (id),
  worker_id uuid not null references public.worker_profiles (id),
  service_title_snapshot text not null,
  agreed_price_bob numeric(12, 2) not null check (agreed_price_bob > 0),
  scheduled_at timestamptz not null,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'in_progress', 'completion_pending', 'completed', 'cancelled')),
  started_at timestamptz,
  completion_requested_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancelled_by_profile_id uuid references public.profiles (id),
  cancellation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index bookings_customer_created_idx
  on public.bookings (customer_profile_id, created_at desc);
create index bookings_worker_created_idx
  on public.bookings (worker_id, created_at desc);

create table public.booking_status_history (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id),
  previous_status text
    check (previous_status is null or previous_status in ('scheduled', 'in_progress', 'completion_pending', 'completed', 'cancelled')),
  new_status text not null
    check (new_status in ('scheduled', 'in_progress', 'completion_pending', 'completed', 'cancelled')),
  changed_by_profile_id uuid references public.profiles (id),
  note text,
  created_at timestamptz not null default now()
);

create index booking_status_history_booking_idx
  on public.booking_status_history (booking_id, created_at);

create trigger quotes_set_updated_at
  before update on public.quotes
  for each row execute function private.set_updated_at();
create trigger bookings_set_updated_at
  before update on public.bookings
  for each row execute function private.set_updated_at();

create or replace function private.validate_booking_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_row public.service_requests%rowtype;
  quote_row public.quotes%rowtype;
begin
  select * into request_row
  from public.service_requests
  where id = new.service_request_id;

  select * into quote_row
  from public.quotes
  where id = new.accepted_quote_id;

  if request_row.id is null or quote_row.id is null
     or quote_row.service_request_id <> request_row.id
     or quote_row.status <> 'accepted'
     or request_row.status <> 'accepted'
     or new.customer_profile_id <> request_row.customer_profile_id
     or new.worker_id <> request_row.worker_id
     or new.agreed_price_bob <> quote_row.amount_bob then
    raise exception using errcode = '23514', message = 'booking must match its accepted request and quote';
  end if;

  return new;
end;
$$;

create trigger bookings_validate_insert
  before insert on public.bookings
  for each row execute function private.validate_booking_insert();

create or replace function public.create_service_request_quote(
  p_service_request_id uuid,
  p_amount_bob numeric,
  p_message text default null,
  p_valid_until_date date default null,
  p_valid_until_time time default null
)
returns table (
  quote_id uuid,
  revision_number integer,
  quote_status text,
  amount_bob numeric,
  message text,
  valid_until timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  request_worker_id uuid;
  request_status text;
  request_expires_at timestamptz;
  worker_owner_id uuid;
  worker_status text;
  worker_account_status text;
  next_revision integer;
  clean_message text := nullif(regexp_replace(btrim(coalesce(p_message, '')), '[[:space:]]+', ' ', 'g'), '');
  computed_valid_until timestamptz;
  created_quote_id uuid;
  created_quote_at timestamptz;
begin
  if caller_id is null or not private.is_current_user_active() then
    raise exception using errcode = '42501', message = 'active confirmed account required';
  end if;
  if p_service_request_id is null then
    raise exception using errcode = '22023', message = 'service request is required';
  end if;
  if p_amount_bob is null or p_amount_bob <= 0
     or p_amount_bob > 9999999999.99
     or p_amount_bob <> round(p_amount_bob, 2) then
    raise exception using errcode = '22023', message = 'amount_bob must be positive with at most two decimals';
  end if;
  if (p_valid_until_date is null) <> (p_valid_until_time is null) then
    raise exception using errcode = '22023', message = 'validity date and time must be provided together';
  end if;
  if p_valid_until_date is not null then
    computed_valid_until := (p_valid_until_date + p_valid_until_time) at time zone 'America/La_Paz';
    if computed_valid_until <= now() then
      raise exception using errcode = '22023', message = 'valid_until must be in the future';
    end if;
  end if;

  select
    request.worker_id,
    request.status,
    request.expires_at,
    worker.profile_id,
    worker.approval_status,
    profile.account_status
  into
    request_worker_id,
    request_status,
    request_expires_at,
    worker_owner_id,
    worker_status,
    worker_account_status
  from public.service_requests as request
  join public.worker_profiles as worker on worker.id = request.worker_id
  join public.profiles as profile on profile.id = worker.profile_id
  where request.id = p_service_request_id
  for update of request;

  if request_worker_id is null then
    raise exception using errcode = '22023', message = 'service request is not available';
  end if;
  if worker_owner_id <> caller_id then
    raise exception using errcode = '42501', message = 'target worker ownership required';
  end if;
  if worker_status <> 'approved' or worker_account_status <> 'active' then
    raise exception using errcode = '55000', message = 'target worker is not eligible to quote';
  end if;
  if request_status not in ('pending', 'quoted')
     or (request_expires_at is not null and request_expires_at <= now()) then
    raise exception using errcode = '55000', message = 'service request is not quotable';
  end if;

  select coalesce(max(existing.revision_number), 0) + 1
  into next_revision
  from public.quotes as existing
  where existing.service_request_id = p_service_request_id;

  update public.quotes
  set status = 'superseded'
  where service_request_id = p_service_request_id
    and status = 'pending';

  insert into public.quotes (
    service_request_id,
    revision_number,
    amount_bob,
    message,
    status,
    valid_until
  ) values (
    p_service_request_id,
    next_revision,
    p_amount_bob,
    clean_message,
    'pending',
    computed_valid_until
  )
  returning id, quotes.created_at into created_quote_id, created_quote_at;

  update public.service_requests
  set status = 'quoted'
  where id = p_service_request_id
    and status = 'pending';

  return query
  select
    created_quote_id,
    next_revision,
    'pending'::text,
    p_amount_bob,
    clean_message,
    computed_valid_until,
    created_quote_at;
end;
$$;

create or replace function public.list_my_service_request_quotes(p_service_request_id uuid)
returns table (
  quote_id uuid,
  revision_number integer,
  amount_bob numeric,
  message text,
  quote_status text,
  valid_until timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  is_current boolean,
  booking_id uuid,
  scheduled_at timestamptz
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
  if not exists (
    select 1
    from public.service_requests as request
    join public.worker_profiles as worker on worker.id = request.worker_id
    where request.id = p_service_request_id
      and (request.customer_profile_id = caller_id or worker.profile_id = caller_id)
  ) then
    raise exception using errcode = '42501', message = 'service request participation required';
  end if;

  return query
  select
    quote.id,
    quote.revision_number,
    quote.amount_bob,
    quote.message,
    quote.status,
    quote.valid_until,
    quote.created_at,
    quote.updated_at,
    quote.revision_number = max(quote.revision_number) over (),
    booking.id,
    booking.scheduled_at
  from public.quotes as quote
  left join public.bookings as booking on booking.accepted_quote_id = quote.id
  where quote.service_request_id = p_service_request_id
  order by quote.revision_number desc, quote.id desc;
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
    case when request.customer_profile_id = caller_id or booking.id is not null
      then extensions.st_y(location.exact_location::extensions.geometry) else null end,
    case when request.customer_profile_id = caller_id or booking.id is not null
      then extensions.st_x(location.exact_location::extensions.geometry) else null end,
    case when request.customer_profile_id = caller_id or booking.id is not null
      then location.address_text else null end
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

create or replace function public.accept_service_request_quote(
  p_quote_id uuid,
  p_scheduled_date date,
  p_scheduled_time time
)
returns table (
  accepted_quote_id uuid,
  booking_id uuid,
  request_status text,
  booking_status text,
  scheduled_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  target_request_id uuid;
  request_customer_id uuid;
  request_worker_id uuid;
  current_request_status text;
  request_expires_at timestamptz;
  quote_request_id uuid;
  quote_revision integer;
  quote_amount numeric(12, 2);
  current_quote_status text;
  quote_valid_until timestamptz;
  latest_revision integer;
  worker_owner_id uuid;
  worker_status text;
  worker_account_status text;
  service_title text;
  authoritative_scheduled_at timestamptz;
  created_booking_id uuid;
begin
  if caller_id is null or not private.is_current_user_active() then
    raise exception using errcode = '42501', message = 'active confirmed account required';
  end if;
  if p_quote_id is null or p_scheduled_date is null or p_scheduled_time is null then
    raise exception using errcode = '22023', message = 'quote and complete final schedule are required';
  end if;

  authoritative_scheduled_at := (p_scheduled_date + p_scheduled_time) at time zone 'America/La_Paz';
  if authoritative_scheduled_at <= now() then
    raise exception using errcode = '22023', message = 'scheduled_at must be in the future';
  end if;

  select quote.service_request_id
  into target_request_id
  from public.quotes as quote
  where quote.id = p_quote_id;

  if target_request_id is null then
    raise exception using errcode = '22023', message = 'quote is not available';
  end if;

  select
    request.customer_profile_id,
    request.worker_id,
    request.status,
    request.expires_at,
    worker.profile_id,
    worker.approval_status,
    profile.account_status,
    service.title
  into
    request_customer_id,
    request_worker_id,
    current_request_status,
    request_expires_at,
    worker_owner_id,
    worker_status,
    worker_account_status,
    service_title
  from public.service_requests as request
  join public.worker_profiles as worker on worker.id = request.worker_id
  join public.profiles as profile on profile.id = worker.profile_id
  join public.worker_services as service on service.id = request.worker_service_id
  where request.id = target_request_id
  for update of request;

  if request_customer_id <> caller_id then
    raise exception using errcode = '42501', message = 'request customer ownership required';
  end if;
  if current_request_status <> 'quoted'
     or (request_expires_at is not null and request_expires_at <= now()) then
    raise exception using errcode = '55000', message = 'service request is not accepting quotes';
  end if;
  if worker_status <> 'approved' or worker_account_status <> 'active' then
    raise exception using errcode = '55000', message = 'target worker is not eligible for acceptance';
  end if;

  select
    quote.service_request_id,
    quote.revision_number,
    quote.amount_bob,
    quote.status,
    quote.valid_until
  into
    quote_request_id,
    quote_revision,
    quote_amount,
    current_quote_status,
    quote_valid_until
  from public.quotes as quote
  where quote.id = p_quote_id
  for update;

  select max(quote.revision_number)
  into latest_revision
  from public.quotes as quote
  where quote.service_request_id = target_request_id;

  if quote_request_id <> target_request_id
     or current_quote_status <> 'pending'
     or quote_revision <> latest_revision
     or (quote_valid_until is not null and quote_valid_until <= now()) then
    raise exception using errcode = '55000', message = 'quote is not current and acceptable';
  end if;

  update public.quotes
  set status = 'accepted'
  where id = p_quote_id and status = 'pending';

  update public.service_requests
  set status = 'accepted'
  where id = target_request_id and status = 'quoted';

  insert into public.bookings (
    service_request_id,
    accepted_quote_id,
    customer_profile_id,
    worker_id,
    service_title_snapshot,
    agreed_price_bob,
    scheduled_at,
    status
  ) values (
    target_request_id,
    p_quote_id,
    request_customer_id,
    request_worker_id,
    service_title,
    quote_amount,
    authoritative_scheduled_at,
    'scheduled'
  )
  returning id into created_booking_id;

  insert into public.booking_status_history (
    booking_id,
    previous_status,
    new_status,
    changed_by_profile_id
  ) values (
    created_booking_id,
    null,
    'scheduled',
    caller_id
  );

  insert into public.notifications (
    profile_id,
    type,
    title,
    body,
    related_entity_type,
    related_entity_id
  ) values
    (
      worker_owner_id,
      'quote_accepted',
      'Cotización aceptada',
      'El cliente aceptó tu cotización y se creó la contratación.',
      'booking',
      created_booking_id
    ),
    (
      request_customer_id,
      'booking_created',
      'Contratación programada',
      'Tu cotización aceptada quedó programada.',
      'booking',
      created_booking_id
    );

  return query
  select
    p_quote_id,
    created_booking_id,
    'accepted'::text,
    'scheduled'::text,
    authoritative_scheduled_at;
end;
$$;

revoke all on function private.validate_booking_insert() from public, anon, authenticated;
revoke all on function public.create_service_request_quote(uuid, numeric, text, date, time)
  from public, anon;
revoke all on function public.list_my_service_request_quotes(uuid)
  from public, anon;
revoke all on function public.accept_service_request_quote(uuid, date, time)
  from public, anon;
grant execute on function public.create_service_request_quote(uuid, numeric, text, date, time)
  to authenticated;
grant execute on function public.list_my_service_request_quotes(uuid)
  to authenticated;
grant execute on function public.accept_service_request_quote(uuid, date, time)
  to authenticated;

alter table public.quotes enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_status_history enable row level security;

revoke all on table public.quotes from public, anon, authenticated;
revoke all on table public.bookings from public, anon, authenticated;
revoke all on table public.booking_status_history from public, anon, authenticated;

create policy quotes_select_participants
on public.quotes for select to authenticated
using (
  private.is_current_user_active()
  and exists (
    select 1
    from public.service_requests as request
    join public.worker_profiles as worker on worker.id = request.worker_id
    where request.id = quotes.service_request_id
      and (
        request.customer_profile_id = (select auth.uid())
        or worker.profile_id = (select auth.uid())
      )
  )
);

create policy bookings_select_participants
on public.bookings for select to authenticated
using (
  private.is_current_user_active()
  and (
    customer_profile_id = (select auth.uid())
    or exists (
      select 1 from public.worker_profiles as worker
      where worker.id = bookings.worker_id
        and worker.profile_id = (select auth.uid())
    )
  )
);

create policy booking_status_history_select_participants
on public.booking_status_history for select to authenticated
using (
  private.is_current_user_active()
  and exists (
    select 1
    from public.bookings as booking
    join public.worker_profiles as worker on worker.id = booking.worker_id
    where booking.id = booking_status_history.booking_id
      and (
        booking.customer_profile_id = (select auth.uid())
        or worker.profile_id = (select auth.uid())
      )
  )
);

drop policy service_request_locations_select_customer on public.service_request_locations;
create policy service_request_locations_select_customer
on public.service_request_locations for select to authenticated
using (
  private.is_current_user_active()
  and exists (
    select 1
    from public.service_requests as request
    join public.worker_profiles as worker on worker.id = request.worker_id
    left join public.bookings as booking on booking.service_request_id = request.id
    where request.id = service_request_locations.service_request_id
      and (
        request.customer_profile_id = (select auth.uid())
        or (worker.profile_id = (select auth.uid()) and booking.id is not null)
      )
  )
);

comment on function public.create_service_request_quote(uuid, numeric, text, date, time) is
  'MOD-07 controlled quote/revision creation. Derives the target worker from auth.uid(), locks the request, supersedes the prior pending revision and assigns the next revision number atomically.';
comment on function public.list_my_service_request_quotes(uuid) is
  'MOD-07 participant-only quote history in deterministic revision order, with minimal accepted-booking handoff data.';
comment on function public.accept_service_request_quote(uuid, date, time) is
  'MOD-07 atomic acceptance. Derives the customer from auth.uid(), validates the current quote, constructs scheduled_at in America/La_Paz and creates the accepted request, booking, first history row and participant notifications.';
