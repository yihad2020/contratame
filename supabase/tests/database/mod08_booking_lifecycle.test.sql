-- MOD-08 pgTAP suite. All booking lifecycle fixtures roll back.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(66);

-- Controlled contracts, grants and immutable storage boundaries.
select ok(to_regprocedure('public.start_booking(uuid)') is not null, 'worker start RPC exists');
select ok(to_regprocedure('public.request_booking_completion(uuid)') is not null, 'worker completion-request RPC exists');
select ok(to_regprocedure('public.confirm_booking_completion(uuid)') is not null, 'customer completion-confirmation RPC exists');
select ok(to_regprocedure('public.list_my_bookings(text,integer,integer)') is not null, 'participant booking list RPC exists');
select ok(to_regprocedure('public.get_my_booking(uuid)') is not null, 'participant booking detail RPC exists');
select ok((select bool_and(prosecdef) from pg_proc where oid in (
    'public.start_booking(uuid)'::regprocedure,
    'public.request_booking_completion(uuid)'::regprocedure,
    'public.confirm_booking_completion(uuid)'::regprocedure,
    'public.list_my_bookings(text,integer,integer)'::regprocedure,
    'public.get_my_booking(uuid)'::regprocedure
  )), 'all MOD-08 RPCs are SECURITY DEFINER');
select ok((select count(*) from pg_proc procedure, unnest(procedure.proconfig) setting
  where procedure.oid in (
    'public.start_booking(uuid)'::regprocedure,
    'public.request_booking_completion(uuid)'::regprocedure,
    'public.confirm_booking_completion(uuid)'::regprocedure,
    'public.list_my_bookings(text,integer,integer)'::regprocedure,
    'public.get_my_booking(uuid)'::regprocedure
  ) and setting = 'search_path=""') = 5, 'all MOD-08 RPCs pin an empty search_path');
select ok(has_function_privilege('authenticated', 'public.start_booking(uuid)', 'EXECUTE')
    and has_function_privilege('authenticated', 'public.request_booking_completion(uuid)', 'EXECUTE')
    and has_function_privilege('authenticated', 'public.confirm_booking_completion(uuid)', 'EXECUTE')
    and has_function_privilege('authenticated', 'public.list_my_bookings(text,integer,integer)', 'EXECUTE')
    and has_function_privilege('authenticated', 'public.get_my_booking(uuid)', 'EXECUTE'),
  'authenticated clients execute only controlled booking contracts');
select ok(not has_function_privilege('anon', 'public.start_booking(uuid)', 'EXECUTE')
    and not has_function_privilege('anon', 'public.request_booking_completion(uuid)', 'EXECUTE')
    and not has_function_privilege('anon', 'public.confirm_booking_completion(uuid)', 'EXECUTE')
    and not has_function_privilege('anon', 'public.list_my_bookings(text,integer,integer)', 'EXECUTE')
    and not has_function_privilege('anon', 'public.get_my_booking(uuid)', 'EXECUTE'),
  'anonymous clients cannot read or transition bookings through RPC');
select ok(not has_table_privilege('authenticated', 'public.bookings', 'UPDATE')
    and not has_table_privilege('authenticated', 'public.bookings', 'INSERT')
    and not has_table_privilege('authenticated', 'public.bookings', 'DELETE'),
  'authenticated clients cannot mutate bookings directly');
select ok(not has_table_privilege('authenticated', 'public.booking_status_history', 'INSERT')
    and not has_table_privilege('authenticated', 'public.booking_status_history', 'UPDATE')
    and not has_table_privilege('authenticated', 'public.booking_status_history', 'DELETE'),
  'authenticated clients cannot forge or alter booking history');
select ok(position('FOR UPDATE' in upper(pg_get_functiondef('public.start_booking(uuid)'::regprocedure))) > 0
    and position('FOR UPDATE' in upper(pg_get_functiondef('public.request_booking_completion(uuid)'::regprocedure))) > 0
    and position('FOR UPDATE' in upper(pg_get_functiondef('public.confirm_booking_completion(uuid)'::regprocedure))) > 0,
  'every transition locks the booking before state mutation');
select ok(not exists (
  select 1 from pg_proc procedure, unnest(procedure.proargnames) argument_name
  where procedure.oid in (
    'public.start_booking(uuid)'::regprocedure,
    'public.request_booking_completion(uuid)'::regprocedure,
    'public.confirm_booking_completion(uuid)'::regprocedure
  ) and argument_name in ('p_actor_id', 'p_profile_id', 'p_status', 'p_timestamp')
), 'transition signatures accept no actor, arbitrary status or client timestamp');

-- Confirmed participants and unrelated identities.
insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data)
values
  ('80000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'booking-customer-a@example.invalid', now(), '{"first_name":"Carla","last_name":"Cliente"}'::jsonb),
  ('80000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'booking-customer-b@example.invalid', now(), '{"first_name":"Bruno","last_name":"Ajeno"}'::jsonb),
  ('80000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'booking-unconfirmed@example.invalid', null, '{"first_name":"Usuario","last_name":"SinConfirmar"}'::jsonb),
  ('80000000-0000-4000-8000-000000000010', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'booking-worker-a@example.invalid', now(), '{"first_name":"Ana","last_name":"Profesional"}'::jsonb),
  ('80000000-0000-4000-8000-000000000011', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'booking-worker-b@example.invalid', now(), '{"first_name":"Omar","last_name":"Otro"}'::jsonb);

select set_config('request.jwt.claim.sub', '80000000-0000-4000-8000-000000000010', true);
insert into public.worker_profiles (id, profile_id, bio, years_experience, approval_status)
values ('81000000-0000-4000-8000-000000000010', '80000000-0000-4000-8000-000000000010',
  'Profesional aprobado asignado al ciclo de contrataciones de prueba.', 8, 'draft');
insert into public.worker_services (id, worker_id, category_id, title, description, pricing_type, price_bob, active)
values ('82000000-0000-4000-8000-000000000010', '81000000-0000-4000-8000-000000000010',
  '00000000-0000-4000-8000-000000000001', 'Instalación eléctrica', 'Instalación eléctrica residencial cotizada.', 'quote', null, true);

select set_config('request.jwt.claim.sub', '80000000-0000-4000-8000-000000000011', true);
insert into public.worker_profiles (id, profile_id, bio, years_experience, approval_status)
values ('81000000-0000-4000-8000-000000000011', '80000000-0000-4000-8000-000000000011',
  'Profesional ajeno para comprobar aislamiento de contrataciones privadas.', 5, 'draft');
insert into public.worker_services (id, worker_id, category_id, title, description, pricing_type, price_bob, active)
values ('82000000-0000-4000-8000-000000000011', '81000000-0000-4000-8000-000000000011',
  '00000000-0000-4000-8000-000000000001', 'Reparación eléctrica', 'Reparación asignada a un profesional distinto.', 'quote', null, true);

select set_config('request.jwt.claim.sub', '', true);
update public.worker_profiles set approval_status = 'approved'
where id in ('81000000-0000-4000-8000-000000000010', '81000000-0000-4000-8000-000000000011');

insert into public.service_requests (
  id, customer_profile_id, worker_id, worker_service_id, description,
  job_area_label, status
)
values
  ('83000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000010', '82000000-0000-4000-8000-000000000010', 'Trabajo principal para recorrer el ciclo completo.', 'Equipetrol', 'accepted'),
  ('83000000-0000-4000-8000-000000000002', '80000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000010', '82000000-0000-4000-8000-000000000010', 'Trabajo programado para transiciones inválidas.', 'Centro', 'accepted'),
  ('83000000-0000-4000-8000-000000000003', '80000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000010', '82000000-0000-4000-8000-000000000010', 'Trabajo ya completado para terminalidad.', 'Norte', 'accepted'),
  ('83000000-0000-4000-8000-000000000004', '80000000-0000-4000-8000-000000000002', '81000000-0000-4000-8000-000000000011', '82000000-0000-4000-8000-000000000011', 'Trabajo totalmente ajeno.', 'Sur', 'accepted'),
  ('83000000-0000-4000-8000-000000000005', '80000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000010', '82000000-0000-4000-8000-000000000010', 'Trabajo para comprobar rollback de notificación.', 'Este', 'accepted');

insert into public.service_request_locations (service_request_id, exact_location, address_text)
select request.id,
  extensions.st_setsrid(extensions.st_makepoint(-63.18, -17.78), 4326)::extensions.geography,
  'Dirección privada ' || right(request.id::text, 4)
from public.service_requests as request
where request.id::text like '83000000-0000-4000-8000-%';

insert into public.quotes (id, service_request_id, revision_number, amount_bob, message, status)
values
  ('84000000-0000-4000-8000-000000000001', '83000000-0000-4000-8000-000000000001', 1, 425.75, 'Cotización aceptada principal.', 'accepted'),
  ('84000000-0000-4000-8000-000000000002', '83000000-0000-4000-8000-000000000002', 1, 210, 'Cotización aceptada dos.', 'accepted'),
  ('84000000-0000-4000-8000-000000000003', '83000000-0000-4000-8000-000000000003', 1, 300, 'Cotización aceptada tres.', 'accepted'),
  ('84000000-0000-4000-8000-000000000004', '83000000-0000-4000-8000-000000000004', 1, 180, 'Cotización aceptada ajena.', 'accepted'),
  ('84000000-0000-4000-8000-000000000005', '83000000-0000-4000-8000-000000000005', 1, 510, 'Cotización aceptada rollback.', 'accepted');

insert into public.bookings (
  id, service_request_id, accepted_quote_id, customer_profile_id, worker_id,
  service_title_snapshot, agreed_price_bob, scheduled_at, status,
  started_at, completion_requested_at, completed_at
)
values
  ('85000000-0000-4000-8000-000000000001', '83000000-0000-4000-8000-000000000001', '84000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000010', 'Instalación eléctrica', 425.75, '2099-10-15 14:30:00+00', 'scheduled', null, null, null),
  ('85000000-0000-4000-8000-000000000002', '83000000-0000-4000-8000-000000000002', '84000000-0000-4000-8000-000000000002', '80000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000010', 'Instalación eléctrica', 210, '2099-10-16 14:30:00+00', 'scheduled', null, null, null),
  ('85000000-0000-4000-8000-000000000003', '83000000-0000-4000-8000-000000000003', '84000000-0000-4000-8000-000000000003', '80000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000010', 'Instalación eléctrica', 300, '2099-10-17 14:30:00+00', 'completed', now() - interval '3 hours', now() - interval '2 hours', now() - interval '1 hour'),
  ('85000000-0000-4000-8000-000000000004', '83000000-0000-4000-8000-000000000004', '84000000-0000-4000-8000-000000000004', '80000000-0000-4000-8000-000000000002', '81000000-0000-4000-8000-000000000011', 'Reparación eléctrica', 180, '2099-10-18 14:30:00+00', 'scheduled', null, null, null),
  ('85000000-0000-4000-8000-000000000005', '83000000-0000-4000-8000-000000000005', '84000000-0000-4000-8000-000000000005', '80000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000010', 'Instalación eléctrica', 510, '2099-10-19 14:30:00+00', 'scheduled', null, null, null);

insert into public.booking_status_history (booking_id, previous_status, new_status, changed_by_profile_id, created_at)
select booking.id, null, 'scheduled', booking.customer_profile_id, booking.created_at
from public.bookings as booking
where booking.id::text like '85000000-0000-4000-8000-%';
insert into public.booking_status_history (booking_id, previous_status, new_status, changed_by_profile_id, created_at)
values
  ('85000000-0000-4000-8000-000000000003', 'scheduled', 'in_progress', '80000000-0000-4000-8000-000000000010', now() - interval '3 hours'),
  ('85000000-0000-4000-8000-000000000003', 'in_progress', 'completion_pending', '80000000-0000-4000-8000-000000000010', now() - interval '2 hours'),
  ('85000000-0000-4000-8000-000000000003', 'completion_pending', 'completed', '80000000-0000-4000-8000-000000000001', now() - interval '1 hour');

-- Participant-only detail and location contract.
set local role authenticated;
select set_config('request.jwt.claim.sub', '80000000-0000-4000-8000-000000000001', true);
select is((select count(*)::integer from public.get_my_booking('85000000-0000-4000-8000-000000000001')),
  1, 'scheduled booking is readable by its customer participant');
select ok((select perspective = 'customer' and exact_latitude is not null and exact_longitude is not null
  from public.get_my_booking('85000000-0000-4000-8000-000000000001')),
  'customer detail returns participant perspective and exact job location');
select is((select booking_id from public.get_my_service_request('83000000-0000-4000-8000-000000000001')),
  '85000000-0000-4000-8000-000000000001'::uuid, 'request detail returns the actual booking id for handoff');
select set_config('request.jwt.claim.sub', '80000000-0000-4000-8000-000000000010', true);
select is((select count(*)::integer from public.get_my_booking('85000000-0000-4000-8000-000000000001')),
  1, 'scheduled booking is readable by its assigned worker');
select ok((select perspective = 'worker' and address_text is not null and exact_latitude is not null
  from public.get_my_booking('85000000-0000-4000-8000-000000000001')),
  'assigned worker receives only the authorized post-booking exact location');
select set_config('request.jwt.claim.sub', '80000000-0000-4000-8000-000000000002', true);
select is((select count(*)::integer from public.get_my_booking('85000000-0000-4000-8000-000000000001')),
  0, 'unrelated customer cannot read booking detail or location');
select set_config('request.jwt.claim.sub', '80000000-0000-4000-8000-000000000011', true);
select is((select count(*)::integer from public.get_my_booking('85000000-0000-4000-8000-000000000001')),
  0, 'unrelated worker cannot read booking detail or location');
select set_config('request.jwt.claim.sub', '80000000-0000-4000-8000-000000000003', true);
select throws_ok($sql$select * from public.get_my_booking('85000000-0000-4000-8000-000000000001')$sql$,
  '42501', 'active confirmed account required', 'unconfirmed account cannot read booking detail');

-- Deterministic, bounded participant lists.
select set_config('request.jwt.claim.sub', '80000000-0000-4000-8000-000000000001', true);
select is((select count(*)::integer from public.list_my_bookings('customer', 0, 2)), 2,
  'customer booking list obeys page limit');
select is((select min(total_count)::integer from public.list_my_bookings('customer', 0, 2)), 4,
  'customer booking list returns the complete participant count');
select is((select array_agg(booking_id order by scheduled_at desc, booking_id desc)
    from public.list_my_bookings('customer', 0, 2)),
  array['85000000-0000-4000-8000-000000000005'::uuid, '85000000-0000-4000-8000-000000000003'::uuid],
  'booking list order is deterministic by scheduled_at and id');
select is((select count(*)::integer from public.list_my_bookings('customer', 2, 2)), 2,
  'booking pagination returns the next page');
select throws_ok($sql$select * from public.list_my_bookings('admin', 0, 12)$sql$,
  '22023', 'perspective must be customer or worker', 'list rejects unsupported perspective');
select throws_ok($sql$select * from public.list_my_bookings('customer', 0, 21)$sql$,
  '22023', 'invalid booking pagination', 'list enforces maximum page size');
select set_config('request.jwt.claim.sub', '80000000-0000-4000-8000-000000000010', true);
select is((select count(*)::integer from public.list_my_bookings('worker', 0, 20)), 4,
  'assigned worker lists only its own four bookings');
select set_config('request.jwt.claim.sub', '80000000-0000-4000-8000-000000000011', true);
select is((select count(*)::integer from public.list_my_bookings('worker', 0, 20)), 1,
  'unrelated worker list contains only its own booking');

-- Direct writes and actor impersonation are blocked.
select set_config('request.jwt.claim.sub', '80000000-0000-4000-8000-000000000001', true);
select throws_ok($sql$update public.bookings set status = 'completed' where id = '85000000-0000-4000-8000-000000000001'$sql$,
  '42501', 'permission denied for table bookings', 'customer cannot directly update booking status');
select throws_ok($sql$insert into public.booking_status_history (booking_id, previous_status, new_status, changed_by_profile_id)
  values ('85000000-0000-4000-8000-000000000001', 'scheduled', 'completed', '80000000-0000-4000-8000-000000000001')$sql$,
  '42501', 'permission denied for table booking_status_history', 'customer cannot forge booking history');
select throws_ok($sql$select * from public.start_booking('85000000-0000-4000-8000-000000000001')$sql$,
  '42501', 'assigned worker required', 'customer cannot impersonate worker to start');
select set_config('request.jwt.claim.sub', '80000000-0000-4000-8000-000000000011', true);
select throws_ok($sql$select * from public.start_booking('85000000-0000-4000-8000-000000000001')$sql$,
  '42501', 'assigned worker required', 'unrelated worker cannot start the booking');
select set_config('request.jwt.claim.sub', '80000000-0000-4000-8000-000000000001', true);
select throws_ok($sql$select * from public.confirm_booking_completion('85000000-0000-4000-8000-000000000002')$sql$,
  '55000', 'booking is not pending completion', 'scheduled to completed transition is rejected');
select set_config('request.jwt.claim.sub', '80000000-0000-4000-8000-000000000010', true);
select throws_ok($sql$select * from public.request_booking_completion('85000000-0000-4000-8000-000000000002')$sql$,
  '55000', 'booking is not in progress', 'scheduled to completion_pending transition is rejected');

-- Successful exact lifecycle on booking 1.
select is((select booking_status from public.start_booking('85000000-0000-4000-8000-000000000001')),
  'in_progress', 'assigned worker performs scheduled to in_progress');
reset role;
select ok((select status = 'in_progress' and started_at is not null
    and completion_requested_at is null and completed_at is null
  from public.bookings where id = '85000000-0000-4000-8000-000000000001'),
  'start stores only the server-side started_at lifecycle timestamp');
select is((select count(*)::integer from public.booking_status_history where booking_id = '85000000-0000-4000-8000-000000000001'),
  2, 'start appends exactly one immutable history row');
select is((select count(*)::integer from public.notifications where type = 'booking_started'
    and profile_id = '80000000-0000-4000-8000-000000000001'
    and related_entity_id = '85000000-0000-4000-8000-000000000001'),
  1, 'start creates one persistent notification for the customer');
set local role authenticated;
select set_config('request.jwt.claim.sub', '80000000-0000-4000-8000-000000000010', true);
select throws_ok($sql$select * from public.start_booking('85000000-0000-4000-8000-000000000001')$sql$,
  '55000', 'booking is not scheduled', 'duplicate or stale start is rejected');
select set_config('request.jwt.claim.sub', '80000000-0000-4000-8000-000000000001', true);
select throws_ok($sql$select * from public.request_booking_completion('85000000-0000-4000-8000-000000000001')$sql$,
  '42501', 'assigned worker required', 'customer cannot request completion');
select set_config('request.jwt.claim.sub', '80000000-0000-4000-8000-000000000011', true);
select throws_ok($sql$select * from public.request_booking_completion('85000000-0000-4000-8000-000000000001')$sql$,
  '42501', 'assigned worker required', 'unrelated worker cannot request completion');
select set_config('request.jwt.claim.sub', '80000000-0000-4000-8000-000000000001', true);
select throws_ok($sql$select * from public.confirm_booking_completion('85000000-0000-4000-8000-000000000001')$sql$,
  '55000', 'booking is not pending completion', 'in_progress to completed transition is rejected');
select set_config('request.jwt.claim.sub', '80000000-0000-4000-8000-000000000010', true);
select is((select booking_status from public.request_booking_completion('85000000-0000-4000-8000-000000000001')),
  'completion_pending', 'assigned worker performs in_progress to completion_pending');
reset role;
select ok((select status = 'completion_pending' and started_at is not null
    and completion_requested_at is not null and completed_at is null
  from public.bookings where id = '85000000-0000-4000-8000-000000000001'),
  'completion request preserves start and stores server completion_requested_at');
select is((select count(*)::integer from public.booking_status_history where booking_id = '85000000-0000-4000-8000-000000000001'),
  3, 'completion request appends exactly one history row');
select is((select count(*)::integer from public.notifications where type = 'booking_completion_requested'
    and profile_id = '80000000-0000-4000-8000-000000000001'
    and related_entity_id = '85000000-0000-4000-8000-000000000001'),
  1, 'completion request notifies the customer once');
set local role authenticated;
select set_config('request.jwt.claim.sub', '80000000-0000-4000-8000-000000000010', true);
select throws_ok($sql$select * from public.request_booking_completion('85000000-0000-4000-8000-000000000001')$sql$,
  '55000', 'booking is not in progress', 'duplicate completion request is rejected');
select throws_ok($sql$select * from public.confirm_booking_completion('85000000-0000-4000-8000-000000000001')$sql$,
  '42501', 'booking customer required', 'worker cannot impersonate customer confirmation');
select set_config('request.jwt.claim.sub', '80000000-0000-4000-8000-000000000002', true);
select throws_ok($sql$select * from public.confirm_booking_completion('85000000-0000-4000-8000-000000000001')$sql$,
  '42501', 'booking customer required', 'unrelated customer cannot confirm completion');
select set_config('request.jwt.claim.sub', '80000000-0000-4000-8000-000000000001', true);
select is((select booking_status from public.confirm_booking_completion('85000000-0000-4000-8000-000000000001')),
  'completed', 'customer performs completion_pending to completed');
reset role;
select ok((select status = 'completed' and started_at is not null
    and completion_requested_at is not null and completed_at is not null
  from public.bookings where id = '85000000-0000-4000-8000-000000000001'),
  'confirmation preserves lifecycle timestamps and stores server completed_at');
select is((select count(*)::integer from public.booking_status_history where booking_id = '85000000-0000-4000-8000-000000000001'),
  4, 'confirmation appends exactly one history row');
select ok((select count(*) = 4
    and count(*) filter (where previous_status is null
      and new_status = 'scheduled'
      and changed_by_profile_id = '80000000-0000-4000-8000-000000000001') = 1
    and count(*) filter (where previous_status = 'scheduled'
      and new_status = 'in_progress'
      and changed_by_profile_id = '80000000-0000-4000-8000-000000000010') = 1
    and count(*) filter (where previous_status = 'in_progress'
      and new_status = 'completion_pending'
      and changed_by_profile_id = '80000000-0000-4000-8000-000000000010') = 1
    and count(*) filter (where previous_status = 'completion_pending'
      and new_status = 'completed'
      and changed_by_profile_id = '80000000-0000-4000-8000-000000000001') = 1
  from public.booking_status_history
  where booking_id = '85000000-0000-4000-8000-000000000001'),
  'history records every exact lifecycle edge once with the correct actor');
select is((select count(*)::integer from public.notifications where type = 'booking_completed'
    and profile_id = '80000000-0000-4000-8000-000000000010'
    and related_entity_id = '85000000-0000-4000-8000-000000000001'),
  1, 'completion notifies the assigned worker once');
set local role authenticated;
select set_config('request.jwt.claim.sub', '80000000-0000-4000-8000-000000000001', true);
select throws_ok($sql$select * from public.confirm_booking_completion('85000000-0000-4000-8000-000000000001')$sql$,
  '55000', 'booking is not pending completion', 'duplicate confirmation is rejected');
select set_config('request.jwt.claim.sub', '80000000-0000-4000-8000-000000000010', true);
select throws_ok($sql$select * from public.start_booking('85000000-0000-4000-8000-000000000001')$sql$,
  '55000', 'booking is not scheduled', 'completed booking cannot restart');
select throws_ok($sql$select * from public.request_booking_completion('85000000-0000-4000-8000-000000000001')$sql$,
  '55000', 'booking is not in progress', 'completed booking cannot request completion again');

-- Existing terminal fixture and accepted relationship remain immutable.
select throws_ok($sql$select * from public.start_booking('85000000-0000-4000-8000-000000000003')$sql$,
  '55000', 'booking is not scheduled', 'pre-existing completed booking is terminal');
reset role;
select ok((select booking.service_request_id = quote.service_request_id
    and booking.accepted_quote_id = quote.id
    and request.status = 'accepted' and quote.status = 'accepted'
  from public.bookings as booking
  join public.service_requests as request on request.id = booking.service_request_id
  join public.quotes as quote on quote.id = booking.accepted_quote_id
  where booking.id = '85000000-0000-4000-8000-000000000001'),
  'lifecycle transitions preserve accepted request quote and booking relationship');
select ok(position('bookings' in lower(pg_get_functiondef('public.search_marketplace_workers(text,uuid,text,text,double precision,double precision,integer,text,numeric,numeric,smallint,smallint,text,integer,integer)'::regprocedure))) = 0,
  'marketplace search remains isolated from booking data');
select ok(position('bookings' in lower(pg_get_functiondef('public.get_public_worker_profile(uuid)'::regprocedure))) = 0,
  'public worker profile remains isolated from booking and job-location data');

-- Failure in the final companion rolls back status, timestamp and history.
create or replace function private.mod08_test_fail_start_notification()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.type = 'booking_started' and new.related_entity_id = '85000000-0000-4000-8000-000000000005'::uuid then
    raise exception 'test booking start notification failure';
  end if;
  return new;
end;
$$;
create trigger mod08_test_fail_start_notification
  before insert on public.notifications
  for each row execute function private.mod08_test_fail_start_notification();

set local role authenticated;
select set_config('request.jwt.claim.sub', '80000000-0000-4000-8000-000000000010', true);
select throws_ok($sql$select * from public.start_booking('85000000-0000-4000-8000-000000000005')$sql$,
  'P0001', 'test booking start notification failure', 'notification failure aborts the whole transition');
reset role;
drop trigger mod08_test_fail_start_notification on public.notifications;
drop function private.mod08_test_fail_start_notification();
select ok((select status = 'scheduled' and started_at is null from public.bookings
  where id = '85000000-0000-4000-8000-000000000005'),
  'failed transition leaves booking status and timestamp unchanged');
select is((select count(*)::integer from public.booking_status_history
  where booking_id = '85000000-0000-4000-8000-000000000005'),
  1, 'failed transition leaves no partial history row');

-- Regression markers for the preceding modules.
select ok(to_regprocedure('public.accept_service_request_quote(uuid,date,time)') is not null
    and to_regprocedure('public.create_service_request(uuid,uuid,text,text,double precision,double precision,date,time,numeric,text)') is not null
    and to_regprocedure('public.get_public_worker_profile(uuid)') is not null
    and to_regprocedure('public.search_marketplace_workers(text,uuid,text,text,double precision,double precision,integer,text,numeric,numeric,smallint,smallint,text,integer,integer)') is not null,
  'MOD-04 through MOD-07 controlled contracts remain available');

select * from finish();
rollback;
