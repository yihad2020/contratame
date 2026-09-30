-- MOD-07 pgTAP suite. All quote, booking and participant fixtures roll back.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(80);

-- Frozen entities, constraints and controlled contracts.
select ok(to_regclass('public.quotes') is not null, 'quotes exists');
select ok(to_regclass('public.bookings') is not null, 'bookings exists');
select ok(to_regclass('public.booking_status_history') is not null, 'booking_status_history exists');
select ok(to_regprocedure('public.create_service_request_quote(uuid,numeric,text,date,time)') is not null,
  'controlled quote creation RPC exists');
select ok(to_regprocedure('public.list_my_service_request_quotes(uuid)') is not null,
  'participant quote-history RPC exists');
select ok(to_regprocedure('public.accept_service_request_quote(uuid,date,time)') is not null,
  'atomic quote acceptance RPC exists');
select ok((select bool_and(prosecdef) from pg_proc where oid in (
    'public.create_service_request_quote(uuid,numeric,text,date,time)'::regprocedure,
    'public.list_my_service_request_quotes(uuid)'::regprocedure,
    'public.accept_service_request_quote(uuid,date,time)'::regprocedure
  )), 'all MOD-07 RPCs are SECURITY DEFINER');
select ok(not exists (
  select 1 from pg_proc procedure, unnest(procedure.proconfig) setting
  where procedure.oid in (
    'public.create_service_request_quote(uuid,numeric,text,date,time)'::regprocedure,
    'public.list_my_service_request_quotes(uuid)'::regprocedure,
    'public.accept_service_request_quote(uuid,date,time)'::regprocedure
  ) and setting <> 'search_path=""'
) and (select count(*) from pg_proc procedure, unnest(procedure.proconfig) setting
  where procedure.oid in (
    'public.create_service_request_quote(uuid,numeric,text,date,time)'::regprocedure,
    'public.list_my_service_request_quotes(uuid)'::regprocedure,
    'public.accept_service_request_quote(uuid,date,time)'::regprocedure
  ) and setting = 'search_path=""') = 3, 'all MOD-07 RPCs pin an empty search_path');
select ok(has_function_privilege('authenticated', 'public.create_service_request_quote(uuid,numeric,text,date,time)', 'EXECUTE')
    and has_function_privilege('authenticated', 'public.list_my_service_request_quotes(uuid)', 'EXECUTE')
    and has_function_privilege('authenticated', 'public.accept_service_request_quote(uuid,date,time)', 'EXECUTE'),
  'authenticated clients execute the controlled contracts');
select ok(not has_function_privilege('anon', 'public.create_service_request_quote(uuid,numeric,text,date,time)', 'EXECUTE')
    and not has_function_privilege('anon', 'public.list_my_service_request_quotes(uuid)', 'EXECUTE')
    and not has_function_privilege('anon', 'public.accept_service_request_quote(uuid,date,time)', 'EXECUTE'),
  'anonymous clients cannot create, read or accept quotes through RPC');
select ok(not has_table_privilege('authenticated', 'public.quotes', 'INSERT')
    and not has_table_privilege('authenticated', 'public.quotes', 'UPDATE')
    and not has_table_privilege('authenticated', 'public.quotes', 'DELETE'),
  'authenticated clients cannot directly mutate quote content or status');
select ok(not has_table_privilege('authenticated', 'public.bookings', 'INSERT')
    and not has_table_privilege('authenticated', 'public.bookings', 'UPDATE')
    and not has_table_privilege('authenticated', 'public.bookings', 'DELETE')
    and not has_table_privilege('authenticated', 'public.booking_status_history', 'INSERT'),
  'authenticated clients cannot forge bookings or booking history');
select ok(not has_table_privilege('anon', 'public.quotes', 'SELECT')
    and not has_table_privilege('anon', 'public.bookings', 'SELECT')
    and not has_table_privilege('anon', 'public.booking_status_history', 'SELECT'),
  'anonymous clients cannot read MOD-07 tables');
select ok((select count(*) = 3 from pg_class class
  join pg_namespace namespace on namespace.oid = class.relnamespace
  where namespace.nspname = 'public'
    and class.relname in ('quotes', 'bookings', 'booking_status_history')
    and class.relrowsecurity), 'all MOD-07 tables have RLS enabled');
select ok(exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'quotes' and policyname = 'quotes_select_participants')
    and exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'bookings' and policyname = 'bookings_select_participants')
    and exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'booking_status_history' and policyname = 'booking_status_history_select_participants')
    and exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'service_request_locations' and policyname = 'service_request_locations_select_customer'),
  'participant and post-booking location policies exist');
select ok(exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'quotes_service_request_id_revision_number_key')
    and exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'quotes_one_pending_per_request_uidx')
    and exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'quotes_one_accepted_per_request_uidx'),
  'revision uniqueness and one-current/one-accepted constraints exist');
select ok(exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'bookings_service_request_id_key')
    and exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'bookings_accepted_quote_id_key'),
  'booking is unique by request and accepted quote');
select ok(not exists (
  select 1 from pg_proc procedure, unnest(procedure.proargnames) argument_name
  where procedure.oid = 'public.create_service_request_quote(uuid,numeric,text,date,time)'::regprocedure
    and argument_name in ('p_worker_id', 'p_revision_number', 'p_status')
), 'quote creation accepts no forgeable worker, revision or status');
select ok(not exists (
  select 1 from pg_proc procedure, unnest(procedure.proargnames) argument_name
  where procedure.oid = 'public.accept_service_request_quote(uuid,date,time)'::regprocedure
    and argument_name in ('p_customer_profile_id', 'p_scheduled_at', 'p_status')
), 'acceptance accepts no customer identity, client timestamp or status');
select ok(position('America/La_Paz' in pg_get_functiondef('public.accept_service_request_quote(uuid,date,time)'::regprocedure)) > 0,
  'backend constructs authoritative scheduling in America/La_Paz');
select ok(position('FOR UPDATE OF REQUEST' in upper(pg_get_functiondef('public.create_service_request_quote(uuid,numeric,text,date,time)'::regprocedure))) > 0
    and position('FOR UPDATE OF REQUEST' in upper(pg_get_functiondef('public.accept_service_request_quote(uuid,date,time)'::regprocedure))) > 0,
  'creation and acceptance serialize on the service request row');

-- Confirmed participants and their professional profiles.
insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data)
values
  ('70000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'quote-customer-a@example.invalid', now(), '{"first_name":"Carla","last_name":"Cliente"}'::jsonb),
  ('70000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'quote-customer-b@example.invalid', now(), '{"first_name":"Bruno","last_name":"Ajeno"}'::jsonb),
  ('70000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'quote-unconfirmed@example.invalid', null, '{"first_name":"Usuario","last_name":"SinConfirmar"}'::jsonb),
  ('70000000-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'quote-suspended@example.invalid', now(), '{"first_name":"Usuario","last_name":"Suspendido"}'::jsonb),
  ('70000000-0000-4000-8000-000000000010', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'quote-worker-a@example.invalid', now(), '{"first_name":"Ana","last_name":"Profesional"}'::jsonb),
  ('70000000-0000-4000-8000-000000000011', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'quote-worker-b@example.invalid', now(), '{"first_name":"Omar","last_name":"Otro"}'::jsonb);

update public.profiles set account_status = 'suspended'
where id = '70000000-0000-4000-8000-000000000004';

select set_config('request.jwt.claim.sub', '70000000-0000-4000-8000-000000000010', true);
insert into public.worker_profiles (id, profile_id, bio, years_experience, approval_status)
values ('71000000-0000-4000-8000-000000000010', '70000000-0000-4000-8000-000000000010',
  'Profesional aprobado que cotiza solicitudes directas con revisiones históricas.', 8, 'draft');
insert into public.worker_services (id, worker_id, category_id, title, description, pricing_type, price_bob, active)
values ('72000000-0000-4000-8000-000000000010', '71000000-0000-4000-8000-000000000010',
  '00000000-0000-4000-8000-000000000001', 'Instalación eléctrica', 'Instalación eléctrica residencial cotizada.', 'quote', null, true);

select set_config('request.jwt.claim.sub', '70000000-0000-4000-8000-000000000011', true);
insert into public.worker_profiles (id, profile_id, bio, years_experience, approval_status)
values ('71000000-0000-4000-8000-000000000011', '70000000-0000-4000-8000-000000000011',
  'Segundo profesional aprobado para comprobar aislamiento entre trabajadores.', 5, 'draft');
insert into public.worker_services (id, worker_id, category_id, title, description, pricing_type, price_bob, active)
values ('72000000-0000-4000-8000-000000000011', '71000000-0000-4000-8000-000000000011',
  '00000000-0000-4000-8000-000000000001', 'Reparación eléctrica', 'Reparación eléctrica perteneciente al segundo profesional.', 'quote', null, true);

select set_config('request.jwt.claim.sub', '', true);
update public.worker_profiles set approval_status = 'approved'
where id in ('71000000-0000-4000-8000-000000000010', '71000000-0000-4000-8000-000000000011');

insert into public.service_requests (
  id, customer_profile_id, worker_id, worker_service_id, description,
  preferred_date, preferred_time, budget_reference_bob, job_area_label, status, expires_at
)
values
  ('73000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000001', '71000000-0000-4000-8000-000000000010', '72000000-0000-4000-8000-000000000010', 'Solicitud principal con preferencias completas.', '2099-10-15', '10:30', 350, 'Equipetrol', 'pending', null),
  ('73000000-0000-4000-8000-000000000002', '70000000-0000-4000-8000-000000000002', '71000000-0000-4000-8000-000000000010', '72000000-0000-4000-8000-000000000010', 'Solicitud de otro cliente.', null, null, null, 'Centro', 'pending', null),
  ('73000000-0000-4000-8000-000000000003', '70000000-0000-4000-8000-000000000001', '71000000-0000-4000-8000-000000000011', '72000000-0000-4000-8000-000000000011', 'Solicitud para probar rollback atómico.', '2099-11-01', null, null, 'Norte', 'pending', null),
  ('73000000-0000-4000-8000-000000000004', '70000000-0000-4000-8000-000000000001', '71000000-0000-4000-8000-000000000010', '72000000-0000-4000-8000-000000000010', 'Solicitud cancelada.', null, null, null, 'Sur', 'cancelled', null),
  ('73000000-0000-4000-8000-000000000005', '70000000-0000-4000-8000-000000000001', '71000000-0000-4000-8000-000000000010', '72000000-0000-4000-8000-000000000010', 'Solicitud expirada.', null, null, null, 'Sur', 'expired', null),
  ('73000000-0000-4000-8000-000000000006', '70000000-0000-4000-8000-000000000001', '71000000-0000-4000-8000-000000000010', '72000000-0000-4000-8000-000000000010', 'Solicitud ya aceptada.', null, null, null, 'Sur', 'accepted', null),
  ('73000000-0000-4000-8000-000000000007', '70000000-0000-4000-8000-000000000001', '71000000-0000-4000-8000-000000000010', '72000000-0000-4000-8000-000000000010', 'Solicitud vencida por fecha.', null, null, null, 'Sur', 'pending', now() - interval '1 minute'),
  ('73000000-0000-4000-8000-000000000008', '70000000-0000-4000-8000-000000000001', '71000000-0000-4000-8000-000000000010', '72000000-0000-4000-8000-000000000010', 'Solicitud para cotización vencida.', null, null, null, 'Este', 'pending', null),
  ('73000000-0000-4000-8000-000000000009', '70000000-0000-4000-8000-000000000001', '71000000-0000-4000-8000-000000000010', '72000000-0000-4000-8000-000000000010', 'Solicitud rechazada.', null, null, null, 'Oeste', 'rejected', null);

insert into public.service_request_locations (service_request_id, exact_location, address_text)
select request.id,
  extensions.st_setsrid(extensions.st_makepoint(-63.18, -17.78), 4326)::extensions.geography,
  'Dirección privada ' || right(request.id::text, 4)
from public.service_requests as request
where request.id::text like '73000000-0000-4000-8000-%';

create temporary table mod07_created (label text primary key, id uuid not null);
grant select, insert, update, delete on mod07_created to authenticated;

-- First quote: actor, request, state and content are controlled server-side.
set local role authenticated;
select set_config('request.jwt.claim.sub', '70000000-0000-4000-8000-000000000010', true);
insert into mod07_created (label, id)
select 'request1-revision1', quote_id
from public.create_service_request_quote(
  '73000000-0000-4000-8000-000000000001', 350.50,
  E'  Incluye   materiales\n básicos.  ', '2099-10-10', '18:00'
);

reset role;
select is((select revision_number from public.quotes where id = (select id from mod07_created where label = 'request1-revision1')),
  1, 'target worker creates revision 1');
select is((select status from public.quotes where id = (select id from mod07_created where label = 'request1-revision1')),
  'pending', 'first quote is the current pending revision');
select is((select amount_bob from public.quotes where id = (select id from mod07_created where label = 'request1-revision1')),
  350.50::numeric, 'quote stores numeric BOB exactly');
select is((select message from public.quotes where id = (select id from mod07_created where label = 'request1-revision1')),
  'Incluye materiales básicos.', 'quote message is normalized without overwriting semantics');
select is((select status from public.service_requests where id = '73000000-0000-4000-8000-000000000001'),
  'quoted', 'first quote transitions pending request to quoted');
set local role authenticated;
select set_config('request.jwt.claim.sub', '70000000-0000-4000-8000-000000000010', true);
select is((select count(*)::integer from public.list_my_service_request_quotes('73000000-0000-4000-8000-000000000001')),
  1, 'target worker can read permitted quote history');

-- Location remains hidden from the worker before booking.
select ok((select exact_latitude is null and exact_longitude is null and address_text is null
  from public.get_my_service_request('73000000-0000-4000-8000-000000000001')),
  'worker cannot read exact request location before booking');

-- A revision creates a new immutable row and supersedes only the prior current row.
insert into mod07_created (label, id)
select 'request1-revision2', quote_id
from public.create_service_request_quote(
  '73000000-0000-4000-8000-000000000001', 425.75,
  'Revisión con alcance ampliado.', null, null
);
reset role;
select is((select revision_number from public.quotes where id = (select id from mod07_created where label = 'request1-revision2')),
  2, 'second quote receives deterministic revision 2');
select is((select status from public.quotes where id = (select id from mod07_created where label = 'request1-revision1')),
  'superseded', 'new revision supersedes the prior pending revision');
select is((select amount_bob from public.quotes where id = (select id from mod07_created where label = 'request1-revision1')),
  350.50::numeric, 'superseding does not overwrite historical amount');
select is((select message from public.quotes where id = (select id from mod07_created where label = 'request1-revision1')),
  'Incluye materiales básicos.', 'superseding does not overwrite historical message');
select is((select count(*)::integer from public.quotes where service_request_id = '73000000-0000-4000-8000-000000000001'),
  2, 'both quote revisions remain stored');
set local role authenticated;
select set_config('request.jwt.claim.sub', '70000000-0000-4000-8000-000000000010', true);
select is((select array_agg(revision_number order by revision_number desc)
  from public.list_my_service_request_quotes('73000000-0000-4000-8000-000000000001')),
  array[2,1], 'participant history returns deterministic newest-first order');
select is((select count(*)::integer from public.list_my_service_request_quotes('73000000-0000-4000-8000-000000000001') where is_current),
  1, 'history identifies exactly one latest revision');

-- Negative quote creation paths.
select set_config('request.jwt.claim.sub', '70000000-0000-4000-8000-000000000001', true);
select throws_ok($sql$select * from public.create_service_request_quote('73000000-0000-4000-8000-000000000001', 500)$sql$,
  '42501', 'target worker ownership required', 'customer cannot create a quote');
select set_config('request.jwt.claim.sub', '70000000-0000-4000-8000-000000000011', true);
select throws_ok($sql$select * from public.create_service_request_quote('73000000-0000-4000-8000-000000000001', 500)$sql$,
  '42501', 'target worker ownership required', 'unrelated worker cannot quote another worker request');
select set_config('request.jwt.claim.sub', '70000000-0000-4000-8000-000000000003', true);
select throws_ok($sql$select * from public.create_service_request_quote('73000000-0000-4000-8000-000000000001', 500)$sql$,
  '42501', 'active confirmed account required', 'unconfirmed account cannot quote');
select set_config('request.jwt.claim.sub', '70000000-0000-4000-8000-000000000004', true);
select throws_ok($sql$select * from public.create_service_request_quote('73000000-0000-4000-8000-000000000001', 500)$sql$,
  '42501', 'active confirmed account required', 'suspended account cannot quote');
select set_config('request.jwt.claim.sub', '70000000-0000-4000-8000-000000000010', true);
select throws_ok($sql$select * from public.create_service_request_quote('73000000-0000-4000-8000-000000000001', 0)$sql$,
  '22023', 'amount_bob must be positive with at most two decimals', 'zero quote money is rejected');
select throws_ok($sql$select * from public.create_service_request_quote('73000000-0000-4000-8000-000000000001', 10.999)$sql$,
  '22023', 'amount_bob must be positive with at most two decimals', 'quote money with more than two decimals is rejected');
select throws_ok($sql$select * from public.create_service_request_quote('73000000-0000-4000-8000-000000000001', 100, null, '2099-10-10', null)$sql$,
  '22023', 'validity date and time must be provided together', 'partial quote validity is rejected');
select throws_ok($sql$select * from public.create_service_request_quote('73000000-0000-4000-8000-000000000004', 100)$sql$,
  '55000', 'service request is not quotable', 'cancelled request cannot receive a quote');
select throws_ok($sql$select * from public.create_service_request_quote('73000000-0000-4000-8000-000000000005', 100)$sql$,
  '55000', 'service request is not quotable', 'expired-status request cannot receive a quote');
select throws_ok($sql$select * from public.create_service_request_quote('73000000-0000-4000-8000-000000000006', 100)$sql$,
  '55000', 'service request is not quotable', 'accepted request cannot receive a quote');
select throws_ok($sql$select * from public.create_service_request_quote('73000000-0000-4000-8000-000000000009', 100)$sql$,
  '55000', 'service request is not quotable', 'rejected request cannot receive a quote');
select throws_ok($sql$select * from public.create_service_request_quote('73000000-0000-4000-8000-000000000007', 100)$sql$,
  '55000', 'service request is not quotable', 'request past expires_at cannot receive a quote');

-- Create quotes for cross-request authorization and atomic rollback scenarios.
insert into mod07_created (label, id)
select 'request2-revision1', quote_id
from public.create_service_request_quote('73000000-0000-4000-8000-000000000002', 210, 'Cotización para cliente B');
select set_config('request.jwt.claim.sub', '70000000-0000-4000-8000-000000000011', true);
insert into mod07_created (label, id)
select 'request3-revision1', quote_id
from public.create_service_request_quote('73000000-0000-4000-8000-000000000003', 500, 'Cotización para rollback');
select set_config('request.jwt.claim.sub', '70000000-0000-4000-8000-000000000010', true);
insert into mod07_created (label, id)
select 'request8-revision1', quote_id
from public.create_service_request_quote('73000000-0000-4000-8000-000000000008', 175, 'Cotización que vencerá');

reset role;
update public.quotes set valid_until = now() - interval '1 minute'
where id = (select id from mod07_created where label = 'request8-revision1');
set local role authenticated;

-- Participant-only history.
select set_config('request.jwt.claim.sub', '70000000-0000-4000-8000-000000000001', true);
select is((select count(*)::integer from public.list_my_service_request_quotes('73000000-0000-4000-8000-000000000001')),
  2, 'owner customer sees complete quote history');
select set_config('request.jwt.claim.sub', '70000000-0000-4000-8000-000000000002', true);
select throws_ok($sql$select * from public.list_my_service_request_quotes('73000000-0000-4000-8000-000000000001')$sql$,
  '42501', 'service request participation required', 'unrelated customer cannot read quote history');

-- Direct mutation remains unavailable even to a participant.
select set_config('request.jwt.claim.sub', '70000000-0000-4000-8000-000000000010', true);
select throws_ok($sql$update public.quotes set amount_bob = 1 where id = '00000000-0000-0000-0000-000000000000'$sql$,
  '42501', 'permission denied for table quotes', 'worker cannot rewrite historical quote content directly');
select throws_ok($sql$delete from public.quotes where id = '00000000-0000-0000-0000-000000000000'$sql$,
  '42501', 'permission denied for table quotes', 'worker cannot delete quote history directly');
select throws_ok($sql$update public.service_requests set status = 'accepted' where id = '73000000-0000-4000-8000-000000000001'$sql$,
  '42501', 'permission denied for table service_requests', 'normal client cannot directly manipulate request status');

-- Acceptance rejects stale, wrong-actor, cross-request, incomplete and expired inputs.
select set_config('request.jwt.claim.sub', '70000000-0000-4000-8000-000000000001', true);
select throws_ok(format(
  'select * from public.accept_service_request_quote(%L, %L, %L)',
  (select id from mod07_created where label = 'request1-revision1'), '2099-10-15', '10:30'
), '55000', 'quote is not current and acceptable', 'superseded revision cannot be accepted');
select set_config('request.jwt.claim.sub', '70000000-0000-4000-8000-000000000010', true);
select throws_ok(format(
  'select * from public.accept_service_request_quote(%L, %L, %L)',
  (select id from mod07_created where label = 'request1-revision2'), '2099-10-15', '10:30'
), '42501', 'request customer ownership required', 'worker cannot accept a quote');
select set_config('request.jwt.claim.sub', '70000000-0000-4000-8000-000000000001', true);
select throws_ok(format(
  'select * from public.accept_service_request_quote(%L, %L, %L)',
  (select id from mod07_created where label = 'request2-revision1'), '2099-10-15', '10:30'
), '42501', 'request customer ownership required', 'customer cannot accept a quote belonging to another customer request');
select throws_ok(format(
  'select * from public.accept_service_request_quote(%L, null, %L)',
  (select id from mod07_created where label = 'request1-revision2'), '10:30'
), '22023', 'quote and complete final schedule are required', 'acceptance requires a complete final schedule');
select throws_ok(format(
  'select * from public.accept_service_request_quote(%L, %L, %L)',
  (select id from mod07_created where label = 'request1-revision2'), '2020-01-01', '10:30'
), '22023', 'scheduled_at must be in the future', 'acceptance rejects a past final schedule');
select throws_ok(format(
  'select * from public.accept_service_request_quote(%L, %L, %L)',
  (select id from mod07_created where label = 'request8-revision1'), '2099-10-15', '10:30'
), '55000', 'quote is not current and acceptable', 'expired current quote cannot be accepted');

-- Successful acceptance and frozen booking handoff.
insert into mod07_created (label, id)
select 'request1-booking', booking_id
from public.accept_service_request_quote(
  (select id from mod07_created where label = 'request1-revision2'),
  '2099-10-15', '10:30'
);

reset role;
select is((select status from public.quotes where id = (select id from mod07_created where label = 'request1-revision2')),
  'accepted', 'customer accepts the valid current quote');
select is((select status from public.service_requests where id = '73000000-0000-4000-8000-000000000001'),
  'accepted', 'acceptance transitions the request to accepted');
select is((select count(*)::integer from public.bookings where service_request_id = '73000000-0000-4000-8000-000000000001'),
  1, 'acceptance creates exactly one booking');
select ok((select accepted_quote_id = (select id from mod07_created where label = 'request1-revision2')
    and customer_profile_id = '70000000-0000-4000-8000-000000000001'
    and worker_id = '71000000-0000-4000-8000-000000000010'
    and status = 'scheduled'
  from public.bookings where id = (select id from mod07_created where label = 'request1-booking')),
  'booking preserves the accepted quote and participant identities');
select is((select agreed_price_bob from public.bookings where id = (select id from mod07_created where label = 'request1-booking')),
  425.75::numeric, 'booking snapshots the accepted quote amount');
select is((select service_title_snapshot from public.bookings where id = (select id from mod07_created where label = 'request1-booking')),
  'Instalación eléctrica', 'booking snapshots the service title');
select is((select scheduled_at from public.bookings where id = (select id from mod07_created where label = 'request1-booking')),
  '2099-10-15 14:30:00+00'::timestamptz, 'backend interprets 10:30 in America/La_Paz and stores timestamptz');
select ok((select preferred_date = '2099-10-15'::date and preferred_time = '10:30'::time
  from public.service_requests where id = '73000000-0000-4000-8000-000000000001'),
  'acceptance preserves original request preference fields unchanged');
select ok((select count(*) = 1 and bool_and(previous_status is null) and min(new_status) = 'scheduled'
    and min(changed_by_profile_id::text) = '70000000-0000-4000-8000-000000000001'
  from public.booking_status_history where booking_id = (select id from mod07_created where label = 'request1-booking')),
  'acceptance creates the first scheduled booking history row with customer actor');
select is((select count(*)::integer from public.notifications
  where related_entity_type = 'booking' and related_entity_id = (select id from mod07_created where label = 'request1-booking')),
  2, 'acceptance creates persistent participant notifications atomically');
select is((select count(*)::integer from public.quotes
  where service_request_id = '73000000-0000-4000-8000-000000000001' and status = 'accepted'),
  1, 'only one accepted quote exists for the request');
set local role authenticated;
select set_config('request.jwt.claim.sub', '70000000-0000-4000-8000-000000000001', true);
select ok((select booking_id = (select id from mod07_created where label = 'request1-booking')
    and scheduled_at = '2099-10-15 14:30:00+00'::timestamptz
  from public.list_my_service_request_quotes('73000000-0000-4000-8000-000000000001')
  where quote_status = 'accepted'), 'quote history returns minimal booking handoff data');
select ok((select exact_latitude is not null and exact_longitude is not null and address_text is not null
  from public.get_my_service_request('73000000-0000-4000-8000-000000000001')),
  'customer keeps access to exact request location after booking');

select throws_ok(format(
  'select * from public.accept_service_request_quote(%L, %L, %L)',
  (select id from mod07_created where label = 'request1-revision2'), '2099-10-16', '11:00'
), '55000', 'service request is not accepting quotes', 'duplicate acceptance is prevented');

select set_config('request.jwt.claim.sub', '70000000-0000-4000-8000-000000000010', true);
select ok((select exact_latitude is not null and exact_longitude is not null and address_text is not null
  from public.get_my_service_request('73000000-0000-4000-8000-000000000001')),
  'target worker gains exact location access only after booking');
select throws_ok($sql$select * from public.create_service_request_quote('73000000-0000-4000-8000-000000000001', 600)$sql$,
  '55000', 'service request is not quotable', 'accepted quote cannot be replaced by another revision');

-- Force failure in the last acceptance companion to prove full statement rollback.
reset role;
create or replace function private.mod07_test_fail_acceptance_notification()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.type = 'quote_accepted' and new.related_entity_type = 'booking' then
    raise exception 'test quote acceptance notification failure';
  end if;
  return new;
end;
$$;
create trigger mod07_test_fail_acceptance_notification
  before insert on public.notifications
  for each row execute function private.mod07_test_fail_acceptance_notification();

set local role authenticated;
select set_config('request.jwt.claim.sub', '70000000-0000-4000-8000-000000000001', true);
select throws_ok(format(
  'select * from public.accept_service_request_quote(%L, %L, %L)',
  (select id from mod07_created where label = 'request3-revision1'), '2099-11-01', '09:00'
), 'P0001', 'test quote acceptance notification failure', 'failure in booking handoff aborts acceptance');

reset role;
drop trigger mod07_test_fail_acceptance_notification on public.notifications;
drop function private.mod07_test_fail_acceptance_notification();
select is((select status from public.quotes where id = (select id from mod07_created where label = 'request3-revision1')),
  'pending', 'failed acceptance leaves quote unaccepted');
select is((select status from public.service_requests where id = '73000000-0000-4000-8000-000000000003'),
  'quoted', 'failed acceptance leaves request quoted');
select is((select count(*)::integer from public.bookings where service_request_id = '73000000-0000-4000-8000-000000000003'),
  0, 'failed acceptance leaves no partial booking');
select is((select count(*)::integer from public.booking_status_history history
  join public.bookings booking on booking.id = history.booking_id
  where booking.service_request_id = '73000000-0000-4000-8000-000000000003'),
  0, 'failed acceptance leaves no partial status history');

-- Normal direct inserts cannot bypass the controlled booking contract.
set local role authenticated;
select set_config('request.jwt.claim.sub', '70000000-0000-4000-8000-000000000001', true);
select throws_ok($sql$insert into public.bookings (
  service_request_id, accepted_quote_id, customer_profile_id, worker_id,
  service_title_snapshot, agreed_price_bob, scheduled_at, status
) values (
  '73000000-0000-4000-8000-000000000003',
  '00000000-0000-0000-0000-000000000001',
  '70000000-0000-4000-8000-000000000001',
  '71000000-0000-4000-8000-000000000011',
  'Forjado', 1, now() + interval '1 day', 'scheduled'
)$sql$, '42501', 'permission denied for table bookings', 'customer cannot forge booking handoff directly');

reset role;
select * from finish();
rollback;
