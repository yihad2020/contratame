-- MOD-02 pgTAP suite. Fixture users and all mutations roll back after finish().
-- Separate workers cover isolation (B), incomplete draft (E), and submission (A).
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(79);

-- Schema, privilege and Storage contract.
select ok(to_regclass('public.worker_profiles') is not null, 'worker_profiles exists');
select ok(to_regclass('public.worker_locations') is not null, 'worker_locations exists');
select ok(to_regclass('public.service_categories') is not null, 'service_categories exists');
select ok(to_regclass('public.worker_services') is not null, 'worker_services exists');
select ok(to_regclass('public.worker_availability') is not null, 'worker_availability exists');
select ok(to_regclass('public.worker_portfolio_items') is not null, 'worker_portfolio_items exists');
select ok(to_regclass('public.worker_approval_requests') is not null, 'worker_approval_requests exists');
select ok((select bool_and(relrowsecurity) from pg_class where oid in (
  'public.worker_profiles'::regclass, 'public.worker_locations'::regclass,
  'public.service_categories'::regclass, 'public.worker_services'::regclass,
  'public.worker_availability'::regclass, 'public.worker_portfolio_items'::regclass,
  'public.worker_approval_requests'::regclass)), 'RLS is enabled on every MOD-02 table');
select ok(to_regprocedure('public.start_or_resume_worker_onboarding()') is not null, 'start/resume RPC exists');
select ok(to_regprocedure('public.submit_worker_profile_for_approval()') is not null, 'submission RPC exists');
select ok(has_function_privilege('authenticated', 'public.start_or_resume_worker_onboarding()', 'EXECUTE'),
  'authenticated may start onboarding through RPC');
select ok(has_function_privilege('authenticated', 'public.submit_worker_profile_for_approval()', 'EXECUTE'),
  'authenticated may submit through RPC');
select ok(not has_table_privilege('authenticated', 'public.worker_profiles', 'INSERT,DELETE'),
  'clients cannot create or delete worker profiles directly');
select ok(not has_column_privilege('authenticated', 'public.worker_profiles', 'approval_status', 'UPDATE'),
  'clients cannot update approval_status directly');
select ok(not has_table_privilege('authenticated', 'public.worker_approval_requests', 'INSERT,UPDATE,DELETE'),
  'clients cannot mutate approval history directly');
select ok(not has_table_privilege('anon', 'public.worker_locations', 'SELECT'),
  'anonymous clients cannot read private locations');
select is((select count(*)::integer from pg_indexes where schemaname = 'public'
  and tablename = 'worker_approval_requests' and indexname = 'worker_approval_requests_one_pending_idx'
  and indexdef ilike '%where (status = ''pending''%'), 1,
  'one partial unique pending-request index exists');
select is((select public from storage.buckets where id = 'worker-portfolio'), false,
  'portfolio bucket is private');
select is((select file_size_limit from storage.buckets where id = 'worker-portfolio'), 10485760::bigint,
  'portfolio bucket limits files to 10 MiB');
select is((select count(*)::integer from pg_policies where schemaname = 'storage'
  and tablename = 'objects' and policyname like 'worker_portfolio_objects_%'), 4,
  'four owner/state Storage policies exist');
select ok((select count(*) from public.service_categories where active) >= 8,
  'initial active service categories are seeded');
select ok(pg_get_functiondef('public.handle_new_user()'::regprocedure) not ilike '%worker_profiles%',
  'normal signup trigger does not create worker profiles');

-- Privileged fixture creation invokes the real MOD-01 signup trigger.
insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data)
values
  ('20000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'mod02-a@example.invalid', now(), '{"first_name":"Prueba","last_name":"UsuarioA"}'::jsonb),
  ('20000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'mod02-b@example.invalid', now(), '{"first_name":"Prueba","last_name":"UsuarioB"}'::jsonb),
  ('20000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'mod02-unconfirmed@example.invalid', null, '{"first_name":"Prueba","last_name":"SinConfirmar"}'::jsonb),
  ('20000000-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'mod02-suspended@example.invalid', now(), '{"first_name":"Prueba","last_name":"Suspendida"}'::jsonb),
  ('20000000-0000-4000-8000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'mod02-incomplete@example.invalid', now(), '{"first_name":"Prueba","last_name":"Incompleta"}'::jsonb);
update public.profiles set account_status = 'suspended'
where id = '20000000-0000-4000-8000-000000000004';
select is((select count(*)::integer from public.profiles where id::text like '20000000-0000-4000-8000-%'), 5,
  'signup provisioned all five general profiles');
select is((select count(*)::integer from public.worker_profiles where profile_id::text like '20000000-0000-4000-8000-%'), 0,
  'normal signup creates no worker profile');

set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000003', true);
select throws_ok('select public.start_or_resume_worker_onboarding()', '42501',
  'active confirmed account required', 'unconfirmed account cannot start onboarding');
select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000004', true);
select throws_ok('select public.start_or_resume_worker_onboarding()', '42501',
  'active confirmed account required', 'suspended account cannot start onboarding');

-- B owns populated private rows. A must not see or change them.
select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000002', true);
select lives_ok('select public.start_or_resume_worker_onboarding()', 'B can create a draft');
select set_config('test.worker_b', (select id::text from public.worker_profiles
  where profile_id = '20000000-0000-4000-8000-000000000002'), true);
select is((select approval_status from public.worker_profiles where id = current_setting('test.worker_b')::uuid),
  'draft', 'new B worker is draft');
select lives_ok($sql$insert into public.worker_locations
  (worker_id, private_location, public_area_label, city, department, country_code, service_radius_m)
  values (current_setting('test.worker_b')::uuid,
    'SRID=4326;POINT(-63.18 -17.78)'::extensions.geography,
    'Zona Centro', 'Santa Cruz de la Sierra', 'Santa Cruz', 'BO', 5000)$sql$,
  'B can save a private location');
select lives_ok($sql$insert into public.worker_services
  (worker_id, category_id, title, description, pricing_type)
  values (current_setting('test.worker_b')::uuid, '00000000-0000-4000-8000-000000000001',
    'Instalaciones eléctricas', 'Reparo instalaciones eléctricas residenciales.', 'quote')$sql$,
  'B can save a valid service');

select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000001', true);
select lives_ok('select public.start_or_resume_worker_onboarding()', 'A can create a draft');
select set_config('test.worker_a', (select id::text from public.worker_profiles
  where profile_id = '20000000-0000-4000-8000-000000000001'), true);
select lives_ok('select public.start_or_resume_worker_onboarding()', 'start/resume is idempotent');
select is((select count(*)::integer from public.worker_profiles
  where profile_id = '20000000-0000-4000-8000-000000000001'), 1,
  'start/resume leaves exactly one A worker');
select is((select approval_status from public.worker_profiles where id = current_setting('test.worker_a')::uuid),
  'draft', 'A remains draft after resuming');
select is((select count(*)::integer from public.worker_profiles where id = current_setting('test.worker_b')::uuid), 0,
  'A cannot read B worker profile');
select is((select count(*)::integer from public.worker_services where worker_id = current_setting('test.worker_b')::uuid), 0,
  'A cannot read B services');
select is((select count(*)::integer from public.worker_locations where worker_id = current_setting('test.worker_b')::uuid), 0,
  'A cannot read B exact private coordinate');
with attempted as (
  update public.worker_services set title = 'Unauthorized change'
  where worker_id = current_setting('test.worker_b')::uuid returning id
) select is((select count(*)::integer from attempted), 0, 'A cannot update B service');
select throws_ok($sql$insert into public.worker_services
  (worker_id, category_id, title, description, pricing_type)
  values (current_setting('test.worker_b')::uuid, '00000000-0000-4000-8000-000000000001',
    'Unauthorized service', 'This description should never be inserted.', 'quote')$sql$, '42501');
select throws_ok($sql$update public.worker_profiles set approval_status = 'approved'
  where id = current_setting('test.worker_a')::uuid$sql$, '42501');
select throws_ok($sql$insert into public.worker_approval_requests (worker_id, profile_snapshot)
  values (current_setting('test.worker_a')::uuid, '{}'::jsonb)$sql$, '42501');

-- E is a separate incomplete draft, never reused as the successful submission.
select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000005', true);
select lives_ok('select public.start_or_resume_worker_onboarding()', 'E can create an incomplete draft');
select set_config('test.worker_e', (select id::text from public.worker_profiles
  where profile_id = '20000000-0000-4000-8000-000000000005'), true);
select throws_ok('select public.submit_worker_profile_for_approval()', '22023',
  'professional profile is incomplete', 'empty draft cannot submit');
select lives_ok($sql$update public.worker_profiles set
  bio = 'Realizo instalaciones y reparaciones eléctricas con atención responsable.',
  years_experience = 5 where id = current_setting('test.worker_e')::uuid$sql$,
  'E can save a draft bio and experience');
select throws_ok('select public.submit_worker_profile_for_approval()', '22023',
  'at least one active service is required', 'draft without an active service cannot submit');
select throws_ok($sql$insert into public.worker_services
  (worker_id, category_id, title, description, pricing_type)
  values (current_setting('test.worker_e')::uuid, gen_random_uuid(),
    'Invalid category service', 'This description is long enough for testing.', 'quote')$sql$, '22023',
  'active service category required', 'inactive or absent service category is rejected');
select lives_ok($sql$insert into public.worker_services
  (worker_id, category_id, title, description, pricing_type)
  values (current_setting('test.worker_e')::uuid, '00000000-0000-4000-8000-000000000001',
    'Instalaciones eléctricas', 'Reparo instalaciones eléctricas residenciales.', 'quote')$sql$,
  'E can save a valid active service');
select throws_ok('select public.submit_worker_profile_for_approval()', '22023',
  'work area is incomplete', 'draft without a private location cannot submit');
select lives_ok($sql$insert into public.worker_locations
  (worker_id, private_location, public_area_label, city, department, country_code, service_radius_m)
  values (current_setting('test.worker_e')::uuid,
    'SRID=4326;POINT(-63.19 -17.79)'::extensions.geography,
    'Equipetrol', 'Santa Cruz de la Sierra', 'Santa Cruz', 'BO', 5000)$sql$,
  'E can save a valid private location');
select throws_ok('select public.submit_worker_profile_for_approval()', '22023',
  'at least one availability range is required', 'draft without availability cannot submit');
select lives_ok($sql$insert into public.worker_availability
  (worker_id, day_of_week, start_time, end_time)
  values (current_setting('test.worker_e')::uuid, 1, '09:00', '12:00')$sql$,
  'E can add a valid draft availability range');
select throws_ok($sql$insert into public.worker_availability
  (worker_id, day_of_week, start_time, end_time)
  values (current_setting('test.worker_e')::uuid, 1, '11:30', '13:00')$sql$, '23P01',
  'availability ranges must not overlap', 'overlapping availability is rejected');
select throws_ok($sql$insert into public.worker_availability
  (worker_id, day_of_week, start_time, end_time)
  values (current_setting('test.worker_e')::uuid, 2, '22:00', '02:00')$sql$, '22023',
  'availability must start before it ends', 'cross-midnight availability is rejected');
select throws_ok($sql$insert into public.worker_portfolio_items
  (worker_id, storage_path, title, sort_order)
  values (current_setting('test.worker_e')::uuid,
    current_setting('test.worker_e') || '/' || gen_random_uuid()::text || '/image.jpg',
    'Incorrect path', 0)$sql$, '22023', 'invalid portfolio storage path',
  'portfolio row cannot reference a different item ID');
select is((select approval_status from public.worker_profiles where id = current_setting('test.worker_e')::uuid),
  'draft', 'incomplete-case worker remains editable draft');
select is((select count(*)::integer from public.worker_approval_requests
  where worker_id = current_setting('test.worker_e')::uuid), 0,
  'failed incomplete submissions created no history');

-- A has its own complete draft and submits exactly once.
select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000001', true);
select lives_ok($sql$update public.worker_profiles set
  bio = 'Realizo instalaciones y reparaciones eléctricas con atención responsable.',
  years_experience = 5 where id = current_setting('test.worker_a')::uuid$sql$,
  'A can save draft professional details');
select lives_ok($sql$insert into public.worker_services
  (worker_id, category_id, title, description, pricing_type)
  values (current_setting('test.worker_a')::uuid, '00000000-0000-4000-8000-000000000001',
    'Instalaciones eléctricas', 'Reparo instalaciones eléctricas residenciales.', 'quote')$sql$,
  'A can add a valid active service');
select lives_ok($sql$insert into public.worker_locations
  (worker_id, private_location, public_area_label, city, department, country_code, service_radius_m)
  values (current_setting('test.worker_a')::uuid,
    'SRID=4326;POINT(-63.19 -17.79)'::extensions.geography,
    'Equipetrol', 'Santa Cruz de la Sierra', 'Santa Cruz', 'BO', 5000)$sql$,
  'A can save a valid private location');
select lives_ok($sql$insert into public.worker_availability
  (worker_id, day_of_week, start_time, end_time)
  values (current_setting('test.worker_a')::uuid, 1, '09:00', '12:00')$sql$,
  'A can add a valid availability range');
select lives_ok('select public.submit_worker_profile_for_approval()',
  'complete draft submits without a portfolio');
select is((select approval_status from public.worker_profiles where id = current_setting('test.worker_a')::uuid),
  'pending_approval', 'submission transitions draft to pending_approval');
select is((select count(*)::integer from public.worker_approval_requests
  where worker_id = current_setting('test.worker_a')::uuid and status = 'pending'), 1,
  'submission creates exactly one pending history row');
select ok((select profile_snapshot ? 'location' and profile_snapshot ? 'services'
  and jsonb_array_length(profile_snapshot -> 'services') = 1
  from public.worker_approval_requests where worker_id = current_setting('test.worker_a')::uuid),
  'history snapshot contains submitted location and service');
select throws_ok('select public.submit_worker_profile_for_approval()', '55000',
  'worker profile is not eligible for submission', 'second pending submission fails');
select is((select count(*)::integer from public.worker_approval_requests
  where worker_id = current_setting('test.worker_a')::uuid), 1,
  'duplicate submission did not create another request');
with attempted as (
  update public.worker_profiles set bio = 'A pending profile must not be editable.'
  where id = current_setting('test.worker_a')::uuid returning id
) select is((select count(*)::integer from attempted), 0, 'pending worker cannot edit professional details');
select throws_ok($sql$insert into public.worker_availability
  (worker_id, day_of_week, start_time, end_time)
  values (current_setting('test.worker_a')::uuid, 2, '09:00', '12:00')$sql$, '55000',
  'worker onboarding is read-only in the current state',
  'pending worker cannot add availability (the previously unhandled failure)');
with attempted as (
  update public.worker_availability set end_time = '13:00'
  where worker_id = current_setting('test.worker_a')::uuid returning id
) select is((select count(*)::integer from attempted), 0, 'pending worker cannot edit availability');

-- Privileged review fixture: clear the client JWT before changing status.
reset role;
select set_config('request.jwt.claim.sub', '', true);
select set_config('test.first_snapshot', (select profile_snapshot::text
  from public.worker_approval_requests where worker_id = current_setting('test.worker_a')::uuid), true);
update public.worker_approval_requests set status = 'rejected', reviewed_at = now(),
  reviewed_by_profile_id = '20000000-0000-4000-8000-000000000002',
  rejection_reason = 'Falta evidencia verificable.'
where worker_id = current_setting('test.worker_a')::uuid;
update public.worker_profiles set approval_status = 'rejected'
where id = current_setting('test.worker_a')::uuid;
select is((select approval_status from public.worker_profiles where id = current_setting('test.worker_a')::uuid),
  'rejected', 'authorized review fixture put A in rejected state');

set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000001', true);
select lives_ok('select public.start_or_resume_worker_onboarding()',
  'rejected worker can resume onboarding');
select is((select id from public.worker_profiles
  where profile_id = '20000000-0000-4000-8000-000000000001'),
  current_setting('test.worker_a')::uuid, 'rejected worker resumes the same worker ID');
select lives_ok($sql$update public.worker_profiles set
  bio = 'Realizo instalaciones y reparaciones eléctricas con atención responsable y referencias.'
  where id = current_setting('test.worker_a')::uuid$sql$,
  'rejected worker can edit the same professional profile');
select is((select bio from public.worker_profiles where id = current_setting('test.worker_a')::uuid),
  'Realizo instalaciones y reparaciones eléctricas con atención responsable y referencias.',
  'rejected edit persisted on the original worker row');
select lives_ok('select public.submit_worker_profile_for_approval()',
  'rejected worker can resubmit');
select is((select count(*)::integer from public.worker_approval_requests
  where worker_id = current_setting('test.worker_a')::uuid), 2,
  'resubmission appends a second history row');
select is((select count(*)::integer from public.worker_approval_requests
  where worker_id = current_setting('test.worker_a')::uuid and status = 'pending'), 1,
  'resubmission leaves exactly one pending request');
select is((select profile_snapshot from public.worker_approval_requests
  where worker_id = current_setting('test.worker_a')::uuid and status = 'rejected'),
  current_setting('test.first_snapshot')::jsonb, 'first approval snapshot remains immutable');
select is((select approval_status from public.worker_profiles where id = current_setting('test.worker_a')::uuid),
  'pending_approval', 'resubmission returns same worker to pending_approval');

reset role;
select * from finish();
rollback;
