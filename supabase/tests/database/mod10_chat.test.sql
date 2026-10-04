-- MOD-10 pgTAP suite. All chat fixtures roll back.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(84);

-- Frozen entity, hardened contracts and Realtime configuration.
select has_table('public', 'messages', 'messages materializes the frozen entity');
select columns_are('public', 'messages', array[
  'id','conversation_id','sender_profile_id','message_type','content','read_at','created_at'
], 'messages contains exactly the frozen columns');
select col_type_is('public', 'messages', 'content', 'text', 'message content remains PostgreSQL text');
select col_is_null('public', 'messages', 'sender_profile_id', 'system messages may preserve a null sender');
select fk_ok('public', 'messages', 'conversation_id', 'public', 'conversations', 'id',
  'messages belong to one frozen conversation');
select fk_ok('public', 'messages', 'sender_profile_id', 'public', 'profiles', 'id',
  'optional sender references profiles');
select ok(exists (select 1 from pg_constraint where conrelid = 'public.messages'::regclass
    and conname = 'messages_type_check'), 'message type constraint preserves text and system');
select ok(exists (select 1 from pg_constraint where conrelid = 'public.messages'::regclass
    and conname = 'messages_user_text_length_check'), 'database constraint protects user text length');
select has_index('public', 'messages', 'messages_conversation_created_id_idx',
  'message history has a deterministic pagination index');
select ok((select relrowsecurity from pg_class where oid = 'public.messages'::regclass),
  'messages has RLS enabled');
select ok(
  to_regprocedure('public.get_my_conversation(uuid)') is not null
  and to_regprocedure('public.get_my_conversation_for_request(uuid)') is not null
  and to_regprocedure('public.list_my_conversations(timestamptz,uuid,integer)') is not null
  and to_regprocedure('public.list_conversation_messages(uuid,timestamptz,uuid,integer)') is not null
  and to_regprocedure('public.list_conversation_messages_after(uuid,timestamptz,uuid,integer)') is not null
  and to_regprocedure('public.send_conversation_message(uuid,uuid,text)') is not null,
  'all MOD-10 controlled contracts exist');
select ok((select bool_and(prosecdef) from pg_proc where oid in (
  'public.get_my_conversation(uuid)'::regprocedure,
  'public.get_my_conversation_for_request(uuid)'::regprocedure,
  'public.list_my_conversations(timestamptz,uuid,integer)'::regprocedure,
  'public.list_conversation_messages(uuid,timestamptz,uuid,integer)'::regprocedure,
  'public.list_conversation_messages_after(uuid,timestamptz,uuid,integer)'::regprocedure,
  'public.send_conversation_message(uuid,uuid,text)'::regprocedure
)), 'all MOD-10 public contracts are SECURITY DEFINER');
select is((select count(*)::integer from pg_proc procedure, unnest(procedure.proconfig) setting
  where procedure.oid in (
    'public.get_my_conversation(uuid)'::regprocedure,
    'public.get_my_conversation_for_request(uuid)'::regprocedure,
    'public.list_my_conversations(timestamptz,uuid,integer)'::regprocedure,
    'public.list_conversation_messages(uuid,timestamptz,uuid,integer)'::regprocedure,
    'public.list_conversation_messages_after(uuid,timestamptz,uuid,integer)'::regprocedure,
    'public.send_conversation_message(uuid,uuid,text)'::regprocedure
  ) and setting = 'search_path=""'), 6, 'all MOD-10 contracts pin an empty search_path');
select ok(
  has_function_privilege('authenticated', 'public.get_my_conversation(uuid)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.get_my_conversation_for_request(uuid)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.list_my_conversations(timestamptz,uuid,integer)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.list_conversation_messages(uuid,timestamptz,uuid,integer)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.list_conversation_messages_after(uuid,timestamptz,uuid,integer)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.send_conversation_message(uuid,uuid,text)', 'EXECUTE'),
  'authenticated receives only the controlled contracts');
select ok(
  not has_function_privilege('anon', 'public.get_my_conversation(uuid)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.list_my_conversations(timestamptz,uuid,integer)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.list_conversation_messages(uuid,timestamptz,uuid,integer)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.send_conversation_message(uuid,uuid,text)', 'EXECUTE'),
  'anonymous has no chat contract execution');
select ok(
  not has_table_privilege('authenticated', 'public.messages', 'INSERT')
  and not has_table_privilege('authenticated', 'public.messages', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.messages', 'DELETE'),
  'normal clients cannot directly mutate messages');
select ok(has_table_privilege('authenticated', 'public.messages', 'SELECT'),
  'authenticated has RLS-filtered SELECT required by Postgres Changes');
select ok(exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'messages'
    and policyname = 'messages_select_participants'),
  'message SELECT policy is participant-scoped');
select ok(exists (select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'),
  'messages is included in the Supabase Realtime publication');
select ok(not exists (
  select 1 from pg_proc procedure, unnest(procedure.proargnames) argument_name
  where procedure.oid = 'public.send_conversation_message(uuid,uuid,text)'::regprocedure
    and argument_name in ('p_sender_profile_id','p_message_type','p_customer_profile_id','p_worker_id')
), 'send signature cannot accept sender participant or message type');

-- Two unrelated customer/worker pairs plus blocked identities.
insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data)
values
  ('a1000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'chat-customer-a@example.invalid', now(), '{"first_name":"Carla","last_name":"Cliente"}'::jsonb),
  ('a1000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'chat-customer-b@example.invalid', now(), '{"first_name":"Bruno","last_name":"Cliente"}'::jsonb),
  ('a1000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'chat-unconfirmed@example.invalid', null, '{"first_name":"Una","last_name":"Persona"}'::jsonb),
  ('a1000000-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'chat-suspended@example.invalid', now(), '{"first_name":"Suspendida","last_name":"Persona"}'::jsonb),
  ('a1000000-0000-4000-8000-000000000010', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'chat-worker-a@example.invalid', now(), '{"first_name":"Ana","last_name":"Profesional"}'::jsonb),
  ('a1000000-0000-4000-8000-000000000011', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'chat-worker-b@example.invalid', now(), '{"first_name":"Omar","last_name":"Profesional"}'::jsonb);

update public.profiles set account_status = 'suspended'
where id = 'a1000000-0000-4000-8000-000000000004';

select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000010', true);
insert into public.worker_profiles (id, profile_id, bio, years_experience, approval_status)
values ('a2000000-0000-4000-8000-000000000010', 'a1000000-0000-4000-8000-000000000010',
  'Profesional participante de conversaciones reales de servicio.', 8, 'draft');
insert into public.worker_services (id, worker_id, category_id, title, description, pricing_type, price_bob, active)
values ('a3000000-0000-4000-8000-000000000010', 'a2000000-0000-4000-8000-000000000010',
  '00000000-0000-4000-8000-000000000001', 'Instalación eléctrica',
  'Servicio eléctrico usado para validar mensajería segura.', 'fixed', 300, true);

select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000011', true);
insert into public.worker_profiles (id, profile_id, bio, years_experience, approval_status)
values ('a2000000-0000-4000-8000-000000000011', 'a1000000-0000-4000-8000-000000000011',
  'Segundo profesional ajeno a las conversaciones del primer par.', 5, 'draft');
insert into public.worker_services (id, worker_id, category_id, title, description, pricing_type, price_bob, active)
values ('a3000000-0000-4000-8000-000000000011', 'a2000000-0000-4000-8000-000000000011',
  '00000000-0000-4000-8000-000000000001', 'Reparación eléctrica',
  'Servicio ajeno para verificar aislamiento entre conversaciones.', 'fixed', 200, true);

select set_config('request.jwt.claim.sub', '', true);
update public.worker_profiles set approval_status = 'approved'
where id in ('a2000000-0000-4000-8000-000000000010', 'a2000000-0000-4000-8000-000000000011');

insert into public.service_requests (
  id, customer_profile_id, worker_id, worker_service_id, description, job_area_label, status
) values
  ('a4000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000010', 'a3000000-0000-4000-8000-000000000010', 'Trabajo activo A', 'Centro', 'pending'),
  ('a4000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000010', 'a3000000-0000-4000-8000-000000000010', 'Trabajo cerrado A', 'Centro', 'accepted'),
  ('a4000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000002', 'a2000000-0000-4000-8000-000000000011', 'a3000000-0000-4000-8000-000000000011', 'Trabajo activo B', 'Norte', 'pending');

insert into public.conversations (id, service_request_id, status, closed_at)
values
  ('a5000000-0000-4000-8000-000000000001', 'a4000000-0000-4000-8000-000000000001', 'active', null),
  ('a5000000-0000-4000-8000-000000000002', 'a4000000-0000-4000-8000-000000000002', 'closed', now()),
  ('a5000000-0000-4000-8000-000000000003', 'a4000000-0000-4000-8000-000000000003', 'active', null);

select ok(exists (
  select 1 from public.conversations
  where id = 'a5000000-0000-4000-8000-000000000001'
    and service_request_id = 'a4000000-0000-4000-8000-000000000001'
), 'existing conversation remains uniquely linked to its real service request');

-- Authentication, participants and approved user-text rule.
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select throws_ok($sql$select * from public.send_conversation_message(
  'a5000000-0000-4000-8000-000000000001', 'a6000000-0000-4000-8000-000000000090', 'Hola')$sql$,
  '42501', 'permission denied for function send_conversation_message', 'anonymous cannot send messages');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000003', true);
select throws_ok($sql$select * from public.send_conversation_message(
  'a5000000-0000-4000-8000-000000000001', 'a6000000-0000-4000-8000-000000000091', 'Hola')$sql$,
  '42501', 'active confirmed account required', 'unconfirmed caller cannot send');
select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000004', true);
select throws_ok($sql$select * from public.send_conversation_message(
  'a5000000-0000-4000-8000-000000000001', 'a6000000-0000-4000-8000-000000000092', 'Hola')$sql$,
  '42501', 'active confirmed account required', 'suspended caller cannot send');
select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000002', true);
select throws_ok($sql$select * from public.send_conversation_message(
  'a5000000-0000-4000-8000-000000000001', 'a6000000-0000-4000-8000-000000000093', 'Hola')$sql$,
  '42501', 'conversation participation required', 'unrelated customer cannot send');
select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000011', true);
select throws_ok($sql$select * from public.send_conversation_message(
  'a5000000-0000-4000-8000-000000000001', 'a6000000-0000-4000-8000-000000000094', 'Hola')$sql$,
  '42501', 'conversation participation required', 'unrelated worker cannot send');

select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000001', true);
select throws_ok($sql$select * from public.send_conversation_message(
  'a5000000-0000-4000-8000-000000000001', 'a6000000-0000-4000-8000-000000000095', '')$sql$,
  '22023', 'message must contain between 1 and 2000 characters', 'empty user text is rejected');
select throws_ok($sql$select * from public.send_conversation_message(
  'a5000000-0000-4000-8000-000000000001', 'a6000000-0000-4000-8000-000000000096', E'  \n\t  ')$sql$,
  '22023', 'message must contain between 1 and 2000 characters', 'whitespace-only user text is rejected');
select throws_ok($sql$select * from public.send_conversation_message(
  'a5000000-0000-4000-8000-000000000001', 'a6000000-0000-4000-8000-000000000097', repeat('x', 2001))$sql$,
  '22023', 'message must contain between 1 and 2000 characters', '2,001 normalized characters are rejected');

select is((select char_length(content) from public.send_conversation_message(
  'a5000000-0000-4000-8000-000000000001', 'a6000000-0000-4000-8000-000000000001', repeat('á', 2000))),
  2000, 'exactly 2,000 Unicode characters are accepted without truncation');
select is((select content from public.send_conversation_message(
  'a5000000-0000-4000-8000-000000000001', 'a6000000-0000-4000-8000-000000000002', '🧰⚡')),
  '🧰⚡', 'Unicode text is preserved');
select is((select content from public.send_conversation_message(
  'a5000000-0000-4000-8000-000000000001', 'a6000000-0000-4000-8000-000000000003', E'  Hola\n  desde\t Contrátame  ')),
  'Hola desde Contrátame', 'user text whitespace is normalized server-side');

reset role;
select is((select sender_profile_id from public.messages where id = 'a6000000-0000-4000-8000-000000000003'),
  'a1000000-0000-4000-8000-000000000001'::uuid, 'sender is derived from auth.uid');
select is((select message_type from public.messages where id = 'a6000000-0000-4000-8000-000000000003'),
  'text', 'user RPC always creates a text message');
select ok((select created_at is not null from public.messages where id = 'a6000000-0000-4000-8000-000000000003'),
  'PostgreSQL generates the message timestamp');
set local role authenticated;
select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000010', true);
select is((select sender_profile_id from public.send_conversation_message(
  'a5000000-0000-4000-8000-000000000001', 'a6000000-0000-4000-8000-000000000004', 'Respuesta del profesional')),
  'a1000000-0000-4000-8000-000000000010'::uuid, 'assigned worker can send as their derived profile');
reset role;
select is((select count(*)::integer from public.notifications
  where profile_id = 'a1000000-0000-4000-8000-000000000001' and type = 'message_received'),
  1, 'worker message notifies the customer counterpart');

-- Participant reads, isolation and immutable client writes.
set local role authenticated;
select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000001', true);
select is((select count(*)::integer from public.list_conversation_messages(
  'a5000000-0000-4000-8000-000000000001', null, null, 30)), 4,
  'customer participant reads authorized message history');
select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000010', true);
select is((select count(*)::integer from public.list_conversation_messages(
  'a5000000-0000-4000-8000-000000000001', null, null, 30)), 4,
  'assigned worker reads authorized message history');
select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000002', true);
select throws_ok($sql$select * from public.list_conversation_messages(
  'a5000000-0000-4000-8000-000000000001', null, null, 30)$sql$,
  '42501', 'conversation participation required', 'unrelated customer cannot read history');
select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000011', true);
select throws_ok($sql$select * from public.list_conversation_messages(
  'a5000000-0000-4000-8000-000000000001', null, null, 30)$sql$,
  '42501', 'conversation participation required', 'unrelated worker cannot read history');
reset role;
set local role anon;
select throws_ok($sql$select * from public.list_conversation_messages(
  'a5000000-0000-4000-8000-000000000001', null, null, 30)$sql$,
  '42501', 'permission denied for function list_conversation_messages', 'anonymous cannot read history');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000001', true);
select throws_ok($sql$select * from public.send_conversation_message(
  'a5000000-0000-4000-8000-000000000003', 'a6000000-0000-4000-8000-000000000098', 'Cruce')$sql$,
  '42501', 'conversation participation required', 'participant cannot send into another conversation');
select throws_ok($sql$insert into public.messages (
  id, conversation_id, sender_profile_id, message_type, content
) values (
  'a6000000-0000-4000-8000-000000000099', 'a5000000-0000-4000-8000-000000000001',
  'a1000000-0000-4000-8000-000000000010', 'text', 'Suplantado'
)$sql$, '42501', 'permission denied for table messages', 'direct insert and sender impersonation are denied');
select throws_ok($sql$update public.messages set content = 'Editado'
  where id = 'a6000000-0000-4000-8000-000000000003'$sql$,
  '42501', 'permission denied for table messages', 'participant cannot edit messages');
select throws_ok($sql$delete from public.messages
  where id = 'a6000000-0000-4000-8000-000000000003'$sql$,
  '42501', 'permission denied for table messages', 'participant cannot delete messages');
select throws_ok($sql$update public.conversations set service_request_id = 'a4000000-0000-4000-8000-000000000003'
  where id = 'a5000000-0000-4000-8000-000000000001'$sql$,
  '42501', 'permission denied for table conversations', 'normal user cannot modify conversation participants');

select throws_ok($sql$select * from public.send_conversation_message(
  'a5000000-0000-4000-8000-000000000002', 'a6000000-0000-4000-8000-000000000010', 'No permitido')$sql$,
  '55000', 'conversation is closed', 'closed conversation rejects new messages');
select is((select count(*)::integer from public.get_my_conversation('a5000000-0000-4000-8000-000000000002')),
  1, 'closed conversation remains readable by its customer');
select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000010', true);
select is((select count(*)::integer from public.get_my_conversation('a5000000-0000-4000-8000-000000000002')),
  1, 'closed conversation remains readable by its worker');

-- Client UUID makes retries idempotent without altering the frozen entity.
select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000001', true);
select is((select message_id from public.send_conversation_message(
  'a5000000-0000-4000-8000-000000000001', 'a6000000-0000-4000-8000-000000000003', 'Hola desde Contrátame')),
  'a6000000-0000-4000-8000-000000000003'::uuid, 'same id and normalized payload safely retry the existing message');
reset role;
select is((select count(*)::integer from public.messages where id = 'a6000000-0000-4000-8000-000000000003'),
  1, 'idempotent retry leaves exactly one message');
set local role authenticated;
select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000001', true);
select throws_ok($sql$select * from public.send_conversation_message(
  'a5000000-0000-4000-8000-000000000001', 'a6000000-0000-4000-8000-000000000003', 'Contenido diferente')$sql$,
  '23505', 'message id already used', 'same id cannot be reused with changed content');
reset role;
select is((select count(*)::integer from public.notifications
  where profile_id = 'a1000000-0000-4000-8000-000000000010' and type = 'message_received'),
  3, 'each new customer message notifies only the assigned worker');
select is((select count(*)::integer from public.notifications
  where profile_id = 'a1000000-0000-4000-8000-000000000001' and type = 'message_received'),
  1, 'customer is notified only for the worker counterpart message');
select is((select count(*)::integer from public.notifications
  where profile_id = 'a1000000-0000-4000-8000-000000000010' and type = 'message_received'),
  3, 'idempotent retry does not duplicate notifications');
select ok(not exists (select 1 from public.notifications
  where type = 'message_received'
    and (related_entity_type <> 'conversation' or related_entity_id <> 'a5000000-0000-4000-8000-000000000001')),
  'message notifications reference only the real conversation');

-- Inbox, keyset pagination, privacy and deterministic synchronization.
set local role authenticated;
select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000001', true);
select is((select count(*)::integer from public.list_my_conversations(null, null, 12)),
  2, 'customer inbox contains only their active and closed conversations');
select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000010', true);
select is((select count(*)::integer from public.list_my_conversations(null, null, 12)),
  2, 'worker inbox contains only requests assigned to their worker profile');
select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000002', true);
select is((select count(*)::integer from public.list_my_conversations(null, null, 12)),
  1, 'unrelated customer sees only their own conversation');
select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000001', true);
select is((select latest_message_content from public.list_my_conversations(null, null, 12)
  where conversation_id = 'a5000000-0000-4000-8000-000000000001'),
  'Respuesta del profesional', 'inbox exposes the safe latest-message preview');
select is((select count(*)::integer from public.list_my_conversations(null, null, 12) conversation,
  lateral jsonb_object_keys(to_jsonb(conversation)) key
  where key in ('description','address_text','exact_location','latitude','longitude','email','phone','approval_status')),
  0, 'inbox contract excludes job coordinates contact and approval data');
select is((select conversation_id from public.list_my_conversations(null, null, 12) limit 1),
  'a5000000-0000-4000-8000-000000000002'::uuid,
  'inbox order uses conversation id as deterministic tie-breaker for equal activity timestamps');
select is((select count(*)::integer from public.list_my_conversations(null, null, 1)),
  1, 'conversation page size is bounded');
select isnt(
  (select conversation_id from public.list_my_conversations(null, null, 1)),
  (select second.conversation_id from public.list_my_conversations(
    (select first.activity_at from public.list_my_conversations(null, null, 1) first),
    (select first.conversation_id from public.list_my_conversations(null, null, 1) first), 1) second),
  'consecutive conversation cursor pages do not duplicate rows');
select is((select message_id from public.list_conversation_messages(
  'a5000000-0000-4000-8000-000000000001', null, null, 1)),
  'a6000000-0000-4000-8000-000000000004'::uuid,
  'message history is newest first with id tie-breaker');
select is((select count(*)::integer from public.list_conversation_messages(
  'a5000000-0000-4000-8000-000000000001',
  (select created_at from public.messages where id = 'a6000000-0000-4000-8000-000000000004'),
  'a6000000-0000-4000-8000-000000000004', 30)),
  3, 'backward cursor returns only older messages');
select is((select count(*)::integer from public.list_conversation_messages_after(
  'a5000000-0000-4000-8000-000000000001',
  (select created_at from public.messages where id = 'a6000000-0000-4000-8000-000000000002'),
  'a6000000-0000-4000-8000-000000000002', 50)),
  2, 'forward cursor recovers messages missed during reconnect');
select throws_ok($sql$select * from public.list_conversation_messages(
  'a5000000-0000-4000-8000-000000000001', now(), null, 30)$sql$,
  '22023', 'complete message cursor required', 'partial message cursor is rejected');
select throws_ok($sql$select * from public.list_conversation_messages(
  'a5000000-0000-4000-8000-000000000001', null, null, 51)$sql$,
  '22023', 'message page size must be between 1 and 50', 'unbounded message page is rejected');
select throws_ok($sql$select * from public.list_my_conversations(now(), null, 12)$sql$,
  '22023', 'complete conversation cursor required', 'partial conversation cursor is rejected');
select throws_ok($sql$select * from public.list_my_conversations(null, null, 21)$sql$,
  '22023', 'conversation page size must be between 1 and 20', 'unbounded conversation page is rejected');
reset role;

-- Frozen system-message shape is preserved without applying the user-text rule.
insert into public.messages (
  id, conversation_id, sender_profile_id, message_type, content
) values (
  'a6000000-0000-4000-8000-000000000020',
  'a5000000-0000-4000-8000-000000000002', null, 'system', ''
);
select is((select content from public.messages where id = 'a6000000-0000-4000-8000-000000000020'),
  '', 'system message content preserves the frozen behavior');
select ok((select sender_profile_id is null from public.messages where id = 'a6000000-0000-4000-8000-000000000020'),
  'system message preserves nullable sender');
set local role authenticated;
select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000001', true);
select is((select message_type from public.list_conversation_messages(
  'a5000000-0000-4000-8000-000000000002', null, null, 30)),
  'system', 'participant history safely returns the frozen system type');
select is((select count(*)::integer from public.messages), 5,
  'customer direct SELECT is RLS-limited to both participant conversations');
select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000002', true);
select is((select count(*)::integer from public.messages), 0,
  'unrelated customer receives no message rows through Realtime SELECT RLS');
select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000004', true);
select is((select count(*)::integer from public.messages), 0,
  'suspended account receives no message rows through Realtime SELECT RLS');

-- Notification failure proves atomic message persistence.
reset role;
create or replace function private.mod10_test_fail_message_notification()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.type = 'message_received' then
    raise exception 'test message notification failure';
  end if;
  return new;
end;
$$;
create trigger mod10_test_fail_message_notification
  before insert on public.notifications
  for each row execute function private.mod10_test_fail_message_notification();
set local role authenticated;
select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000001', true);
select throws_ok($sql$select * from public.send_conversation_message(
  'a5000000-0000-4000-8000-000000000001', 'a6000000-0000-4000-8000-000000000030', 'Debe revertirse')$sql$,
  'P0001', 'test message notification failure', 'notification failure aborts message creation');
reset role;
drop trigger mod10_test_fail_message_notification on public.notifications;
drop function private.mod10_test_fail_message_notification();
select is((select count(*)::integer from public.messages where id = 'a6000000-0000-4000-8000-000000000030'),
  0, 'failed notification leaves no partial message');
select is((select count(*)::integer from public.notifications
  where type = 'message_received' and related_entity_id = 'a5000000-0000-4000-8000-000000000001'),
  4, 'failed send leaves no partial notification');

select ok(
  to_regprocedure('public.create_service_request(uuid,uuid,text,text,double precision,double precision,date,time,numeric,text)') is not null
  and to_regprocedure('public.accept_service_request_quote(uuid,date,time)') is not null
  and to_regprocedure('public.confirm_booking_completion(uuid)') is not null
  and to_regprocedure('public.create_booking_review(uuid,smallint,text)') is not null,
  'MOD-06 through MOD-09 core contracts remain available');
select is((select count(*)::integer from public.conversations
  where service_request_id = 'a4000000-0000-4000-8000-000000000001'),
  1, 'MOD-10 does not duplicate the MOD-06 conversation');
select is((select count(*)::integer from public.messages
  where message_type not in ('text','system')), 0, 'only frozen message types exist');

select * from finish();
rollback;
