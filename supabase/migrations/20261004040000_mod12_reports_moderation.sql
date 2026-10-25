-- MOD-12 — Reportes de usuarios y moderación administrativa

create table public.user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_profile_id uuid not null references public.profiles (id),
  reported_profile_id uuid not null references public.profiles (id),
  booking_id uuid references public.bookings (id),
  reason text not null check (reason in (
    'misleading_profile', 'inappropriate_behavior', 'harassment',
    'fraud_or_scam', 'unsafe_behavior', 'service_issue', 'other'
  )),
  description text not null,
  status text not null default 'open'
    check (status in ('open', 'under_review', 'resolved', 'dismissed')),
  reviewed_by_profile_id uuid references public.profiles (id),
  reviewed_at timestamptz,
  resolution_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_reports_distinct_profiles check (reporter_profile_id <> reported_profile_id),
  constraint user_reports_description_valid check (
    description = regexp_replace(btrim(description), '[[:space:]]+', ' ', 'g')
    and char_length(description) between 20 and 2000
  ),
  constraint user_reports_review_state_valid check (
    (status = 'open' and reviewed_by_profile_id is null and reviewed_at is null and resolution_notes is null)
    or (status = 'under_review' and reviewed_by_profile_id is not null and reviewed_at is not null and resolution_notes is null)
    or (status in ('resolved', 'dismissed')
      and reviewed_by_profile_id is not null
      and reviewed_at is not null
      and resolution_notes is not null
      and resolution_notes = regexp_replace(btrim(resolution_notes), '[[:space:]]+', ' ', 'g')
      and char_length(resolution_notes) between 10 and 1000)
  ),
  constraint user_reports_context_reason_unique
    unique nulls not distinct (reporter_profile_id, reported_profile_id, booking_id, reason)
);

create index user_reports_reporter_created_id_idx
  on public.user_reports (reporter_profile_id, created_at desc, id desc);
create index user_reports_status_created_id_idx
  on public.user_reports (status, created_at desc, id desc);
create index user_reports_booking_idx on public.user_reports (booking_id)
  where booking_id is not null;

create trigger user_reports_set_updated_at
  before update on public.user_reports
  for each row execute function private.set_updated_at();

alter table public.user_reports enable row level security;
revoke all on table public.user_reports from public, anon, authenticated;

create or replace function private.is_publicly_eligible_worker(p_worker_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.worker_profiles as worker
    join public.profiles as profile on profile.id = worker.profile_id
    join public.worker_locations as location on location.worker_id = worker.id
    where worker.id = p_worker_id
      and worker.approval_status = 'approved'
      and profile.account_status = 'active'
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

revoke all on function private.is_publicly_eligible_worker(uuid) from public, anon, authenticated;

create or replace function public.create_profile_report(
  p_worker_id uuid,
  p_reason text,
  p_description text
)
returns table (report_id uuid, report_status text, report_created_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  target_profile_id uuid;
  normalized_description text := regexp_replace(btrim(coalesce(p_description, '')), '[[:space:]]+', ' ', 'g');
begin
  if caller_id is null or not private.is_current_user_active() then
    raise exception using errcode = '42501', message = 'active confirmed account required';
  end if;
  if p_reason not in ('misleading_profile', 'inappropriate_behavior', 'other') then
    raise exception using errcode = '22023', message = 'invalid profile report reason';
  end if;
  if char_length(normalized_description) not between 20 and 2000 then
    raise exception using errcode = '22023', message = 'report description must contain between 20 and 2000 characters';
  end if;

  select worker.profile_id into target_profile_id
  from public.worker_profiles as worker
  where worker.id = p_worker_id
    and private.is_publicly_eligible_worker(worker.id);
  if target_profile_id is null then
    raise exception using errcode = 'P0002', message = 'public worker not available';
  end if;
  if target_profile_id = caller_id then
    raise exception using errcode = '22023', message = 'self reporting is not allowed';
  end if;

  return query
  insert into public.user_reports (
    reporter_profile_id, reported_profile_id, booking_id, reason, description
  ) values (
    caller_id, target_profile_id, null, p_reason, normalized_description
  )
  returning id, status, created_at;
exception
  when unique_violation then
    raise exception using errcode = '23505', message = 'duplicate report';
end;
$$;

create or replace function public.create_booking_report(
  p_booking_id uuid,
  p_reason text,
  p_description text
)
returns table (report_id uuid, report_status text, report_created_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  target_profile_id uuid;
  normalized_description text := regexp_replace(btrim(coalesce(p_description, '')), '[[:space:]]+', ' ', 'g');
  booking_customer_id uuid;
  booking_worker_profile_id uuid;
begin
  if caller_id is null or not private.is_current_user_active() then
    raise exception using errcode = '42501', message = 'active confirmed account required';
  end if;
  if p_reason not in (
    'misleading_profile', 'inappropriate_behavior', 'harassment',
    'fraud_or_scam', 'unsafe_behavior', 'service_issue', 'other'
  ) then
    raise exception using errcode = '22023', message = 'invalid booking report reason';
  end if;
  if char_length(normalized_description) not between 20 and 2000 then
    raise exception using errcode = '22023', message = 'report description must contain between 20 and 2000 characters';
  end if;

  select booking.customer_profile_id, worker.profile_id
    into booking_customer_id, booking_worker_profile_id
  from public.bookings as booking
  join public.worker_profiles as worker on worker.id = booking.worker_id
  where booking.id = p_booking_id;
  if booking_customer_id is null then
    raise exception using errcode = 'P0002', message = 'booking not found';
  end if;
  if caller_id = booking_customer_id then
    target_profile_id := booking_worker_profile_id;
  elsif caller_id = booking_worker_profile_id then
    target_profile_id := booking_customer_id;
  else
    raise exception using errcode = '42501', message = 'booking participant required';
  end if;
  if target_profile_id = caller_id then
    raise exception using errcode = '22023', message = 'self reporting is not allowed';
  end if;

  return query
  insert into public.user_reports (
    reporter_profile_id, reported_profile_id, booking_id, reason, description
  ) values (
    caller_id, target_profile_id, p_booking_id, p_reason, normalized_description
  )
  returning id, status, created_at;
exception
  when unique_violation then
    raise exception using errcode = '23505', message = 'duplicate report';
end;
$$;

create or replace function public.list_my_user_reports(
  p_before_created_at timestamptz default null,
  p_before_report_id uuid default null,
  p_limit integer default 20
)
returns table (
  report_id uuid,
  context_type text,
  reported_display_name text,
  reported_context_available boolean,
  booking_id uuid,
  reason text,
  description text,
  status text,
  created_at timestamptz,
  reviewed_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare caller_id uuid := (select auth.uid());
begin
  if caller_id is null or not private.is_current_user_active() then
    raise exception using errcode = '42501', message = 'active confirmed account required';
  end if;
  if (p_before_created_at is null) <> (p_before_report_id is null) then
    raise exception using errcode = '22023', message = 'complete report cursor required';
  end if;
  if p_limit is null or p_limit not between 1 and 50 then
    raise exception using errcode = '22023', message = 'report page size must be between 1 and 50';
  end if;

  return query
  select
    report.id,
    case when report.booking_id is null then 'profile' else 'booking' end,
    case
      when report.booking_id is not null or private.is_publicly_eligible_worker(target_worker.id)
      then concat_ws(' ', btrim(target.first_name), left(btrim(target.last_name), 1) || '.')
      else null
    end,
    report.booking_id is not null or private.is_publicly_eligible_worker(target_worker.id),
    report.booking_id,
    report.reason,
    report.description,
    report.status,
    report.created_at,
    report.reviewed_at
  from public.user_reports as report
  join public.profiles as target on target.id = report.reported_profile_id
  left join public.worker_profiles as target_worker on target_worker.profile_id = target.id
  where report.reporter_profile_id = caller_id
    and (p_before_created_at is null or (report.created_at, report.id) < (p_before_created_at, p_before_report_id))
  order by report.created_at desc, report.id desc
  limit p_limit;
end;
$$;

create or replace function public.get_my_user_report(p_report_id uuid)
returns table (
  report_id uuid,
  context_type text,
  reported_display_name text,
  reported_context_available boolean,
  booking_id uuid,
  reason text,
  description text,
  status text,
  created_at timestamptz,
  reviewed_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare caller_id uuid := (select auth.uid());
begin
  if caller_id is null or not private.is_current_user_active() then
    raise exception using errcode = '42501', message = 'active confirmed account required';
  end if;
  return query
  select
    report.id,
    case when report.booking_id is null then 'profile' else 'booking' end,
    case
      when report.booking_id is not null or private.is_publicly_eligible_worker(target_worker.id)
      then concat_ws(' ', btrim(target.first_name), left(btrim(target.last_name), 1) || '.')
      else null
    end,
    report.booking_id is not null or private.is_publicly_eligible_worker(target_worker.id),
    report.booking_id,
    report.reason,
    report.description,
    report.status,
    report.created_at,
    report.reviewed_at
  from public.user_reports as report
  join public.profiles as target on target.id = report.reported_profile_id
  left join public.worker_profiles as target_worker on target_worker.profile_id = target.id
  where report.id = p_report_id
    and report.reporter_profile_id = caller_id;
end;
$$;

create or replace function public.list_admin_user_reports(
  p_status text default null,
  p_before_created_at timestamptz default null,
  p_before_report_id uuid default null,
  p_limit integer default 30
)
returns table (
  report_id uuid,
  reporter_profile_id uuid,
  reporter_display_name text,
  reported_profile_id uuid,
  reported_display_name text,
  booking_id uuid,
  booking_service_title text,
  booking_status text,
  reason text,
  description text,
  status text,
  reviewed_by_profile_id uuid,
  reviewed_at timestamptz,
  resolution_notes text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_current_user_admin() then
    raise exception using errcode = '42501', message = 'administrator access required';
  end if;
  if p_status is not null and p_status not in ('open', 'under_review', 'resolved', 'dismissed') then
    raise exception using errcode = '22023', message = 'invalid report status';
  end if;
  if (p_before_created_at is null) <> (p_before_report_id is null) then
    raise exception using errcode = '22023', message = 'complete report cursor required';
  end if;
  if p_limit is null or p_limit not between 1 and 50 then
    raise exception using errcode = '22023', message = 'report page size must be between 1 and 50';
  end if;

  return query
  select
    report.id,
    report.reporter_profile_id,
    concat_ws(' ', reporter.first_name, reporter.last_name),
    report.reported_profile_id,
    concat_ws(' ', target.first_name, target.last_name),
    report.booking_id,
    booking.service_title_snapshot,
    booking.status,
    report.reason,
    report.description,
    report.status,
    report.reviewed_by_profile_id,
    report.reviewed_at,
    report.resolution_notes,
    report.created_at,
    report.updated_at
  from public.user_reports as report
  join public.profiles as reporter on reporter.id = report.reporter_profile_id
  join public.profiles as target on target.id = report.reported_profile_id
  left join public.bookings as booking on booking.id = report.booking_id
  where (p_status is null or report.status = p_status)
    and (p_before_created_at is null or (report.created_at, report.id) < (p_before_created_at, p_before_report_id))
  order by report.created_at desc, report.id desc
  limit p_limit;
end;
$$;

create or replace function public.get_admin_user_report(p_report_id uuid)
returns table (
  report_id uuid,
  reporter_profile_id uuid,
  reporter_display_name text,
  reported_profile_id uuid,
  reported_display_name text,
  booking_id uuid,
  booking_service_title text,
  booking_status text,
  reason text,
  description text,
  status text,
  reviewed_by_profile_id uuid,
  reviewed_at timestamptz,
  resolution_notes text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_current_user_admin() then
    raise exception using errcode = '42501', message = 'administrator access required';
  end if;
  return query
  select
    report.id, report.reporter_profile_id, concat_ws(' ', reporter.first_name, reporter.last_name),
    report.reported_profile_id, concat_ws(' ', target.first_name, target.last_name),
    report.booking_id, booking.service_title_snapshot, booking.status,
    report.reason, report.description, report.status, report.reviewed_by_profile_id,
    report.reviewed_at, report.resolution_notes, report.created_at, report.updated_at
  from public.user_reports as report
  join public.profiles as reporter on reporter.id = report.reporter_profile_id
  join public.profiles as target on target.id = report.reported_profile_id
  left join public.bookings as booking on booking.id = report.booking_id
  where report.id = p_report_id;
end;
$$;

create or replace function public.transition_user_report(
  p_report_id uuid,
  p_status text,
  p_resolution_notes text default null
)
returns table (report_id uuid, report_status text, report_reviewed_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  administrator_id uuid := (select auth.uid());
  previous_status text;
  normalized_notes text := nullif(regexp_replace(btrim(coalesce(p_resolution_notes, '')), '[[:space:]]+', ' ', 'g'), '');
  transition_time timestamptz := clock_timestamp();
begin
  if administrator_id is null or not private.is_current_user_admin() then
    raise exception using errcode = '42501', message = 'administrator access required';
  end if;
  if p_status not in ('under_review', 'resolved', 'dismissed') then
    raise exception using errcode = '22023', message = 'invalid moderation status';
  end if;
  if p_status = 'under_review' and normalized_notes is not null then
    raise exception using errcode = '22023', message = 'under review does not accept resolution notes';
  end if;
  if p_status in ('resolved', 'dismissed')
    and (normalized_notes is null or char_length(normalized_notes) not between 10 and 1000) then
    raise exception using errcode = '22023', message = 'resolution notes must contain between 10 and 1000 characters';
  end if;

  select report.status into previous_status
  from public.user_reports as report
  where report.id = p_report_id
  for update;
  if previous_status is null then
    raise exception using errcode = 'P0002', message = 'report not found';
  end if;
  if not (
    (previous_status = 'open' and p_status in ('under_review', 'resolved', 'dismissed'))
    or (previous_status = 'under_review' and p_status in ('resolved', 'dismissed'))
  ) then
    raise exception using errcode = '55000', message = 'report transition is stale or not allowed';
  end if;

  update public.user_reports as report
  set status = p_status,
      reviewed_by_profile_id = administrator_id,
      reviewed_at = transition_time,
      resolution_notes = case when p_status = 'under_review' then null else normalized_notes end
  where report.id = p_report_id;

  insert into public.audit_logs (actor_profile_id, action, entity_type, entity_id, metadata, created_at)
  values (
    administrator_id,
    'user_report.' || p_status,
    'user_report',
    p_report_id,
    jsonb_build_object(
      'previous_status', previous_status,
      'resulting_status', p_status,
      'server_timestamp', transition_time
    ),
    transition_time
  );

  return query select p_report_id, p_status, transition_time;
end;
$$;

revoke all on function public.create_profile_report(uuid, text, text) from public, anon;
revoke all on function public.create_booking_report(uuid, text, text) from public, anon;
revoke all on function public.list_my_user_reports(timestamptz, uuid, integer) from public, anon;
revoke all on function public.get_my_user_report(uuid) from public, anon;
revoke all on function public.list_admin_user_reports(text, timestamptz, uuid, integer) from public, anon;
revoke all on function public.get_admin_user_report(uuid) from public, anon;
revoke all on function public.transition_user_report(uuid, text, text) from public, anon;

grant execute on function public.create_profile_report(uuid, text, text) to authenticated;
grant execute on function public.create_booking_report(uuid, text, text) to authenticated;
grant execute on function public.list_my_user_reports(timestamptz, uuid, integer) to authenticated;
grant execute on function public.get_my_user_report(uuid) to authenticated;
grant execute on function public.list_admin_user_reports(text, timestamptz, uuid, integer) to authenticated;
grant execute on function public.get_admin_user_report(uuid) to authenticated;
grant execute on function public.transition_user_report(uuid, text, text) to authenticated;

comment on table public.user_reports is
  'Frozen MOD-12 private user report entity. Reports are immutable for reporters and never apply automatic sanctions.';
comment on function public.transition_user_report(uuid, text, text) is
  'Admin-only atomic locked moderation transition with append-only audit event and no automatic consequence.';
