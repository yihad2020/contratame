-- MOD-03 pgTAP suite. All fixtures and mutations are rolled back.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(62);

-- Schema and least-privilege contract.
select ok(to_regclass('public.audit_logs') is not null, 'frozen audit_logs model is deployed');
select ok((select relrowsecurity from pg_class where oid = 'public.audit_logs'::regclass), 'audit_logs has RLS enabled');
select ok(to_regprocedure('public.get_my_admin_access()') is not null, 'admin-access RPC exists');
select ok(to_regprocedure('public.approve_worker_submission(uuid)') is not null, 'approve RPC exists');
select ok(to_regprocedure('public.reject_worker_submission(uuid,text)') is not null, 'reject RPC exists');
select ok(has_function_privilege('authenticated', 'public.approve_worker_submission(uuid)', 'EXECUTE'), 'authenticated may invoke controlled approve RPC');
select ok(has_function_privilege('authenticated', 'public.reject_worker_submission(uuid,text)', 'EXECUTE'), 'authenticated may invoke controlled reject RPC');
select ok(not has_function_privilege('anon', 'public.approve_worker_submission(uuid)', 'EXECUTE'), 'anonymous cannot invoke approve RPC');
select ok(not has_table_privilege('authenticated', 'public.audit_logs', 'SELECT,INSERT,UPDATE,DELETE'), 'clients have no direct audit-log privileges');
select ok(exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_select_admin'), 'admins have an explicit profile-read policy');
select ok(exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'worker_approval_requests' and policyname = 'worker_approval_requests_select_owner_or_admin'), 'approval requests retain explicit owner/admin read policy');
select ok(exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'worker_portfolio_objects_select_owner_or_admin'), 'private portfolio retains owner/admin read policy');

-- Real MOD-01 provisioning for two admins, one normal user and two workers.
insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data)
values
  ('30000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin-a@example.invalid', now(), '{"first_name":"Admin","last_name":"Uno"}'::jsonb),
  ('30000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin-b@example.invalid', now(), '{"first_name":"Admin","last_name":"Dos"}'::jsonb),
  ('30000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'normal@example.invalid', now(), '{"first_name":"Usuario","last_name":"Normal"}'::jsonb),
  ('30000000-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'worker-a@example.invalid', now(), '{"first_name":"Ana","last_name":"Trabajadora"}'::jsonb),
  ('30000000-0000-4000-8000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'worker-b@example.invalid', now(), '{"first_name":"Bruno","last_name":"Trabajador"}'::jsonb);

insert into public.user_roles (profile_id, role, granted_by_profile_id)
values
  ('30000000-0000-4000-8000-000000000001', 'admin', null),
  ('30000000-0000-4000-8000-000000000002', 'admin', '30000000-0000-4000-8000-000000000001');

insert into public.worker_profiles (id, profile_id, bio, years_experience, approval_status)
values
  ('31000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000004', 'Realizo instalaciones eléctricas residenciales con trabajo responsable.', 7, 'draft'),
  ('31000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000005', 'Realizo trabajos profesionales de plomería con atención responsable.', 5, 'draft');

select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000004', true);
insert into public.worker_services (id, worker_id, category_id, title, description, pricing_type, price_bob)
values ('32000000-0000-4000-8000-000000000001', '31000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'Instalación eléctrica', 'Instalación y reparación eléctrica para viviendas.', 'fixed', 250);

insert into public.worker_locations (worker_id, private_location, public_area_label, city, department, country_code, service_radius_m)
values ('31000000-0000-4000-8000-000000000001', 'SRID=4326;POINT(-63.18 -17.78)'::extensions.geography, 'Equipetrol', 'Santa Cruz de la Sierra', 'Santa Cruz', 'BO', 10000);

insert into public.worker_availability (id, worker_id, day_of_week, start_time, end_time)
values ('33000000-0000-4000-8000-000000000001', '31000000-0000-4000-8000-000000000001', 1, '08:00', '12:00');

insert into public.worker_portfolio_items (id, worker_id, storage_path, title, sort_order)
values ('34000000-0000-4000-8000-000000000001', '31000000-0000-4000-8000-000000000001',
  '31000000-0000-4000-8000-000000000001/34000000-0000-4000-8000-000000000001/image.jpg', 'Tablero instalado', 0);
insert into storage.objects (bucket_id, name, metadata)
values ('worker-portfolio', '31000000-0000-4000-8000-000000000001/34000000-0000-4000-8000-000000000001/image.jpg', '{"mimetype":"image/jpeg"}'::jsonb);

select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000005', true);
insert into public.worker_services (id, worker_id, category_id, title, description, pricing_type, price_bob)
values ('32000000-0000-4000-8000-000000000002', '31000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000002', 'Reparación de tuberías', 'Reparación de tuberías y conexiones domiciliarias.', 'quote', null);
insert into public.worker_locations (worker_id, private_location, public_area_label, city, department, country_code, service_radius_m)
values ('31000000-0000-4000-8000-000000000002', 'SRID=4326;POINT(-63.19 -17.79)'::extensions.geography, 'Centro', 'Santa Cruz de la Sierra', 'Santa Cruz', 'BO', 5000);
insert into public.worker_availability (id, worker_id, day_of_week, start_time, end_time)
values ('33000000-0000-4000-8000-000000000002', '31000000-0000-4000-8000-000000000002', 2, '09:00', '13:00');

select set_config('request.jwt.claim.sub', '', true);
update public.worker_profiles set approval_status = 'pending_approval'
where id in ('31000000-0000-4000-8000-000000000001', '31000000-0000-4000-8000-000000000002');

insert into public.worker_approval_requests (id, worker_id, profile_snapshot, submitted_at)
values
  ('35000000-0000-4000-8000-000000000001', '31000000-0000-4000-8000-000000000001', '{"snapshot_version":1,"professional_profile":{"bio":"Snapshot eléctrico","years_experience":7},"services":[{"title":"Instalación eléctrica"}],"location":{"public_area_label":"Equipetrol","city":"Santa Cruz de la Sierra","department":"Santa Cruz","service_radius_m":10000},"availability":[{"day_of_week":1,"start_time":"08:00","end_time":"12:00"}],"portfolio":[{"storage_path":"31000000-0000-4000-8000-000000000001/34000000-0000-4000-8000-000000000001/image.jpg"}]}'::jsonb, now() - interval '2 minutes'),
  ('35000000-0000-4000-8000-000000000002', '31000000-0000-4000-8000-000000000002', '{"snapshot_version":1,"professional_profile":{"bio":"Snapshot plomería","years_experience":5},"services":[{"title":"Reparación de tuberías"}],"location":{"public_area_label":"Centro","city":"Santa Cruz de la Sierra","department":"Santa Cruz","service_radius_m":5000},"availability":[{"day_of_week":2,"start_time":"09:00","end_time":"13:00"}],"portfolio":[]}'::jsonb, now() - interval '1 minute');

select set_config('test.snapshot_a', (select profile_snapshot::text from public.worker_approval_requests where id = '35000000-0000-4000-8000-000000000001'), true);
select set_config('test.snapshot_b', (select profile_snapshot::text from public.worker_approval_requests where id = '35000000-0000-4000-8000-000000000002'), true);

-- Normal authenticated identities cannot inspect or decide other workers' reviews.
set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000003', true);
select is(public.get_my_admin_access(), false, 'authenticated non-admin is not authorized as admin');
select is((select count(*)::integer from public.worker_approval_requests), 0, 'non-admin cannot list approval requests');
select is((select count(*)::integer from public.worker_locations), 0, 'non-admin cannot read private coordinates');
select is((select count(*)::integer from storage.objects where bucket_id = 'worker-portfolio'), 0, 'non-admin cannot read submitted private portfolio objects');
select throws_ok($sql$select public.approve_worker_submission('35000000-0000-4000-8000-000000000001')$sql$, '42501', 'admin access required', 'normal user cannot approve');
select throws_ok($sql$select public.reject_worker_submission('35000000-0000-4000-8000-000000000001', 'Motivo suficientemente claro')$sql$, '42501', 'admin access required', 'normal user cannot reject');

-- Admin A can read review data and atomically approve request A.
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000001', true);
select is(public.get_my_admin_access(), true, 'active confirmed admin is authorized');
select is((select count(*)::integer from public.worker_approval_requests where status = 'pending'), 2, 'admin can list pending requests');
select is((select count(*)::integer from public.profiles), 3, 'admin sees own profile plus workers with approval history, not unrelated accounts');
select is((select profile_snapshot -> 'professional_profile' ->> 'bio' from public.worker_approval_requests where id = '35000000-0000-4000-8000-000000000001'), 'Snapshot eléctrico', 'admin reads the immutable submitted snapshot');
select is((select count(*)::integer from public.worker_locations), 2, 'admin can read private locations for review');
select is((select count(*)::integer from storage.objects where bucket_id = 'worker-portfolio'), 1, 'admin can read the submitted private portfolio object');
with attempted as (
  update public.worker_profiles set bio = 'El administrador no puede editar este perfil profesional.'
  where id = '31000000-0000-4000-8000-000000000001' returning id
) select is((select count(*)::integer from attempted), 0, 'admin cannot directly edit worker professional data');
select lives_ok($sql$select public.approve_worker_submission('35000000-0000-4000-8000-000000000001')$sql$, 'admin can approve the current pending request');
select is((select status from public.worker_approval_requests where id = '35000000-0000-4000-8000-000000000001'), 'approved', 'approval records approved result');
select is((select approval_status from public.worker_profiles where id = '31000000-0000-4000-8000-000000000001'), 'approved', 'approval transitions worker to approved');
select is((select reviewed_by_profile_id from public.worker_approval_requests where id = '35000000-0000-4000-8000-000000000001'), '30000000-0000-4000-8000-000000000001'::uuid, 'approval records acting admin');
select ok((select reviewed_at is not null from public.worker_approval_requests where id = '35000000-0000-4000-8000-000000000001'), 'approval records review time');
reset role;
select is((select count(*)::integer from public.audit_logs where action = 'worker_approval.approved' and entity_id = '35000000-0000-4000-8000-000000000001'), 1, 'approval writes one audit event');
set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000001', true);
select is((select profile_snapshot from public.worker_approval_requests where id = '35000000-0000-4000-8000-000000000001'), current_setting('test.snapshot_a')::jsonb, 'approval preserves snapshot exactly');
select is((select bio from public.worker_profiles where id = '31000000-0000-4000-8000-000000000001'), 'Realizo instalaciones eléctricas residenciales con trabajo responsable.', 'admin review does not rewrite professional data');
select throws_ok($sql$select public.approve_worker_submission('35000000-0000-4000-8000-000000000001')$sql$, '55000', 'approval request was already reviewed', 'approved request cannot be approved again');
select throws_ok($sql$select public.reject_worker_submission('35000000-0000-4000-8000-000000000001', 'Ahora intento rechazarla')$sql$, '55000', 'approval request was already reviewed', 'approved request cannot later be rejected');

-- Request B rejects only with a valid human-readable reason.
select throws_ok($sql$select public.reject_worker_submission('35000000-0000-4000-8000-000000000002', ' corto ')$sql$, '22023', 'rejection reason must contain between 10 and 500 characters', 'rejection reason enforces minimum length after trim');
select is((select status from public.worker_approval_requests where id = '35000000-0000-4000-8000-000000000002'), 'pending', 'invalid rejection leaves request pending');
select lives_ok($sql$select public.reject_worker_submission('35000000-0000-4000-8000-000000000002', '  Debe mejorar la descripción del servicio.  ')$sql$, 'admin can reject with a valid reason');
select is((select status from public.worker_approval_requests where id = '35000000-0000-4000-8000-000000000002'), 'rejected', 'rejection records rejected result');
select is((select approval_status from public.worker_profiles where id = '31000000-0000-4000-8000-000000000002'), 'rejected', 'rejection transitions worker to rejected');
select is((select reviewed_by_profile_id from public.worker_approval_requests where id = '35000000-0000-4000-8000-000000000002'), '30000000-0000-4000-8000-000000000001'::uuid, 'rejection records acting admin');
select ok((select reviewed_at is not null from public.worker_approval_requests where id = '35000000-0000-4000-8000-000000000002'), 'rejection records review time');
select is((select rejection_reason from public.worker_approval_requests where id = '35000000-0000-4000-8000-000000000002'), 'Debe mejorar la descripción del servicio.', 'rejection stores trimmed reason');
reset role;
select is((select count(*)::integer from public.audit_logs where action = 'worker_approval.rejected' and entity_id = '35000000-0000-4000-8000-000000000002'), 1, 'rejection writes one audit event');
set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000001', true);
select is((select profile_snapshot from public.worker_approval_requests where id = '35000000-0000-4000-8000-000000000002'), current_setting('test.snapshot_b')::jsonb, 'rejection preserves snapshot exactly');

-- Admin B observes the terminal result and cannot win a second decision.
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000002', true);
select throws_ok($sql$select public.reject_worker_submission('35000000-0000-4000-8000-000000000002', 'Segundo administrador intenta procesar')$sql$, '55000', 'approval request was already reviewed', 'second admin cannot process an already reviewed request');

-- Rejected worker edits the same profile and creates a new immutable request.
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000005', true);
select lives_ok($sql$update public.worker_profiles set bio = 'Realizo trabajos profesionales de plomería con descripción corregida y responsable.' where id = '31000000-0000-4000-8000-000000000002'$sql$, 'rejected worker becomes editable under MOD-02 rules');
select lives_ok('select public.submit_worker_profile_for_approval()', 'rejected worker can resubmit the same worker profile');
select is((select approval_status from public.worker_profiles where id = '31000000-0000-4000-8000-000000000002'), 'pending_approval', 'resubmission returns same worker to pending approval');
select is((select count(*)::integer from public.worker_approval_requests where worker_id = '31000000-0000-4000-8000-000000000002'), 2, 'resubmission appends a new request');
select is((select count(*)::integer from public.worker_approval_requests where worker_id = '31000000-0000-4000-8000-000000000002' and status = 'pending'), 1, 'resubmission leaves exactly one current pending request');
select is((select status from public.worker_approval_requests where id = '35000000-0000-4000-8000-000000000002'), 'rejected', 'old rejected request remains historical');
select is((select profile_snapshot from public.worker_approval_requests where id = '35000000-0000-4000-8000-000000000002'), current_setting('test.snapshot_b')::jsonb, 'old rejected snapshot remains immutable');

-- Old history is stale; the new pending request is the only actionable submission.
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000001', true);
select throws_ok($sql$select public.approve_worker_submission('35000000-0000-4000-8000-000000000002')$sql$, '55000', 'approval request was already reviewed', 'stale historical request cannot affect current worker state');
select lives_ok($sql$select public.approve_worker_submission((select id from public.worker_approval_requests where worker_id = '31000000-0000-4000-8000-000000000002' and status = 'pending'))$sql$, 'admin can approve the new current submission');
select is((select approval_status from public.worker_profiles where id = '31000000-0000-4000-8000-000000000002'), 'approved', 'new current approval transitions worker to approved');
select is((select count(*)::integer from public.worker_approval_requests where worker_id = '31000000-0000-4000-8000-000000000002' and status = 'rejected'), 1, 'rejected history is preserved after later approval');
select is((select count(*)::integer from public.worker_approval_requests where worker_id = '31000000-0000-4000-8000-000000000002' and status = 'approved'), 1, 'new submission records its own approved result');
reset role;
select is((select count(*)::integer from public.audit_logs where action = 'worker_approval.approved'), 2, 'each successful approval has one audit event');
set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000001', true);
select is((select title from public.worker_services where id = '32000000-0000-4000-8000-000000000002'), 'Reparación de tuberías', 'approval never edits submitted service data');

-- Audit rows remain inaccessible through the ordinary client role.
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000003', true);
select throws_ok('select count(*) from public.audit_logs', '42501', 'permission denied for table audit_logs', 'normal users cannot read the audit trail');
select ok(not has_table_privilege('authenticated', 'public.worker_approval_requests', 'UPDATE'), 'clients still cannot directly rewrite approval history');

reset role;
select * from finish();
rollback;
