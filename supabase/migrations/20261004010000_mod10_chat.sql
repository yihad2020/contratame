-- MOD-10 — Chat / Mensajería en tiempo real

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id),
  sender_profile_id uuid references public.profiles (id),
  message_type text not null constraint messages_type_check
    check (message_type in ('text', 'system')),
  content text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint messages_user_text_length_check check (
    message_type <> 'text'
    or char_length(
      btrim(regexp_replace(content, '[[:space:]]+', ' ', 'g'))
    ) between 1 and 2000
  )
);

create index messages_conversation_created_id_idx
  on public.messages (conversation_id, created_at desc, id desc);

create or replace function private.is_conversation_participant(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_current_user_active() and exists (
    select 1
    from public.conversations as conversation
    join public.service_requests as request
      on request.id = conversation.service_request_id
    join public.worker_profiles as worker
      on worker.id = request.worker_id
    where conversation.id = p_conversation_id
      and (
        request.customer_profile_id = (select auth.uid())
        or worker.profile_id = (select auth.uid())
      )
  );
$$;

revoke all on function private.is_conversation_participant(uuid)
  from public, anon;
grant execute on function private.is_conversation_participant(uuid)
  to authenticated;

create or replace function public.get_my_conversation(p_conversation_id uuid)
returns table (
  conversation_id uuid,
  service_request_id uuid,
  conversation_status text,
  perspective text,
  customer_display_name text,
  worker_display_name text,
  service_title text,
  request_status text,
  created_at timestamptz,
  activity_at timestamptz
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
    conversation.id,
    request.id,
    conversation.status,
    case when request.customer_profile_id = caller_id
      then 'customer'::text else 'worker'::text end,
    concat_ws(' ', btrim(customer.first_name), btrim(customer.last_name)),
    concat_ws(' ', btrim(worker_profile.first_name), btrim(worker_profile.last_name)),
    service.title,
    request.status,
    conversation.created_at,
    coalesce(latest.created_at, conversation.created_at)
  from public.conversations as conversation
  join public.service_requests as request
    on request.id = conversation.service_request_id
  join public.profiles as customer
    on customer.id = request.customer_profile_id
  join public.worker_profiles as worker
    on worker.id = request.worker_id
  join public.profiles as worker_profile
    on worker_profile.id = worker.profile_id
  join public.worker_services as service
    on service.id = request.worker_service_id
  left join lateral (
    select message.created_at
    from public.messages as message
    where message.conversation_id = conversation.id
    order by message.created_at desc, message.id desc
    limit 1
  ) as latest on true
  where conversation.id = p_conversation_id
    and (
      request.customer_profile_id = caller_id
      or worker.profile_id = caller_id
    );
end;
$$;

create or replace function public.get_my_conversation_for_request(p_service_request_id uuid)
returns table (
  conversation_id uuid,
  service_request_id uuid,
  conversation_status text,
  perspective text,
  customer_display_name text,
  worker_display_name text,
  service_title text,
  request_status text,
  created_at timestamptz,
  activity_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  target_conversation_id uuid;
begin
  if (select auth.uid()) is null or not private.is_current_user_active() then
    raise exception using errcode = '42501', message = 'active confirmed account required';
  end if;

  select conversation.id into target_conversation_id
  from public.conversations as conversation
  where conversation.service_request_id = p_service_request_id;

  if target_conversation_id is null then
    return;
  end if;

  return query
  select * from public.get_my_conversation(target_conversation_id);
end;
$$;

create or replace function public.list_my_conversations(
  p_before_activity_at timestamptz default null,
  p_before_id uuid default null,
  p_limit integer default 12
)
returns table (
  conversation_id uuid,
  service_request_id uuid,
  conversation_status text,
  perspective text,
  counterpart_display_name text,
  service_title text,
  request_status text,
  latest_message_type text,
  latest_message_content text,
  latest_message_is_mine boolean,
  latest_message_at timestamptz,
  activity_at timestamptz
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
  if (p_before_activity_at is null) <> (p_before_id is null) then
    raise exception using errcode = '22023', message = 'complete conversation cursor required';
  end if;
  if p_limit is null or p_limit not between 1 and 20 then
    raise exception using errcode = '22023', message = 'conversation page size must be between 1 and 20';
  end if;

  return query
  with eligible as (
    select
      conversation.id as selected_conversation_id,
      request.id as selected_request_id,
      conversation.status as selected_conversation_status,
      case when request.customer_profile_id = caller_id
        then 'customer'::text else 'worker'::text end as selected_perspective,
      case when request.customer_profile_id = caller_id
        then concat_ws(' ', btrim(worker_profile.first_name), btrim(worker_profile.last_name))
        else concat_ws(' ', btrim(customer.first_name), btrim(customer.last_name))
      end as selected_counterpart,
      service.title as selected_service_title,
      request.status as selected_request_status,
      latest.message_type as selected_latest_type,
      latest.content as selected_latest_content,
      case when latest.id is null then null
        else latest.sender_profile_id = caller_id end as selected_latest_is_mine,
      latest.created_at as selected_latest_at,
      coalesce(latest.created_at, conversation.created_at) as selected_activity_at
    from public.conversations as conversation
    join public.service_requests as request
      on request.id = conversation.service_request_id
    join public.profiles as customer
      on customer.id = request.customer_profile_id
    join public.worker_profiles as worker
      on worker.id = request.worker_id
    join public.profiles as worker_profile
      on worker_profile.id = worker.profile_id
    join public.worker_services as service
      on service.id = request.worker_service_id
    left join lateral (
      select message.id, message.sender_profile_id, message.message_type,
        message.content, message.created_at
      from public.messages as message
      where message.conversation_id = conversation.id
      order by message.created_at desc, message.id desc
      limit 1
    ) as latest on true
    where request.customer_profile_id = caller_id
       or worker.profile_id = caller_id
  )
  select
    eligible.selected_conversation_id,
    eligible.selected_request_id,
    eligible.selected_conversation_status,
    eligible.selected_perspective,
    eligible.selected_counterpart,
    eligible.selected_service_title,
    eligible.selected_request_status,
    eligible.selected_latest_type,
    eligible.selected_latest_content,
    eligible.selected_latest_is_mine,
    eligible.selected_latest_at,
    eligible.selected_activity_at
  from eligible
  where p_before_activity_at is null
     or (eligible.selected_activity_at, eligible.selected_conversation_id)
        < (p_before_activity_at, p_before_id)
  order by eligible.selected_activity_at desc, eligible.selected_conversation_id desc
  limit p_limit;
end;
$$;

create or replace function public.list_conversation_messages(
  p_conversation_id uuid,
  p_before_created_at timestamptz default null,
  p_before_id uuid default null,
  p_limit integer default 30
)
returns table (
  message_id uuid,
  conversation_id uuid,
  sender_profile_id uuid,
  message_type text,
  content text,
  created_at timestamptz
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
  if not private.is_conversation_participant(p_conversation_id) then
    raise exception using errcode = '42501', message = 'conversation participation required';
  end if;
  if (p_before_created_at is null) <> (p_before_id is null) then
    raise exception using errcode = '22023', message = 'complete message cursor required';
  end if;
  if p_limit is null or p_limit not between 1 and 50 then
    raise exception using errcode = '22023', message = 'message page size must be between 1 and 50';
  end if;

  return query
  select message.id, message.conversation_id, message.sender_profile_id,
    message.message_type, message.content, message.created_at
  from public.messages as message
  where message.conversation_id = p_conversation_id
    and (
      p_before_created_at is null
      or (message.created_at, message.id) < (p_before_created_at, p_before_id)
    )
  order by message.created_at desc, message.id desc
  limit p_limit;
end;
$$;

create or replace function public.list_conversation_messages_after(
  p_conversation_id uuid,
  p_after_created_at timestamptz,
  p_after_id uuid,
  p_limit integer default 50
)
returns table (
  message_id uuid,
  conversation_id uuid,
  sender_profile_id uuid,
  message_type text,
  content text,
  created_at timestamptz
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
  if not private.is_conversation_participant(p_conversation_id) then
    raise exception using errcode = '42501', message = 'conversation participation required';
  end if;
  if p_after_created_at is null or p_after_id is null then
    raise exception using errcode = '22023', message = 'complete message cursor required';
  end if;
  if p_limit is null or p_limit not between 1 and 50 then
    raise exception using errcode = '22023', message = 'message page size must be between 1 and 50';
  end if;

  return query
  select message.id, message.conversation_id, message.sender_profile_id,
    message.message_type, message.content, message.created_at
  from public.messages as message
  where message.conversation_id = p_conversation_id
    and (message.created_at, message.id) > (p_after_created_at, p_after_id)
  order by message.created_at, message.id
  limit p_limit;
end;
$$;

create or replace function public.send_conversation_message(
  p_conversation_id uuid,
  p_message_id uuid,
  p_content text
)
returns table (
  message_id uuid,
  conversation_id uuid,
  sender_profile_id uuid,
  message_type text,
  content text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  clean_content text := btrim(regexp_replace(
    coalesce(p_content, ''), '[[:space:]]+', ' ', 'g'
  ));
  conversation_status text;
  customer_id uuid;
  worker_owner_id uuid;
  recipient_id uuid;
  created_message public.messages%rowtype;
  inserted boolean := false;
begin
  if caller_id is null or not private.is_current_user_active() then
    raise exception using errcode = '42501', message = 'active confirmed account required';
  end if;
  if p_conversation_id is null or p_message_id is null then
    raise exception using errcode = '22023', message = 'conversation and message id are required';
  end if;
  if char_length(clean_content) not between 1 and 2000 then
    raise exception using errcode = '22023', message = 'message must contain between 1 and 2000 characters';
  end if;

  select conversation.status, request.customer_profile_id, worker.profile_id
  into conversation_status, customer_id, worker_owner_id
  from public.conversations as conversation
  join public.service_requests as request
    on request.id = conversation.service_request_id
  join public.worker_profiles as worker
    on worker.id = request.worker_id
  where conversation.id = p_conversation_id
  for update of conversation;

  if conversation_status is null
     or caller_id not in (customer_id, worker_owner_id) then
    raise exception using errcode = '42501', message = 'conversation participation required';
  end if;
  if conversation_status <> 'active' then
    raise exception using errcode = '55000', message = 'conversation is closed';
  end if;

  insert into public.messages (
    id, conversation_id, sender_profile_id, message_type, content
  ) values (
    p_message_id, p_conversation_id, caller_id, 'text', clean_content
  )
  on conflict (id) do nothing
  returning * into created_message;

  if created_message.id is null then
    select * into created_message
    from public.messages as message
    where message.id = p_message_id;

    if created_message.conversation_id is distinct from p_conversation_id
       or created_message.sender_profile_id is distinct from caller_id
       or created_message.message_type <> 'text'
       or created_message.content <> clean_content then
      raise exception using errcode = '23505', message = 'message id already used';
    end if;
  else
    inserted := true;
  end if;

  if inserted then
    recipient_id := case when caller_id = customer_id
      then worker_owner_id else customer_id end;

    update public.conversations
    set updated_at = now()
    where id = p_conversation_id;

    insert into public.notifications (
      profile_id, type, title, body, related_entity_type, related_entity_id
    ) values (
      recipient_id,
      'message_received',
      'Nuevo mensaje',
      'Recibiste un mensaje sobre una solicitud de servicio.',
      'conversation',
      p_conversation_id
    );
  end if;

  return query select
    created_message.id,
    created_message.conversation_id,
    created_message.sender_profile_id,
    created_message.message_type,
    created_message.content,
    created_message.created_at;
end;
$$;

alter table public.messages enable row level security;
revoke all on table public.messages from public, anon, authenticated;
grant select on table public.messages to authenticated;

create policy messages_select_participants
on public.messages for select to authenticated
using (private.is_conversation_participant(conversation_id));

revoke all on function public.get_my_conversation(uuid) from public, anon;
revoke all on function public.get_my_conversation_for_request(uuid) from public, anon;
revoke all on function public.list_my_conversations(timestamptz, uuid, integer) from public, anon;
revoke all on function public.list_conversation_messages(uuid, timestamptz, uuid, integer) from public, anon;
revoke all on function public.list_conversation_messages_after(uuid, timestamptz, uuid, integer) from public, anon;
revoke all on function public.send_conversation_message(uuid, uuid, text) from public, anon;

grant execute on function public.get_my_conversation(uuid) to authenticated;
grant execute on function public.get_my_conversation_for_request(uuid) to authenticated;
grant execute on function public.list_my_conversations(timestamptz, uuid, integer) to authenticated;
grant execute on function public.list_conversation_messages(uuid, timestamptz, uuid, integer) to authenticated;
grant execute on function public.list_conversation_messages_after(uuid, timestamptz, uuid, integer) to authenticated;
grant execute on function public.send_conversation_message(uuid, uuid, text) to authenticated;

alter publication supabase_realtime add table public.messages;

comment on table public.messages is
  'MOD-10 frozen message entity. User text is created only through the participant RPC; system messages remain reserved for trusted future flows.';
comment on function public.send_conversation_message(uuid, uuid, text) is
  'MOD-10 idempotent active-conversation send contract. Derives sender from auth.uid(), normalizes and validates 1-2000 Unicode characters, persists text and notifies only the counterpart.';
comment on function public.list_my_conversations(timestamptz, uuid, integer) is
  'MOD-10 keyset-paginated participant inbox with one latest-message lookup per conversation and no private job location.';
comment on function public.list_conversation_messages(uuid, timestamptz, uuid, integer) is
  'MOD-10 participant-only backward keyset history, newest first and bounded to 50 rows.';
comment on function public.list_conversation_messages_after(uuid, timestamptz, uuid, integer) is
  'MOD-10 participant-only forward reconciliation used after Realtime reconnects.';
