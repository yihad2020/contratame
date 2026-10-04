-- MOD-11 — Centro de notificaciones

create index notifications_profile_created_id_idx
  on public.notifications (profile_id, created_at desc, id desc);

create index notifications_profile_unread_idx
  on public.notifications (profile_id, created_at desc, id desc)
  where read_at is null;

create or replace function public.list_my_notifications(
  p_before_created_at timestamptz default null,
  p_before_id uuid default null,
  p_limit integer default 20
)
returns table (
  notification_id uuid,
  notification_type text,
  title text,
  body text,
  related_entity_type text,
  related_entity_id uuid,
  navigation_target_type text,
  navigation_target_id uuid,
  read_at timestamptz,
  created_at timestamptz
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
  if (p_before_created_at is null) <> (p_before_id is null) then
    raise exception using errcode = '22023', message = 'complete notification cursor required';
  end if;
  if p_limit is null or p_limit not between 1 and 50 then
    raise exception using errcode = '22023', message = 'notification page size must be between 1 and 50';
  end if;

  return query
  select
    notification.id,
    notification.type,
    notification.title,
    notification.body,
    notification.related_entity_type,
    notification.related_entity_id,
    case notification.related_entity_type
      when 'service_request' then 'service_request'::text
      when 'booking' then 'booking'::text
      when 'conversation' then 'conversation'::text
      else null::text
    end,
    case when notification.related_entity_type in ('service_request', 'booking', 'conversation')
      then notification.related_entity_id else null::uuid end,
    notification.read_at,
    notification.created_at
  from public.notifications as notification
  where notification.profile_id = caller_id
    and (
      p_before_created_at is null
      or (notification.created_at, notification.id) < (p_before_created_at, p_before_id)
    )
  order by notification.created_at desc, notification.id desc
  limit p_limit;
end;
$$;

create or replace function public.list_my_notifications_after(
  p_after_created_at timestamptz,
  p_after_id uuid,
  p_limit integer default 50
)
returns table (
  notification_id uuid,
  notification_type text,
  title text,
  body text,
  related_entity_type text,
  related_entity_id uuid,
  navigation_target_type text,
  navigation_target_id uuid,
  read_at timestamptz,
  created_at timestamptz
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
  if p_after_created_at is null or p_after_id is null then
    raise exception using errcode = '22023', message = 'complete notification cursor required';
  end if;
  if p_limit is null or p_limit not between 1 and 100 then
    raise exception using errcode = '22023', message = 'notification sync size must be between 1 and 100';
  end if;

  return query
  select
    notification.id,
    notification.type,
    notification.title,
    notification.body,
    notification.related_entity_type,
    notification.related_entity_id,
    case notification.related_entity_type
      when 'service_request' then 'service_request'::text
      when 'booking' then 'booking'::text
      when 'conversation' then 'conversation'::text
      else null::text
    end,
    case when notification.related_entity_type in ('service_request', 'booking', 'conversation')
      then notification.related_entity_id else null::uuid end,
    notification.read_at,
    notification.created_at
  from public.notifications as notification
  where notification.profile_id = caller_id
    and (notification.created_at, notification.id) > (p_after_created_at, p_after_id)
  order by notification.created_at, notification.id
  limit p_limit;
end;
$$;

create or replace function public.get_my_notification_unread_count()
returns bigint
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  unread_count bigint;
begin
  if caller_id is null or not private.is_current_user_active() then
    raise exception using errcode = '42501', message = 'active confirmed account required';
  end if;

  select count(*) into unread_count
  from public.notifications as notification
  where notification.profile_id = caller_id
    and notification.read_at is null;

  return unread_count;
end;
$$;

create or replace function public.mark_my_notification_read(p_notification_id uuid)
returns table (
  notification_id uuid,
  read_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  current_read_at timestamptz;
begin
  if caller_id is null or not private.is_current_user_active() then
    raise exception using errcode = '42501', message = 'active confirmed account required';
  end if;
  if p_notification_id is null then
    raise exception using errcode = '22023', message = 'notification id is required';
  end if;

  select notification.read_at into current_read_at
  from public.notifications as notification
  where notification.id = p_notification_id
    and notification.profile_id = caller_id
  for update;

  if not found then
    raise exception using errcode = '42501', message = 'notification ownership required';
  end if;

  if current_read_at is null then
    update public.notifications as notification
    set read_at = now()
    where notification.id = p_notification_id
      and notification.profile_id = caller_id
      and notification.read_at is null
    returning notification.read_at into current_read_at;
  end if;

  return query select p_notification_id, current_read_at;
end;
$$;

revoke all on function public.list_my_notifications(timestamptz, uuid, integer)
  from public, anon;
revoke all on function public.list_my_notifications_after(timestamptz, uuid, integer)
  from public, anon;
revoke all on function public.get_my_notification_unread_count()
  from public, anon;
revoke all on function public.mark_my_notification_read(uuid)
  from public, anon;

grant execute on function public.list_my_notifications(timestamptz, uuid, integer)
  to authenticated;
grant execute on function public.list_my_notifications_after(timestamptz, uuid, integer)
  to authenticated;
grant execute on function public.get_my_notification_unread_count()
  to authenticated;
grant execute on function public.mark_my_notification_read(uuid)
  to authenticated;

-- SELECT is required by Postgres Changes. The existing owner-only policy from
-- MOD-06 remains the authorization boundary. Direct writes stay revoked.
grant select on table public.notifications to authenticated;

alter publication supabase_realtime add table public.notifications;

comment on function public.list_my_notifications(timestamptz, uuid, integer) is
  'MOD-11 owner-only newest-first keyset inbox. Returns the canonical notification allowlist and safe navigation hints without private transactional data.';
comment on function public.list_my_notifications_after(timestamptz, uuid, integer) is
  'MOD-11 owner-only forward keyset reconciliation for foreground Realtime reconnects.';
comment on function public.get_my_notification_unread_count() is
  'MOD-11 server-derived count of canonical unread notifications for the active confirmed recipient.';
comment on function public.mark_my_notification_read(uuid) is
  'MOD-11 idempotent recipient-only transition from unread to read using a PostgreSQL timestamp.';
