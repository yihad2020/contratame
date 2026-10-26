-- MOD-13 — Certificación de trabajadores

create table public.certification_memberships (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.worker_profiles (id),
  status text not null default 'pending_payment'
    constraint certification_memberships_status_check
    check (status in ('pending_payment', 'active', 'expired', 'cancelled')),
  price_bob numeric(12, 2) not null default 50.00
    constraint certification_memberships_price_check check (price_bob > 0),
  starts_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint certification_memberships_dates_check check (
    (status in ('pending_payment', 'cancelled') and starts_at is null and expires_at is null)
    or (status in ('active', 'expired') and starts_at is not null and expires_at is not null and expires_at > starts_at)
  )
);

create unique index certification_memberships_one_pending_idx
  on public.certification_memberships (worker_id)
  where status = 'pending_payment';

create unique index certification_memberships_one_active_idx
  on public.certification_memberships (worker_id)
  where status = 'active';

create index certification_memberships_worker_created_idx
  on public.certification_memberships (worker_id, created_at desc, id desc);

create index certification_memberships_status_created_idx
  on public.certification_memberships (status, created_at desc, id desc);

create index certification_memberships_active_validity_idx
  on public.certification_memberships (worker_id, starts_at, expires_at)
  where status = 'active';

create trigger certification_memberships_set_updated_at
  before update on public.certification_memberships
  for each row execute function private.set_updated_at();

alter table public.certification_memberships enable row level security;
revoke all on table public.certification_memberships from public, anon, authenticated;

create or replace function public.get_my_worker_certification_state()
returns table (
  worker_id uuid,
  worker_approval_status text,
  certification_id uuid,
  membership_status text,
  display_state text,
  price_bob numeric,
  starts_at timestamptz,
  expires_at timestamptz,
  can_request boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  worker_row public.worker_profiles%rowtype;
  membership_row public.certification_memberships%rowtype;
  derived_state text;
  request_allowed boolean := false;
begin
  if caller_id is null or not private.is_current_user_active() then
    raise exception using errcode = '42501', message = 'active confirmed account required';
  end if;

  select worker.* into worker_row
  from public.worker_profiles as worker
  where worker.profile_id = caller_id;

  if worker_row.id is null then
    return query select
      null::uuid, null::text, null::uuid, null::text, 'not_eligible'::text,
      50.00::numeric, null::timestamptz, null::timestamptz, false;
    return;
  end if;

  select membership.* into membership_row
  from public.certification_memberships as membership
  where membership.worker_id = worker_row.id
  order by membership.created_at desc, membership.id desc
  limit 1;

  if worker_row.approval_status <> 'approved' then
    derived_state := 'not_eligible';
  elsif membership_row.id is null then
    derived_state := 'eligible';
    request_allowed := true;
  elsif membership_row.status = 'pending_payment' then
    derived_state := 'pending';
  elsif membership_row.status = 'active'
    and membership_row.starts_at <= now()
    and membership_row.expires_at > now() then
    derived_state := 'active';
  elsif membership_row.status in ('active', 'expired') then
    derived_state := 'expired';
    request_allowed := true;
  else
    derived_state := 'rejected';
    request_allowed := true;
  end if;

  return query select
    worker_row.id,
    worker_row.approval_status,
    membership_row.id,
    membership_row.status,
    derived_state,
    coalesce(membership_row.price_bob, 50.00::numeric),
    membership_row.starts_at,
    membership_row.expires_at,
    request_allowed;
end;
$$;

create or replace function public.request_worker_certification()
returns table (
  membership_id uuid,
  membership_status text,
  price_bob numeric,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  worker_row public.worker_profiles%rowtype;
  created_membership public.certification_memberships%rowtype;
begin
  if caller_id is null or not private.is_current_user_active() then
    raise exception using errcode = '42501', message = 'active confirmed account required';
  end if;

  select worker.* into worker_row
  from public.worker_profiles as worker
  where worker.profile_id = caller_id
  for update;

  if worker_row.id is null or worker_row.approval_status <> 'approved' then
    raise exception using errcode = '55000', message = 'approved worker required';
  end if;

  update public.certification_memberships as membership
  set status = 'expired'
  where membership.worker_id = worker_row.id
    and membership.status = 'active'
    and membership.expires_at <= now();

  if exists (
    select 1 from public.certification_memberships as membership
    where membership.worker_id = worker_row.id
      and membership.status = 'pending_payment'
  ) then
    raise exception using errcode = '23505', message = 'certification request already pending';
  end if;

  if exists (
    select 1 from public.certification_memberships as membership
    where membership.worker_id = worker_row.id
      and membership.status = 'active'
      and membership.starts_at <= now()
      and membership.expires_at > now()
  ) then
    raise exception using errcode = '23505', message = 'certification already active';
  end if;

  insert into public.certification_memberships (worker_id, status, price_bob)
  values (worker_row.id, 'pending_payment', 50.00)
  returning * into created_membership;

  return query select
    created_membership.id,
    created_membership.status,
    created_membership.price_bob,
    created_membership.created_at;
end;
$$;

create or replace function public.get_public_worker_certifications(p_worker_ids uuid[])
returns table (
  worker_id uuid,
  is_verified boolean,
  certification_expires_at timestamptz
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
  if coalesce(array_length(p_worker_ids, 1), 0) not between 1 and 50
    or array_position(p_worker_ids, null) is not null then
    raise exception using errcode = '22023', message = 'between 1 and 50 worker ids are required';
  end if;

  return query
  select
    requested.id,
    active_membership.id is not null,
    active_membership.expires_at
  from (select distinct unnest(p_worker_ids) as id) as requested
  left join lateral (
    select membership.id, membership.expires_at
    from public.certification_memberships as membership
    where membership.worker_id = requested.id
      and membership.status = 'active'
      and membership.starts_at <= now()
      and membership.expires_at > now()
    order by membership.starts_at desc, membership.id desc
    limit 1
  ) as active_membership on true
  where private.is_publicly_eligible_worker(requested.id)
  order by requested.id;
end;
$$;

create or replace function public.list_admin_certification_requests(
  p_status text default null,
  p_before_created_at timestamptz default null,
  p_before_membership_id uuid default null,
  p_limit integer default 30
)
returns table (
  membership_id uuid,
  worker_id uuid,
  owner_profile_id uuid,
  worker_display_name text,
  worker_approval_status text,
  account_status text,
  certification_status text,
  price_bob numeric,
  starts_at timestamptz,
  expires_at timestamptz,
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
  if p_status is not null and p_status not in ('pending_payment', 'active', 'expired', 'cancelled') then
    raise exception using errcode = '22023', message = 'invalid certification status';
  end if;
  if (p_before_created_at is null) <> (p_before_membership_id is null) then
    raise exception using errcode = '22023', message = 'complete certification cursor required';
  end if;
  if p_limit is null or p_limit not between 1 and 50 then
    raise exception using errcode = '22023', message = 'certification page size must be between 1 and 50';
  end if;

  return query
  with candidates as (
    select
      membership.*,
      case when membership.status = 'active' and membership.expires_at <= now()
        then 'expired'::text else membership.status end as effective_status
    from public.certification_memberships as membership
  )
  select
    candidate.id,
    worker.id,
    profile.id,
    concat_ws(' ', btrim(profile.first_name), btrim(profile.last_name)),
    worker.approval_status,
    profile.account_status,
    candidate.effective_status,
    candidate.price_bob,
    candidate.starts_at,
    candidate.expires_at,
    candidate.created_at,
    candidate.updated_at
  from candidates as candidate
  join public.worker_profiles as worker on worker.id = candidate.worker_id
  join public.profiles as profile on profile.id = worker.profile_id
  where (p_status is null or candidate.effective_status = p_status)
    and (p_before_created_at is null
      or (candidate.created_at, candidate.id) < (p_before_created_at, p_before_membership_id))
  order by candidate.created_at desc, candidate.id desc
  limit p_limit;
end;
$$;

create or replace function public.get_admin_certification_request(p_membership_id uuid)
returns table (
  membership_id uuid,
  worker_id uuid,
  owner_profile_id uuid,
  worker_display_name text,
  worker_approval_status text,
  account_status text,
  certification_status text,
  price_bob numeric,
  starts_at timestamptz,
  expires_at timestamptz,
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
    membership.id,
    worker.id,
    profile.id,
    concat_ws(' ', btrim(profile.first_name), btrim(profile.last_name)),
    worker.approval_status,
    profile.account_status,
    case when membership.status = 'active' and membership.expires_at <= now()
      then 'expired'::text else membership.status end,
    membership.price_bob,
    membership.starts_at,
    membership.expires_at,
    membership.created_at,
    membership.updated_at
  from public.certification_memberships as membership
  join public.worker_profiles as worker on worker.id = membership.worker_id
  join public.profiles as profile on profile.id = worker.profile_id
  where membership.id = p_membership_id;
end;
$$;

create or replace function public.approve_certification_request(p_membership_id uuid)
returns table (
  membership_id uuid,
  membership_status text,
  starts_at timestamptz,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  administrator_id uuid := (select auth.uid());
  membership_row public.certification_memberships%rowtype;
  worker_eligible boolean;
  transition_time timestamptz := now();
  expiration_time timestamptz;
begin
  if administrator_id is null or not private.is_current_user_admin() then
    raise exception using errcode = '42501', message = 'administrator access required';
  end if;

  select membership.* into membership_row
  from public.certification_memberships as membership
  where membership.id = p_membership_id
  for update;

  if membership_row.id is null then
    raise exception using errcode = 'P0002', message = 'certification request not found';
  end if;
  if membership_row.status <> 'pending_payment' then
    raise exception using errcode = '55000', message = 'certification request was already reviewed';
  end if;

  select exists (
    select 1
    from public.worker_profiles as worker
    join public.profiles as profile on profile.id = worker.profile_id
    join auth.users as auth_user on auth_user.id = profile.id
    where worker.id = membership_row.worker_id
      and worker.approval_status = 'approved'
      and profile.account_status = 'active'
      and auth_user.email_confirmed_at is not null
  ) into worker_eligible;

  if not worker_eligible then
    raise exception using errcode = '55000', message = 'worker is no longer eligible for certification';
  end if;

  update public.certification_memberships as membership
  set status = 'expired'
  where membership.worker_id = membership_row.worker_id
    and membership.id <> membership_row.id
    and membership.status = 'active'
    and membership.expires_at <= transition_time;

  if exists (
    select 1 from public.certification_memberships as membership
    where membership.worker_id = membership_row.worker_id
      and membership.id <> membership_row.id
      and membership.status = 'active'
      and membership.starts_at <= transition_time
      and membership.expires_at > transition_time
  ) then
    raise exception using errcode = '23505', message = 'certification already active';
  end if;

  expiration_time := transition_time + interval '12 months';

  update public.certification_memberships as membership
  set status = 'active', starts_at = transition_time, expires_at = expiration_time
  where membership.id = membership_row.id and membership.status = 'pending_payment';

  if not found then
    raise exception using errcode = '55000', message = 'certification request transition is stale';
  end if;

  insert into public.audit_logs (
    actor_profile_id, action, entity_type, entity_id, metadata, created_at
  ) values (
    administrator_id,
    'certification.approved',
    'certification_membership',
    membership_row.id,
    jsonb_build_object(
      'worker_id', membership_row.worker_id,
      'previous_status', membership_row.status,
      'resulting_status', 'active',
      'starts_at', transition_time,
      'expires_at', expiration_time,
      'server_timestamp', transition_time
    ),
    transition_time
  );

  return query select membership_row.id, 'active'::text, transition_time, expiration_time;
end;
$$;

create or replace function public.reject_certification_request(p_membership_id uuid)
returns table (
  membership_id uuid,
  membership_status text,
  reviewed_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  administrator_id uuid := (select auth.uid());
  membership_row public.certification_memberships%rowtype;
  transition_time timestamptz := now();
begin
  if administrator_id is null or not private.is_current_user_admin() then
    raise exception using errcode = '42501', message = 'administrator access required';
  end if;

  select membership.* into membership_row
  from public.certification_memberships as membership
  where membership.id = p_membership_id
  for update;

  if membership_row.id is null then
    raise exception using errcode = 'P0002', message = 'certification request not found';
  end if;
  if membership_row.status <> 'pending_payment' then
    raise exception using errcode = '55000', message = 'certification request was already reviewed';
  end if;

  update public.certification_memberships as membership
  set status = 'cancelled'
  where membership.id = membership_row.id and membership.status = 'pending_payment';

  if not found then
    raise exception using errcode = '55000', message = 'certification request transition is stale';
  end if;

  insert into public.audit_logs (
    actor_profile_id, action, entity_type, entity_id, metadata, created_at
  ) values (
    administrator_id,
    'certification.rejected',
    'certification_membership',
    membership_row.id,
    jsonb_build_object(
      'worker_id', membership_row.worker_id,
      'previous_status', membership_row.status,
      'resulting_status', 'cancelled',
      'server_timestamp', transition_time
    ),
    transition_time
  );

  return query select membership_row.id, 'cancelled'::text, transition_time;
end;
$$;

revoke all on function public.get_my_worker_certification_state() from public, anon;
revoke all on function public.request_worker_certification() from public, anon;
revoke all on function public.get_public_worker_certifications(uuid[]) from public, anon;
revoke all on function public.list_admin_certification_requests(text, timestamptz, uuid, integer) from public, anon;
revoke all on function public.get_admin_certification_request(uuid) from public, anon;
revoke all on function public.approve_certification_request(uuid) from public, anon;
revoke all on function public.reject_certification_request(uuid) from public, anon;

grant execute on function public.get_my_worker_certification_state() to authenticated;
grant execute on function public.request_worker_certification() to authenticated;
grant execute on function public.get_public_worker_certifications(uuid[]) to authenticated;
grant execute on function public.list_admin_certification_requests(text, timestamptz, uuid, integer) to authenticated;
grant execute on function public.get_admin_certification_request(uuid) to authenticated;
grant execute on function public.approve_certification_request(uuid) to authenticated;
grant execute on function public.reject_certification_request(uuid) to authenticated;

comment on table public.certification_memberships is
  'Frozen certification membership entity. MOD-13 records the Bs 50 manual verification request and 12-month server-derived validity without electronic payment processing.';
comment on function public.request_worker_certification() is
  'Owner-only certification request for an approved active confirmed worker. Identity and fixed Bs 50 price are server-derived.';
comment on function public.get_public_worker_certifications(uuid[]) is
  'Bounded public-safe batch contract. Returns only currently eligible public workers and derives verification from an active unexpired membership.';
comment on function public.approve_certification_request(uuid) is
  'Admin-only atomic approval after external manual verification. Establishes server-derived 12-calendar-month validity and audit history.';
comment on function public.reject_certification_request(uuid) is
  'Admin-only atomic rejection represented by the frozen cancelled state with an append-only audit event.';
