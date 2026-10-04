-- MOD-11 pgTAP suite. All notification fixtures roll back.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(62);

-- Frozen entity, controlled contracts and Realtime prerequisites.
select has_table('public', 'notifications', 'notifications remains the canonical frozen entity');
select columns_are('public', 'notifications', array[
  'id','profile_id','type','title','body','related_entity_type','related_entity_id','read_at','created_at'
], 'notifications contains exactly the frozen columns');
select fk_ok('public', 'notifications', 'profile_id', 'public', 'profiles', 'id',
  'notification recipient references profiles');
select col_type_is('public', 'notifications', 'body', 'text', 'notification body remains PostgreSQL text');
select col_is_null('public', 'notifications', 'read_at', 'read_at preserves unread as null');
select col_has_default('public', 'notifications', 'created_at', 'PostgreSQL owns notification timestamps');
select has_index('public', 'notifications', 'notifications_profile_created_id_idx',
  'notification inbox has deterministic pagination index');
select has_index('public', 'notifications', 'notifications_profile_unread_idx',
  'unread count has a recipient-scoped partial index');
select ok((select relrowsecurity from pg_class where oid = 'public.notifications'::regclass),
  'notifications has RLS enabled');
select ok(exists (select 1 from pg_policies where schemaname = 'public'
    and tablename = 'notifications' and policyname = 'notifications_select_receiver'),
  'existing notification SELECT policy remains recipient-scoped');
select ok(
  to_regprocedure('public.list_my_notifications(timestamptz,uuid,integer)') is not null
  and to_regprocedure('public.list_my_notifications_after(timestamptz,uuid,integer)') is not null
  and to_regprocedure('public.get_my_notification_unread_count()') is not null
  and to_regprocedure('public.mark_my_notification_read(uuid)') is not null,
  'all MOD-11 controlled contracts exist');
select ok((select bool_and(prosecdef) from pg_proc where oid in (
  'public.list_my_notifications(timestamptz,uuid,integer)'::regprocedure,
  'public.list_my_notifications_after(timestamptz,uuid,integer)'::regprocedure,
  'public.get_my_notification_unread_count()'::regprocedure,
  'public.mark_my_notification_read(uuid)'::regprocedure
)), 'all MOD-11 contracts are SECURITY DEFINER');
select is((select count(*)::integer from pg_proc procedure, unnest(procedure.proconfig) setting
  where procedure.oid in (
    'public.list_my_notifications(timestamptz,uuid,integer)'::regprocedure,
    'public.list_my_notifications_after(timestamptz,uuid,integer)'::regprocedure,
    'public.get_my_notification_unread_count()'::regprocedure,
    'public.mark_my_notification_read(uuid)'::regprocedure
  ) and setting = 'search_path=""'), 4, 'all MOD-11 contracts pin an empty search_path');
select ok(
  has_function_privilege('authenticated', 'public.list_my_notifications(timestamptz,uuid,integer)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.list_my_notifications_after(timestamptz,uuid,integer)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.get_my_notification_unread_count()', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.mark_my_notification_read(uuid)', 'EXECUTE'),
  'authenticated receives only the controlled contracts');
select ok(
  not has_function_privilege('anon', 'public.list_my_notifications(timestamptz,uuid,integer)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.list_my_notifications_after(timestamptz,uuid,integer)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.get_my_notification_unread_count()', 'EXECUTE')
  and not has_function_privilege('anon', 'public.mark_my_notification_read(uuid)', 'EXECUTE'),
  'anonymous has no notification contract execution');
select ok(has_table_privilege('authenticated', 'public.notifications', 'SELECT'),
  'authenticated has RLS-filtered SELECT required by Postgres Changes');
select ok(
  not has_table_privilege('authenticated', 'public.notifications', 'INSERT')
  and not has_table_privilege('authenticated', 'public.notifications', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.notifications', 'DELETE'),
  'normal clients have no direct notification DML');
select ok(exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime'
    and schemaname = 'public' and tablename = 'notifications'),
  'notifications is included in the Supabase Realtime publication');
select ok(not exists (
  select 1 from pg_proc procedure, unnest(procedure.proargnames) argument_name
  where procedure.oid in (
    'public.list_my_notifications(timestamptz,uuid,integer)'::regprocedure,
    'public.list_my_notifications_after(timestamptz,uuid,integer)'::regprocedure,
    'public.get_my_notification_unread_count()'::regprocedure,
    'public.mark_my_notification_read(uuid)'::regprocedure
  ) and argument_name in ('p_profile_id','p_recipient_id','p_read_at','p_title','p_body')
), 'client contracts cannot choose recipient, content or read timestamp');

-- Two recipients plus blocked identities. Auth trigger creates one profile per user.
insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data)
values
  ('b1000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'notify-a@example.invalid', now(), '{"first_name":"Ana","last_name":"Cliente"}'::jsonb),
  ('b1000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'notify-b@example.invalid', now(), '{"first_name":"Beto","last_name":"Cliente"}'::jsonb),
  ('b1000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'notify-unconfirmed@example.invalid', null, '{"first_name":"Una","last_name":"Persona"}'::jsonb),
  ('b1000000-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'notify-suspended@example.invalid', now(), '{"first_name":"Sonia","last_name":"Persona"}'::jsonb);

update public.profiles set account_status = 'suspended'
where id = 'b1000000-0000-4000-8000-000000000004';

insert into public.notifications (
  id, profile_id, type, title, body, related_entity_type, related_entity_id, read_at, created_at
) values
  ('b2000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', 'service_request_created', 'Nueva solicitud de servicio', 'Recibiste una nueva solicitud directa de servicio.', 'service_request', 'b3000000-0000-4000-8000-000000000001', null, '2026-10-04 10:00:00+00'),
  ('b2000000-0000-4000-8000-000000000002', 'b1000000-0000-4000-8000-000000000001', 'quote_accepted', 'Cotización aceptada', 'El cliente aceptó tu cotización y se creó la contratación.', 'booking', 'b3000000-0000-4000-8000-000000000002', '2026-10-04 11:30:00+00', '2026-10-04 11:00:00+00'),
  ('b2000000-0000-4000-8000-000000000003', 'b1000000-0000-4000-8000-000000000001', 'booking_created', 'Contratación programada', 'Tu cotización aceptada quedó programada.', 'booking', 'b3000000-0000-4000-8000-000000000003', null, '2026-10-04 12:00:00+00'),
  ('b2000000-0000-4000-8000-000000000004', 'b1000000-0000-4000-8000-000000000001', 'booking_started', 'Trabajo iniciado', 'El profesional inició el trabajo contratado.', 'booking', 'b3000000-0000-4000-8000-000000000004', null, '2026-10-04 13:00:00+00'),
  ('b2000000-0000-4000-8000-000000000005', 'b1000000-0000-4000-8000-000000000001', 'booking_completion_requested', 'Finalización pendiente', 'El profesional marcó el trabajo como finalizado. Confirma el resultado.', 'booking', 'b3000000-0000-4000-8000-000000000005', null, '2026-10-04 14:00:00+00'),
  ('b2000000-0000-4000-8000-000000000006', 'b1000000-0000-4000-8000-000000000001', 'booking_completed', 'Trabajo completado', 'El cliente confirmó la finalización del trabajo.', 'booking', 'b3000000-0000-4000-8000-000000000006', null, '2026-10-04 15:00:00+00'),
  ('b2000000-0000-4000-8000-000000000007', 'b1000000-0000-4000-8000-000000000001', 'review_received', 'Nueva reseña recibida', 'Un cliente calificó un servicio completado.', 'review', 'b3000000-0000-4000-8000-000000000007', null, '2026-10-04 16:00:00+00'),
  ('b2000000-0000-4000-8000-000000000008', 'b1000000-0000-4000-8000-000000000001', 'message_received', 'Nuevo mensaje', 'Recibiste un mensaje sobre una solicitud de servicio.', 'conversation', 'b3000000-0000-4000-8000-000000000008', null, '2026-10-04 16:00:00+00'),
  ('b2000000-0000-4000-8000-000000000009', 'b1000000-0000-4000-8000-000000000002', 'message_received', 'Nuevo mensaje', 'Recibiste un mensaje sobre una solicitud de servicio.', 'conversation', 'b3000000-0000-4000-8000-000000000009', null, '2026-10-04 17:00:00+00');

-- Authentication, recipient isolation and safe render payload.
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select throws_ok($sql$select * from public.list_my_notifications(null, null, 20)$sql$,
  '42501', 'permission denied for function list_my_notifications', 'anonymous cannot list notifications');
select throws_ok($sql$select public.get_my_notification_unread_count()$sql$,
  '42501', 'permission denied for function get_my_notification_unread_count', 'anonymous cannot count unread notifications');
select throws_ok($sql$select * from public.mark_my_notification_read('b2000000-0000-4000-8000-000000000001')$sql$,
  '42501', 'permission denied for function mark_my_notification_read', 'anonymous cannot mark notifications read');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'b1000000-0000-4000-8000-000000000003', true);
select throws_ok($sql$select * from public.list_my_notifications(null, null, 20)$sql$,
  '42501', 'active confirmed account required', 'unconfirmed account cannot list notifications');
select set_config('request.jwt.claim.sub', 'b1000000-0000-4000-8000-000000000004', true);
select throws_ok($sql$select * from public.list_my_notifications(null, null, 20)$sql$,
  '42501', 'active confirmed account required', 'suspended account cannot list notifications');
select set_config('request.jwt.claim.sub', 'b1000000-0000-4000-8000-000000000001', true);
select is((select count(*)::integer from public.list_my_notifications(null, null, 20)), 8,
  'recipient A lists only their eight notifications');
select set_config('request.jwt.claim.sub', 'b1000000-0000-4000-8000-000000000002', true);
select is((select count(*)::integer from public.list_my_notifications(null, null, 20)), 1,
  'recipient B lists only their notification');
select is((select count(*)::integer from public.notifications), 1,
  'direct SELECT is also isolated by owner RLS');
select set_config('request.jwt.claim.sub', 'b1000000-0000-4000-8000-000000000001', true);
select is((select count(*)::integer
  from (select * from public.list_my_notifications(null, null, 1)) row_value
  cross join lateral jsonb_object_keys(to_jsonb(row_value)) keys(key)), 10,
  'list returns only the ten-field controlled allowlist');
select is((select title from public.list_my_notifications(null, null, 1)), 'Nuevo mensaje',
  'Spanish title is rendered from the canonical record');
select is((select body from public.list_my_notifications(null, null, 1)),
  'Recibiste un mensaje sobre una solicitud de servicio.',
  'safe Spanish body is rendered without message content');
select ok(not exists (
  select 1
  from (select * from public.list_my_notifications(null, null, 1)) row_value
  cross join lateral jsonb_object_keys(to_jsonb(row_value)) keys(key)
  where key in ('profile_id','exact_location','address_text','email','message_content')
), 'RPC payload excludes recipient identity and private transactional data');
select is((select array_agg(type order by type)::text from public.notifications),
  '{booking_completed,booking_completion_requested,booking_created,booking_started,message_received,quote_accepted,review_received,service_request_created}',
  'recipient payload preserves all existing event types');

-- Deterministic keyset pagination and bounded reconnect synchronization.
select is((select array_agg(notification_id order by ordinal)::text from (
  select notification_id, row_number() over () ordinal
  from public.list_my_notifications(null, null, 3)
) page), '{b2000000-0000-4000-8000-000000000008,b2000000-0000-4000-8000-000000000007,b2000000-0000-4000-8000-000000000006}',
  'newest-first order uses UUID only as an equal-timestamp tie-breaker');
select is((select count(*)::integer from public.list_my_notifications(null, null, 2)), 2,
  'requested page size bounds inbox results');
select is((select array_agg(notification_id order by ordinal)::text from (
  select notification_id, row_number() over () ordinal
  from public.list_my_notifications('2026-10-04 15:00:00+00', 'b2000000-0000-4000-8000-000000000006', 3)
) page), '{b2000000-0000-4000-8000-000000000005,b2000000-0000-4000-8000-000000000004,b2000000-0000-4000-8000-000000000003}',
  'older page continues strictly after the composite cursor');
select is((select count(*)::integer from (
  select notification_id from public.list_my_notifications(null, null, 3)
  intersect
  select notification_id from public.list_my_notifications(
    '2026-10-04 15:00:00+00', 'b2000000-0000-4000-8000-000000000006', 3)
) overlap), 0, 'adjacent pages contain no duplicates');
select throws_ok($sql$select * from public.list_my_notifications(now(), null, 20)$sql$,
  '22023', 'complete notification cursor required', 'partial older cursor is rejected');
select throws_ok($sql$select * from public.list_my_notifications(null, null, 51)$sql$,
  '22023', 'notification page size must be between 1 and 50', 'inbox page size is bounded');
select throws_ok($sql$select * from public.list_my_notifications_after(
  '2026-10-04 15:00:00+00', 'b2000000-0000-4000-8000-000000000006', 101)$sql$,
  '22023', 'notification sync size must be between 1 and 100', 'reconnect synchronization size is bounded');
select is((select array_agg(notification_id order by ordinal)::text from (
  select notification_id, row_number() over () ordinal
  from public.list_my_notifications_after(
    '2026-10-04 15:00:00+00', 'b2000000-0000-4000-8000-000000000006', 20)
) page), '{b2000000-0000-4000-8000-000000000007,b2000000-0000-4000-8000-000000000008}',
  'reconnect contract returns newer rows in forward cursor order');
select is((select count(*)::integer from public.list_my_notifications_after(
  '2026-10-04 16:00:00+00', 'b2000000-0000-4000-8000-000000000008', 20)), 0,
  'reconnect cursor does not duplicate the newest known row');

-- Recipient-only idempotent read transition.
select is(public.get_my_notification_unread_count(), 7::bigint,
  'server derives the exact initial unread count');
select is((select notification_id from public.mark_my_notification_read(
  'b2000000-0000-4000-8000-000000000001')),
  'b2000000-0000-4000-8000-000000000001'::uuid, 'recipient can mark their notification read');
select ok((select read_at is not null from public.notifications
  where id = 'b2000000-0000-4000-8000-000000000001'), 'read timestamp persists in PostgreSQL');
select is(public.get_my_notification_unread_count(), 6::bigint,
  'server unread count decrements exactly once');
select is((select read_at from public.mark_my_notification_read(
  'b2000000-0000-4000-8000-000000000001')),
  (select read_at from public.notifications where id = 'b2000000-0000-4000-8000-000000000001'),
  'repeated mark-as-read is idempotent');
select set_config('request.jwt.claim.sub', 'b1000000-0000-4000-8000-000000000002', true);
select throws_ok($sql$select * from public.mark_my_notification_read(
  'b2000000-0000-4000-8000-000000000001')$sql$,
  '42501', 'notification ownership required', 'cross-recipient mark-as-read is rejected');
reset role;
select is((select profile_id from public.notifications
  where id = 'b2000000-0000-4000-8000-000000000001'),
  'b1000000-0000-4000-8000-000000000001'::uuid, 'failed forgery cannot alter recipient ownership');
select is((select title from public.notifications
  where id = 'b2000000-0000-4000-8000-000000000001'),
  'Nueva solicitud de servicio', 'controlled read transition cannot alter notification content');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'b1000000-0000-4000-8000-000000000001', true);
select throws_ok($sql$update public.notifications set title = 'Falsificado'
  where id = 'b2000000-0000-4000-8000-000000000001'$sql$,
  '42501', 'permission denied for table notifications', 'direct content update is denied');
select throws_ok($sql$insert into public.notifications (
  profile_id, type, title, body
) values (
  'b1000000-0000-4000-8000-000000000002', 'forged', 'Falsa', 'Falsa'
)$sql$, '42501', 'permission denied for table notifications', 'direct forged recipient insert is denied');
select throws_ok($sql$delete from public.notifications
  where id = 'b2000000-0000-4000-8000-000000000001'$sql$,
  '42501', 'permission denied for table notifications', 'direct notification deletion is denied');

-- Navigation hints are derived server-side and never authorize destination access.
select is((select navigation_target_type from public.list_my_notifications(null, null, 20)
  where notification_type = 'service_request_created'), 'service_request',
  'service request event receives a safe request navigation hint');
select is((select navigation_target_type from public.list_my_notifications(null, null, 20)
  where notification_type = 'booking_created'), 'booking',
  'booking event receives a safe booking navigation hint');
select is((select navigation_target_type from public.list_my_notifications(null, null, 20)
  where notification_type = 'message_received'), 'conversation',
  'message event receives a safe conversation navigation hint');
select is((select navigation_target_type from public.list_my_notifications(null, null, 20)
  where notification_type = 'review_received'), null,
  'review event has no fabricated destination when no existing detail route exists');
reset role;
insert into public.notifications (
  id, profile_id, type, title, body, related_entity_type, related_entity_id, created_at
) values (
  'b2000000-0000-4000-8000-000000000010', 'b1000000-0000-4000-8000-000000000001',
  'legacy_unknown', 'Evento conservado', 'Contenido canónico.', 'unknown',
  'b3000000-0000-4000-8000-000000000010', '2026-10-04 18:00:00+00'
);
set local role authenticated;
select set_config('request.jwt.claim.sub', 'b1000000-0000-4000-8000-000000000001', true);
select is((select navigation_target_type from public.list_my_notifications(null, null, 20)
  where notification_type = 'legacy_unknown'), null,
  'unknown canonical event is preserved without unsafe navigation');
reset role;
select is((select count(distinct type)::integer from public.notifications
  where type in (
    'service_request_created','quote_accepted','booking_created','booking_started',
    'booking_completion_requested','booking_completed','review_received','message_received'
  )), 8, 'all eight existing MOD-06 through MOD-10 event types remain available');
select is((select count(*)::integer from public.notifications), 10,
  'canonical records survive independently of any optional delivery channel');
select ok(
  to_regprocedure('public.create_service_request(uuid,uuid,text,text,double precision,double precision,date,time,numeric,text)') is not null
  and to_regprocedure('public.accept_service_request_quote(uuid,date,time)') is not null
  and to_regprocedure('public.start_booking(uuid)') is not null
  and to_regprocedure('public.create_booking_review(uuid,smallint,text)') is not null
  and to_regprocedure('public.send_conversation_message(uuid,uuid,text)') is not null,
  'notification-producing MOD-06 through MOD-10 transaction contracts remain present');
select is((select count(*)::integer from public.notifications
  where body ilike '%@%' or body ilike '%latitud%' or body ilike '%longitud%'), 0,
  'canonical previews contain no email or coordinate disclosure');
select is((select count(*)::integer from public.notifications
  where type = 'message_received' and body <> 'Recibiste un mensaje sobre una solicitud de servicio.'), 0,
  'message previews do not disclose user-authored message bodies');

select * from finish();
rollback;
