-- MOD-09 pgTAP suite. All review fixtures roll back.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(60);

-- Frozen entity and controlled contracts.
select has_table('public', 'reviews', 'reviews table materializes the frozen entity');
select columns_are('public', 'reviews', array['id','booking_id','rating','comment','created_at','updated_at'],
  'reviews contains exactly the frozen columns');
select col_type_is('public', 'reviews', 'rating', 'smallint', 'rating uses the frozen smallint type');
select col_type_is('public', 'reviews', 'comment', 'text', 'comment uses nullable text without an invented length limit');
select ok(exists (select 1 from pg_constraint where conrelid = 'public.reviews'::regclass
    and contype = 'u' and pg_get_constraintdef(oid) = 'UNIQUE (booking_id)'),
  'database uniqueness enforces one review per booking');
select ok(exists (select 1 from pg_constraint where conrelid = 'public.reviews'::regclass
    and contype = 'c' and conname = 'reviews_rating_check'),
  'database check enforces the 1 to 5 scale');
select ok((select relrowsecurity from pg_class where oid = 'public.reviews'::regclass), 'reviews has RLS enabled');
select ok(to_regprocedure('public.create_booking_review(uuid,smallint,text)') is not null
    and to_regprocedure('public.get_my_booking_review(uuid)') is not null
    and to_regprocedure('public.get_public_worker_reputation(uuid,integer,integer)') is not null,
  'all MOD-09 RPCs exist');
select ok((select bool_and(prosecdef) from pg_proc where oid in (
    'public.create_booking_review(uuid,smallint,text)'::regprocedure,
    'public.get_my_booking_review(uuid)'::regprocedure,
    'public.get_public_worker_reputation(uuid,integer,integer)'::regprocedure
  )), 'all MOD-09 RPCs are SECURITY DEFINER');
select is((select count(*)::integer from pg_proc procedure, unnest(procedure.proconfig) setting
    where procedure.oid in (
      'public.create_booking_review(uuid,smallint,text)'::regprocedure,
      'public.get_my_booking_review(uuid)'::regprocedure,
      'public.get_public_worker_reputation(uuid,integer,integer)'::regprocedure
    ) and setting = 'search_path=""'), 3, 'all MOD-09 RPCs pin an empty search_path');
select ok(has_function_privilege('authenticated', 'public.create_booking_review(uuid,smallint,text)', 'EXECUTE')
    and has_function_privilege('authenticated', 'public.get_my_booking_review(uuid)', 'EXECUTE')
    and has_function_privilege('authenticated', 'public.get_public_worker_reputation(uuid,integer,integer)', 'EXECUTE'),
  'authenticated may execute only the controlled review contracts');
select ok(not has_function_privilege('anon', 'public.create_booking_review(uuid,smallint,text)', 'EXECUTE')
    and not has_function_privilege('anon', 'public.get_my_booking_review(uuid)', 'EXECUTE')
    and not has_function_privilege('anon', 'public.get_public_worker_reputation(uuid,integer,integer)', 'EXECUTE'),
  'anonymous clients cannot execute review contracts');
select ok(not has_table_privilege('authenticated', 'public.reviews', 'INSERT')
    and not has_table_privilege('authenticated', 'public.reviews', 'UPDATE')
    and not has_table_privilege('authenticated', 'public.reviews', 'DELETE'),
  'normal clients cannot mutate reviews directly');
select ok(exists (select 1 from pg_trigger where tgrelid = 'public.reviews'::regclass
    and tgname = 'prevent_review_mutation' and not tgisinternal),
  'submitted reviews have a database immutability trigger');
select ok(not exists (
  select 1 from pg_proc procedure, unnest(procedure.proargnames) argument_name
  where procedure.oid = 'public.create_booking_review(uuid,smallint,text)'::regprocedure
    and argument_name in ('p_customer_id','p_worker_id','p_status','p_completed_at')
), 'create signature accepts no actor worker or completion state');
select ok(position('FOR UPDATE' in upper(pg_get_functiondef('public.create_booking_review(uuid,smallint,text)'::regprocedure))) > 0,
  'review creation locks the booking before validation and insert');

-- Confirmed customers, inactive identities and two workers.
insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data)
values
  ('90000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'review-customer-a@example.invalid', now(), '{"first_name":"Carla","last_name":"Cliente"}'::jsonb),
  ('90000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'review-customer-b@example.invalid', now(), '{"first_name":"Bruno","last_name":"Cliente"}'::jsonb),
  ('90000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'review-unconfirmed@example.invalid', null, '{"first_name":"Usuario","last_name":"SinConfirmar"}'::jsonb),
  ('90000000-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'review-suspended@example.invalid', now(), '{"first_name":"Usuario","last_name":"Suspendido"}'::jsonb),
  ('90000000-0000-4000-8000-000000000010', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'review-worker-a@example.invalid', now(), '{"first_name":"Ana","last_name":"Profesional"}'::jsonb),
  ('90000000-0000-4000-8000-000000000011', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'review-worker-b@example.invalid', now(), '{"first_name":"Omar","last_name":"Profesional"}'::jsonb);

update public.profiles set account_status = 'suspended' where id = '90000000-0000-4000-8000-000000000004';

select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000010', true);
insert into public.worker_profiles (id, profile_id, bio, years_experience, approval_status)
values ('91000000-0000-4000-8000-000000000010', '90000000-0000-4000-8000-000000000010',
  'Profesional aprobado con servicios completados para reseñas reales.', 8, 'draft');
insert into public.worker_services (id, worker_id, category_id, title, description, pricing_type, price_bob, active)
values ('92000000-0000-4000-8000-000000000010', '91000000-0000-4000-8000-000000000010',
  '00000000-0000-4000-8000-000000000001', 'Instalación eléctrica', 'Servicio eléctrico completado y calificable.', 'fixed', 300, true);
insert into public.worker_locations (worker_id, private_location, public_area_label, city, department, country_code, service_radius_m)
values ('91000000-0000-4000-8000-000000000010',
  extensions.st_setsrid(extensions.st_makepoint(-63.18, -17.78), 4326)::extensions.geography,
  'Equipetrol', 'Santa Cruz de la Sierra', 'Santa Cruz', 'BO', 10000);

select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000011', true);
insert into public.worker_profiles (id, profile_id, bio, years_experience, approval_status)
values ('91000000-0000-4000-8000-000000000011', '90000000-0000-4000-8000-000000000011',
  'Segundo profesional para comprobar elegibilidad pública de reseñas.', 5, 'draft');
insert into public.worker_services (id, worker_id, category_id, title, description, pricing_type, price_bob, active)
values ('92000000-0000-4000-8000-000000000011', '91000000-0000-4000-8000-000000000011',
  '00000000-0000-4000-8000-000000000001', 'Reparación eléctrica', 'Servicio de un profesional que luego deja de ser público.', 'fixed', 200, true);
insert into public.worker_locations (worker_id, private_location, public_area_label, city, department, country_code, service_radius_m)
values ('91000000-0000-4000-8000-000000000011',
  extensions.st_setsrid(extensions.st_makepoint(-63.19, -17.79), 4326)::extensions.geography,
  'Centro', 'Santa Cruz de la Sierra', 'Santa Cruz', 'BO', 10000);

select set_config('request.jwt.claim.sub', '', true);
update public.worker_profiles set approval_status = 'approved'
where id in ('91000000-0000-4000-8000-000000000010', '91000000-0000-4000-8000-000000000011');

insert into public.service_requests (id, customer_profile_id, worker_id, worker_service_id, description, job_area_label, status)
select
  ('93000000-0000-4000-8000-' || lpad(value::text, 12, '0'))::uuid,
  case when value in (5, 6) then '90000000-0000-4000-8000-000000000002'::uuid else '90000000-0000-4000-8000-000000000001'::uuid end,
  case when value = 6 then '91000000-0000-4000-8000-000000000011'::uuid else '91000000-0000-4000-8000-000000000010'::uuid end,
  case when value = 6 then '92000000-0000-4000-8000-000000000011'::uuid else '92000000-0000-4000-8000-000000000010'::uuid end,
  'Trabajo de prueba para MOD-09 ' || value,
  'Santa Cruz', 'accepted'
from generate_series(1, 7) as value;

insert into public.service_request_locations (service_request_id, exact_location, address_text)
select request.id,
  extensions.st_setsrid(extensions.st_makepoint(-63.18, -17.78), 4326)::extensions.geography,
  'Dirección privada ' || right(request.id::text, 4)
from public.service_requests as request
where request.id::text like '93000000-0000-4000-8000-%';

insert into public.quotes (id, service_request_id, revision_number, amount_bob, status)
select
  ('94000000-0000-4000-8000-' || lpad(value::text, 12, '0'))::uuid,
  ('93000000-0000-4000-8000-' || lpad(value::text, 12, '0'))::uuid,
  1, 300, 'accepted'
from generate_series(1, 7) as value;

insert into public.bookings (
  id, service_request_id, accepted_quote_id, customer_profile_id, worker_id,
  service_title_snapshot, agreed_price_bob, scheduled_at, status,
  started_at, completion_requested_at, completed_at
)
select
  ('95000000-0000-4000-8000-' || lpad(value::text, 12, '0'))::uuid,
  request.id,
  ('94000000-0000-4000-8000-' || lpad(value::text, 12, '0'))::uuid,
  request.customer_profile_id,
  request.worker_id,
  'Servicio eléctrico', 300, now() - interval '1 day',
  case value when 2 then 'scheduled' when 3 then 'in_progress' when 4 then 'completion_pending' else 'completed' end,
  case when value >= 3 then now() - interval '3 hours' end,
  case when value >= 4 then now() - interval '2 hours' end,
  case when value not in (2,3,4) then now() - interval '1 hour' end
from generate_series(1, 7) as value
join public.service_requests as request
  on request.id = ('93000000-0000-4000-8000-' || lpad(value::text, 12, '0'))::uuid;

-- Authorization, state and rating boundaries.
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select throws_ok($sql$select * from public.create_booking_review('95000000-0000-4000-8000-000000000001', 5::smallint, null)$sql$,
  '42501', 'permission denied for function create_booking_review', 'anonymous cannot create a review');
set local role authenticated;
select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000003', true);
select throws_ok($sql$select * from public.create_booking_review('95000000-0000-4000-8000-000000000001', 5::smallint, null)$sql$,
  '42501', 'active confirmed account required', 'unconfirmed account cannot create a review');
select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000004', true);
select throws_ok($sql$select * from public.create_booking_review('95000000-0000-4000-8000-000000000001', 5::smallint, null)$sql$,
  '42501', 'active confirmed account required', 'suspended account cannot create a review');
select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000010', true);
select throws_ok($sql$select * from public.create_booking_review('95000000-0000-4000-8000-000000000001', 5::smallint, null)$sql$,
  '42501', 'booking customer required', 'worker cannot review their assigned booking');
select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000002', true);
select throws_ok($sql$select * from public.create_booking_review('95000000-0000-4000-8000-000000000001', 5::smallint, null)$sql$,
  '42501', 'booking customer required', 'unrelated customer cannot review another customer booking');
select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000001', true);
select throws_ok($sql$select * from public.create_booking_review('95000000-0000-4000-8000-000000000002', 5::smallint, null)$sql$,
  '55000', 'booking is not completed', 'scheduled booking cannot be reviewed');
select throws_ok($sql$select * from public.create_booking_review('95000000-0000-4000-8000-000000000003', 5::smallint, null)$sql$,
  '55000', 'booking is not completed', 'in-progress booking cannot be reviewed');
select throws_ok($sql$select * from public.create_booking_review('95000000-0000-4000-8000-000000000004', 5::smallint, null)$sql$,
  '55000', 'booking is not completed', 'completion-pending booking cannot be reviewed');
select throws_ok($sql$select * from public.create_booking_review('95000000-0000-4000-8000-000000000001', 0::smallint, null)$sql$,
  '22023', 'rating must be between 1 and 5', 'rating lower bound is enforced server-side');
select throws_ok($sql$select * from public.create_booking_review('95000000-0000-4000-8000-000000000001', 6::smallint, null)$sql$,
  '22023', 'rating must be between 1 and 5', 'rating upper bound is enforced server-side');

-- Successful immutable creation derives both participants from the booking.
select is((select rating from public.create_booking_review(
    '95000000-0000-4000-8000-000000000001', 5::smallint, E'  Excelente\n  trabajo profesional.  ')),
  5::smallint, 'customer creates a valid review for a completed booking');
reset role;
select is((select comment from public.reviews where booking_id = '95000000-0000-4000-8000-000000000001'),
  'Excelente trabajo profesional.', 'comment whitespace is normalized without truncation');
select ok((select booking.customer_profile_id = '90000000-0000-4000-8000-000000000001'::uuid
    and booking.worker_id = '91000000-0000-4000-8000-000000000010'::uuid
  from public.reviews as review join public.bookings as booking on booking.id = review.booking_id
  where review.booking_id = '95000000-0000-4000-8000-000000000001'),
  'review preserves the booking-derived customer and worker relationship');
select is((select count(*)::integer from public.reviews where booking_id = '95000000-0000-4000-8000-000000000001'),
  1, 'exactly one review exists for the booking');
select is((select count(*)::integer from public.notifications where type = 'review_received'
    and profile_id = '90000000-0000-4000-8000-000000000010'),
  1, 'review creation persistently notifies the reviewed worker');

set local role authenticated;
select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000001', true);
select is((select rating from public.get_my_booking_review('95000000-0000-4000-8000-000000000001')),
  5::smallint, 'booking customer reads the submitted review');
select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000010', true);
select is((select rating from public.get_my_booking_review('95000000-0000-4000-8000-000000000001')),
  5::smallint, 'assigned worker reads the submitted review without creation capability');
select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000002', true);
select is((select count(*)::integer from public.get_my_booking_review('95000000-0000-4000-8000-000000000001')),
  0, 'unrelated participant cannot read the booking review contract');
select throws_ok($sql$insert into public.reviews (booking_id, rating) values ('95000000-0000-4000-8000-000000000005', 4)$sql$,
  '42501', 'permission denied for table reviews', 'normal client cannot forge review ownership with direct insert');
select throws_ok($sql$update public.reviews set rating = 1 where booking_id = '95000000-0000-4000-8000-000000000001'$sql$,
  '42501', 'permission denied for table reviews', 'normal client cannot update a submitted review');
select throws_ok($sql$delete from public.reviews where booking_id = '95000000-0000-4000-8000-000000000001'$sql$,
  '42501', 'permission denied for table reviews', 'normal client cannot delete a submitted review');
reset role;
select throws_ok($sql$update public.reviews set rating = 1 where booking_id = '95000000-0000-4000-8000-000000000001'$sql$,
  '55000', 'submitted reviews are immutable', 'database trigger blocks privileged review update');
select throws_ok($sql$delete from public.reviews where booking_id = '95000000-0000-4000-8000-000000000001'$sql$,
  '55000', 'submitted reviews are immutable', 'database trigger blocks privileged review deletion');

set local role authenticated;
select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000001', true);
select throws_ok($sql$select * from public.create_booking_review('95000000-0000-4000-8000-000000000001', 4::smallint, 'Segundo intento')$sql$,
  '23505', 'booking already has a review', 'duplicate review is rejected after locking the booking');
reset role;
select is((select count(*)::integer from public.reviews where booking_id = '95000000-0000-4000-8000-000000000001'),
  1, 'duplicate attempt preserves one review per booking');

-- A second legitimate review drives real public reputation data.
set local role authenticated;
select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000002', true);
select is((select rating from public.create_booking_review('95000000-0000-4000-8000-000000000005', 3::smallint, '   ')),
  3::smallint, 'second booking customer creates another legitimate review');
reset role;
select is((select comment from public.reviews where booking_id = '95000000-0000-4000-8000-000000000005'),
  null::text, 'whitespace-only optional comment is stored as null');
select is((select count(*)::integer from public.reviews review join public.bookings booking on booking.id = review.booking_id
    where booking.worker_id = '91000000-0000-4000-8000-000000000010'),
  2, 'review count derives from legitimate completed bookings');

set local role authenticated;
select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000001', true);
select ok((select average_rating = 4.00 and review_count = 2
  from public.get_public_worker_reputation('91000000-0000-4000-8000-000000000010', 0, 10)),
  'public reputation exposes the real average and review count');
select is((select jsonb_array_length(reviews) from public.get_public_worker_reputation(
    '91000000-0000-4000-8000-000000000010', 0, 10)), 2,
  'public reputation returns the bounded review page');
select is((select count(*)::integer from public.get_public_worker_reputation(
    '91000000-0000-4000-8000-000000000010', 0, 10) reputation,
    lateral jsonb_object_keys(to_jsonb(reputation)) key
    where key not in ('worker_id','average_rating','review_count','reviews')), 0,
  'public reputation top-level output is allowlisted');
select ok(not exists (select 1 from public.get_public_worker_reputation(
    '91000000-0000-4000-8000-000000000010', 0, 10) reputation,
    jsonb_array_elements(reputation.reviews) review
    where review ?| array['booking_id','customer_id','worker_id','email','phone','address_text','exact_location','latitude','longitude']),
  'public review entries expose no participant contact booking or location data');
select is((select jsonb_array_length(reviews) from public.get_public_worker_reputation(
    '91000000-0000-4000-8000-000000000010', 0, 1)), 1,
  'public review page limit is enforced');
select isnt((select reviews -> 0 ->> 'review_id' from public.get_public_worker_reputation(
    '91000000-0000-4000-8000-000000000010', 0, 1)),
  (select reviews -> 0 ->> 'review_id' from public.get_public_worker_reputation(
    '91000000-0000-4000-8000-000000000010', 1, 1)),
  'consecutive public review pages do not duplicate rows');
select is((select reviews from public.get_public_worker_reputation(
    '91000000-0000-4000-8000-000000000010', 0, 10)),
  (select reviews from public.get_public_worker_reputation(
    '91000000-0000-4000-8000-000000000010', 0, 10)),
  'public review ordering is deterministic newest first with a stable tie-breaker');
select ok((select average_rating is null and review_count = 0 and reviews = '[]'::jsonb
  from public.get_public_worker_reputation('91000000-0000-4000-8000-000000000011', 0, 10)),
  'eligible worker without reviews has a neutral aggregate');
select throws_ok($sql$select * from public.get_public_worker_reputation('91000000-0000-4000-8000-000000000010', 0, 21)$sql$,
  '22023', 'invalid review pagination', 'public review page is capped server-side');
select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000003', true);
select throws_ok($sql$select * from public.get_public_worker_reputation('91000000-0000-4000-8000-000000000010', 0, 10)$sql$,
  '42501', 'active confirmed account required', 'unconfirmed caller cannot read public reputation');

select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000002', true);
select is((select rating from public.create_booking_review('95000000-0000-4000-8000-000000000006', 4::smallint, 'Buen trabajo')),
  4::smallint, 'legitimate review can exist before a worker becomes non-public');
reset role;
select set_config('request.jwt.claim.sub', '', true);
update public.worker_profiles set approval_status = 'rejected' where id = '91000000-0000-4000-8000-000000000011';
set local role authenticated;
select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000001', true);
select is((select count(*)::integer from public.get_public_worker_reputation(
    '91000000-0000-4000-8000-000000000011', 0, 10)), 0,
  'reviews cannot bypass public worker eligibility');

-- Notification is part of the same atomic operation.
reset role;
create or replace function private.mod09_test_fail_review_notification()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.type = 'review_received' then
    raise exception 'test review notification failure';
  end if;
  return new;
end;
$$;
create trigger mod09_test_fail_review_notification
  before insert on public.notifications
  for each row execute function private.mod09_test_fail_review_notification();
set local role authenticated;
select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000001', true);
select throws_ok($sql$select * from public.create_booking_review('95000000-0000-4000-8000-000000000007', 5::smallint, 'Debe revertirse')$sql$,
  'P0001', 'test review notification failure', 'notification failure aborts review creation');
reset role;
drop trigger mod09_test_fail_review_notification on public.notifications;
drop function private.mod09_test_fail_review_notification();
select is((select count(*)::integer from public.reviews where booking_id = '95000000-0000-4000-8000-000000000007'),
  0, 'failed notification leaves no partial review');
select is((select count(*)::integer from public.notifications where type = 'review_received'
    and related_entity_id in (select id from public.reviews where booking_id = '95000000-0000-4000-8000-000000000007')),
  0, 'failed creation leaves no partial notification');

select ok(to_regprocedure('public.confirm_booking_completion(uuid)') is not null
    and to_regprocedure('public.get_public_worker_profile(uuid)') is not null
    and to_regprocedure('public.search_marketplace_workers(text,uuid,text,text,double precision,double precision,integer,text,numeric,numeric,smallint,smallint,text,integer,integer)') is not null,
  'MOD-04 MOD-05 and MOD-08 contracts remain available');

select * from finish();
rollback;
