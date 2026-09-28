-- MOD-03 — Aprobación administrativa de trabajadores

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_profile_id uuid references public.profiles (id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_actor_created_idx
  on public.audit_logs (actor_profile_id, created_at desc);
create index audit_logs_entity_idx
  on public.audit_logs (entity_type, entity_id, created_at desc);

alter table public.audit_logs enable row level security;
revoke all on table public.audit_logs from anon, authenticated;

create policy profiles_select_admin
on public.profiles
for select
to authenticated
using (
  private.is_current_user_admin()
  and exists (
    select 1
    from public.worker_profiles worker
    join public.worker_approval_requests request on request.worker_id = worker.id
    where worker.profile_id = profiles.id
  )
);

-- The MOD-02 trigger continues to protect owner edits while allowing only the
-- controlled pending -> approved/rejected transition for an authenticated admin.
create or replace function private.validate_worker_profile_edit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null then
    if private.is_current_user_admin() then
      if new.id <> old.id or new.profile_id <> old.profile_id
         or new.created_at <> old.created_at
         or new.bio is distinct from old.bio
         or new.years_experience is distinct from old.years_experience
         or old.approval_status <> 'pending_approval'
         or new.approval_status not in ('approved', 'rejected') then
        raise exception using errcode = '42501', message = 'admin review may only decide a pending worker';
      end if;
    else
      if not private.owns_editable_worker(old.id) then
        raise exception using errcode = '42501', message = 'editable worker ownership required';
      end if;
      if new.id <> old.id or new.profile_id <> old.profile_id
         or new.created_at <> old.created_at then
        raise exception using errcode = '42501', message = 'worker identity is not client editable';
      end if;
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

revoke all on function private.validate_worker_profile_edit() from public, anon, authenticated;

create or replace function public.get_my_admin_access()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.is_current_user_admin(), false);
$$;

create or replace function public.approve_worker_submission(p_request_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  request_row public.worker_approval_requests;
  worker_row public.worker_profiles;
  latest_request_id uuid;
begin
  if caller_id is null or not private.is_current_user_admin() then
    raise exception using errcode = '42501', message = 'admin access required';
  end if;

  select * into request_row
  from public.worker_approval_requests
  where id = p_request_id
  for update;

  if request_row.id is null then
    raise exception using errcode = 'P0002', message = 'approval request not found';
  end if;
  if request_row.status <> 'pending' or request_row.reviewed_at is not null
     or request_row.reviewed_by_profile_id is not null then
    raise exception using errcode = '55000', message = 'approval request was already reviewed';
  end if;

  select * into worker_row
  from public.worker_profiles
  where id = request_row.worker_id
  for update;

  if worker_row.id is null or worker_row.approval_status <> 'pending_approval' then
    raise exception using errcode = '55000', message = 'worker is not pending approval';
  end if;

  select id into latest_request_id
  from public.worker_approval_requests
  where worker_id = request_row.worker_id
  order by submitted_at desc, created_at desc, id desc
  limit 1;

  if latest_request_id is distinct from request_row.id then
    raise exception using errcode = '55000', message = 'approval request is not the current submission';
  end if;

  update public.worker_approval_requests
  set status = 'approved',
      reviewed_at = now(),
      reviewed_by_profile_id = caller_id,
      rejection_reason = null
  where id = request_row.id;

  update public.worker_profiles
  set approval_status = 'approved', updated_at = now()
  where id = worker_row.id;

  insert into public.audit_logs (
    actor_profile_id, action, entity_type, entity_id, metadata
  ) values (
    caller_id,
    'worker_approval.approved',
    'worker_approval_request',
    request_row.id,
    jsonb_build_object('worker_id', worker_row.id, 'approval_request_id', request_row.id)
  );

  return request_row.id;
end;
$$;

create or replace function public.reject_worker_submission(
  p_request_id uuid,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  clean_reason text := btrim(coalesce(p_reason, ''));
  request_row public.worker_approval_requests;
  worker_row public.worker_profiles;
  latest_request_id uuid;
begin
  if caller_id is null or not private.is_current_user_admin() then
    raise exception using errcode = '42501', message = 'admin access required';
  end if;
  if char_length(clean_reason) not between 10 and 500 then
    raise exception using errcode = '22023', message = 'rejection reason must contain between 10 and 500 characters';
  end if;

  select * into request_row
  from public.worker_approval_requests
  where id = p_request_id
  for update;

  if request_row.id is null then
    raise exception using errcode = 'P0002', message = 'approval request not found';
  end if;
  if request_row.status <> 'pending' or request_row.reviewed_at is not null
     or request_row.reviewed_by_profile_id is not null then
    raise exception using errcode = '55000', message = 'approval request was already reviewed';
  end if;

  select * into worker_row
  from public.worker_profiles
  where id = request_row.worker_id
  for update;

  if worker_row.id is null or worker_row.approval_status <> 'pending_approval' then
    raise exception using errcode = '55000', message = 'worker is not pending approval';
  end if;

  select id into latest_request_id
  from public.worker_approval_requests
  where worker_id = request_row.worker_id
  order by submitted_at desc, created_at desc, id desc
  limit 1;

  if latest_request_id is distinct from request_row.id then
    raise exception using errcode = '55000', message = 'approval request is not the current submission';
  end if;

  update public.worker_approval_requests
  set status = 'rejected',
      reviewed_at = now(),
      reviewed_by_profile_id = caller_id,
      rejection_reason = clean_reason
  where id = request_row.id;

  update public.worker_profiles
  set approval_status = 'rejected', updated_at = now()
  where id = worker_row.id;

  insert into public.audit_logs (
    actor_profile_id, action, entity_type, entity_id, metadata
  ) values (
    caller_id,
    'worker_approval.rejected',
    'worker_approval_request',
    request_row.id,
    jsonb_build_object('worker_id', worker_row.id, 'approval_request_id', request_row.id)
  );

  return request_row.id;
end;
$$;

revoke all on function public.get_my_admin_access() from public, anon;
revoke all on function public.approve_worker_submission(uuid) from public, anon;
revoke all on function public.reject_worker_submission(uuid, text) from public, anon;
grant execute on function public.get_my_admin_access() to authenticated;
grant execute on function public.approve_worker_submission(uuid) to authenticated;
grant execute on function public.reject_worker_submission(uuid, text) to authenticated;

comment on table public.audit_logs is
  'Append-only privileged audit trail defined by the frozen logical schema. Clients have no direct access.';
comment on function public.get_my_admin_access() is
  'Returns whether the current confirmed active identity has the admin role.';
comment on function public.approve_worker_submission(uuid) is
  'MOD-03 atomic admin-only approval of the current pending immutable worker submission.';
comment on function public.reject_worker_submission(uuid, text) is
  'MOD-03 atomic admin-only rejection of the current pending immutable worker submission with a validated reason.';
