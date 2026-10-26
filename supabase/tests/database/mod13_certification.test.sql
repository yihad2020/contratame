-- MOD-13 pgTAP suite: worker certification and administrative decisions.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(84);

-- Frozen entity and least-privilege contracts.
select has_table('public', 'certification_memberships', 'certification membership materializes the frozen entity');
select columns_are('public', 'certification_memberships', array[
  'id','worker_id','status','price_bob','starts_at','expires_at','created_at','updated_at'
], 'certification membership contains exactly the frozen columns');
select col_is_pk('public', 'certification_memberships', 'id', 'membership id is the primary key');
select fk_ok('public', 'certification_memberships', 'worker_id', 'public', 'worker_profiles', 'id',
  'membership references the frozen worker profile');
select col_has_default('public', 'certification_memberships', 'status', 'PostgreSQL owns initial status');
select col_has_default('public', 'certification_memberships', 'price_bob', 'PostgreSQL owns the fixed offer price');
select ok(exists (select 1 from pg_trigger where tgrelid = 'public.certification_memberships'::regclass
  and tgname = 'certification_memberships_set_updated_at' and not tgisinternal), 'updated_at is server maintained');
select has_index('public', 'certification_memberships', 'certification_memberships_one_pending_idx',
  'one pending request is enforced per worker');
select has_index('public', 'certification_memberships', 'certification_memberships_one_active_idx',
  'one active certification is enforced per worker');
select has_index('public', 'certification_memberships', 'certification_memberships_worker_created_idx',
  'worker history has a deterministic index');
select has_index('public', 'certification_memberships', 'certification_memberships_status_created_idx',
  'admin status listing has an index');
select ok((select relrowsecurity from pg_class where oid = 'public.certification_memberships'::regclass),
  'certification memberships have RLS enabled');
select ok(not has_table_privilege('authenticated', 'public.certification_memberships', 'SELECT,INSERT,UPDATE,DELETE'),
  'authenticated clients have no direct membership privileges');
select ok(
  to_regprocedure('public.get_my_worker_certification_state()') is not null
  and to_regprocedure('public.request_worker_certification()') is not null
  and to_regprocedure('public.get_public_worker_certifications(uuid[])') is not null
  and to_regprocedure('public.list_admin_certification_requests(text,timestamptz,uuid,integer)') is not null
  and to_regprocedure('public.get_admin_certification_request(uuid)') is not null
  and to_regprocedure('public.approve_certification_request(uuid)') is not null
  and to_regprocedure('public.reject_certification_request(uuid)') is not null,
  'all MOD-13 RPC contracts exist');
select ok((select bool_and(prosecdef) from pg_proc where oid in (
  'public.get_my_worker_certification_state()'::regprocedure,
  'public.request_worker_certification()'::regprocedure,
  'public.get_public_worker_certifications(uuid[])'::regprocedure,
  'public.list_admin_certification_requests(text,timestamptz,uuid,integer)'::regprocedure,
  'public.get_admin_certification_request(uuid)'::regprocedure,
  'public.approve_certification_request(uuid)'::regprocedure,
  'public.reject_certification_request(uuid)'::regprocedure
)), 'all MOD-13 RPCs are SECURITY DEFINER');
select is((select count(*)::integer from pg_proc procedure, unnest(procedure.proconfig) setting
  where procedure.oid in (
    'public.get_my_worker_certification_state()'::regprocedure,
    'public.request_worker_certification()'::regprocedure,
    'public.get_public_worker_certifications(uuid[])'::regprocedure,
    'public.list_admin_certification_requests(text,timestamptz,uuid,integer)'::regprocedure,
    'public.get_admin_certification_request(uuid)'::regprocedure,
    'public.approve_certification_request(uuid)'::regprocedure,
    'public.reject_certification_request(uuid)'::regprocedure
  ) and setting = 'search_path=""'), 7, 'all MOD-13 RPCs pin an empty search_path');
select ok(has_function_privilege('authenticated', 'public.request_worker_certification()', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.get_public_worker_certifications(uuid[])', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.approve_certification_request(uuid)', 'EXECUTE'),
  'authenticated receives only controlled execution contracts');
select ok(not has_function_privilege('anon', 'public.request_worker_certification()', 'EXECUTE')
  and not has_function_privilege('anon', 'public.get_public_worker_certifications(uuid[])', 'EXECUTE')
  and not has_function_privilege('anon', 'public.approve_certification_request(uuid)', 'EXECUTE'),
  'anonymous receives no MOD-13 execution');
select ok(to_regclass('public.payment_transactions') is null,
  'MOD-13 does not materialize electronic payment transactions');
select ok(not exists (
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name in ('profiles','worker_profiles') and column_name = 'is_certified'
), 'no canonical certification boolean is stored');

-- Admin, normal user, eligible/ineligible workers and blocked account fixtures.
insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data)
values
  ('d1000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'cert-admin@example.invalid', now(), '{"first_name":"Admin","last_name":"Certificación"}'::jsonb),
  ('d1000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'cert-normal@example.invalid', now(), '{"first_name":"Cliente","last_name":"Normal"}'::jsonb),
  ('d1000000-0000-4000-8000-000000000010', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'cert-worker-a@example.invalid', now(), '{"first_name":"Ana","last_name":"Profesional"}'::jsonb),
  ('d1000000-0000-4000-8000-000000000011', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'cert-worker-b@example.invalid', now(), '{"first_name":"Beto","last_name":"Profesional"}'::jsonb),
  ('d1000000-0000-4000-8000-000000000012', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'cert-suspended@example.invalid', now(), '{"first_name":"Sonia","last_name":"Profesional"}'::jsonb),
  ('d1000000-0000-4000-8000-000000000013', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'cert-unconfirmed@example.invalid', null, '{"first_name":"Uri","last_name":"Profesional"}'::jsonb);

insert into public.user_roles (profile_id, role)
values ('d1000000-0000-4000-8000-000000000001', 'admin');

update public.profiles set account_status = 'suspended'
where id = 'd1000000-0000-4000-8000-000000000012';

insert into public.worker_profiles (id, profile_id, bio, years_experience, approval_status)
values
  ('d2000000-0000-4000-8000-000000000010', 'd1000000-0000-4000-8000-000000000010', 'Trabajo profesional responsable con experiencia verificable en instalaciones.', 8, 'draft'),
  ('d2000000-0000-4000-8000-000000000011', 'd1000000-0000-4000-8000-000000000011', 'Trabajo profesional responsable con experiencia verificable en plomería.', 6, 'draft'),
  ('d2000000-0000-4000-8000-000000000012', 'd1000000-0000-4000-8000-000000000012', 'Trabajo profesional de una cuenta suspendida para validar seguridad.', 4, 'approved'),
  ('d2000000-0000-4000-8000-000000000013', 'd1000000-0000-4000-8000-000000000013', 'Trabajo profesional de una cuenta todavía no confirmada.', 3, 'approved');

select set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000010', true);
insert into public.worker_locations (worker_id, private_location, public_area_label, city, department, country_code, service_radius_m)
values ('d2000000-0000-4000-8000-000000000010', 'SRID=4326;POINT(-63.18 -17.78)'::extensions.geography,
  'Equipetrol', 'Santa Cruz de la Sierra', 'Santa Cruz', 'BO', 10000);
insert into public.worker_services (id, worker_id, category_id, title, description, pricing_type, price_bob)
values ('d3000000-0000-4000-8000-000000000010', 'd2000000-0000-4000-8000-000000000010',
  '00000000-0000-4000-8000-000000000001', 'Instalación eléctrica', 'Instalación segura para hogares y comercios.', 'fixed', 250);

select set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000011', true);
insert into public.worker_locations (worker_id, private_location, public_area_label, city, department, country_code, service_radius_m)
values ('d2000000-0000-4000-8000-000000000011', 'SRID=4326;POINT(-63.19 -17.79)'::extensions.geography,
  'Centro', 'Santa Cruz de la Sierra', 'Santa Cruz', 'BO', 9000);
insert into public.worker_services (id, worker_id, category_id, title, description, pricing_type, price_bob)
values ('d3000000-0000-4000-8000-000000000011', 'd2000000-0000-4000-8000-000000000011',
  '00000000-0000-4000-8000-000000000002', 'Plomería domiciliaria', 'Reparación segura de tuberías y conexiones.', 'hourly', 90);

select set_config('request.jwt.claim.sub', '', true);
update public.worker_profiles set approval_status = 'approved'
where id = 'd2000000-0000-4000-8000-000000000011';

-- Access and eligibility.
set local role anon;
select throws_ok('select * from public.request_worker_certification()', '42501',
  'permission denied for function request_worker_certification', 'anonymous cannot request certification');
select throws_ok($sql$select * from public.get_public_worker_certifications(array['d2000000-0000-4000-8000-000000000010'::uuid])$sql$,
  '42501', 'permission denied for function get_public_worker_certifications', 'anonymous cannot query certification state');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000010', true);
select throws_ok('select * from public.request_worker_certification()', '55000', 'approved worker required',
  'draft worker cannot request certification');
reset role;
select set_config('request.jwt.claim.sub', '', true);
update public.worker_profiles set approval_status = 'pending_approval' where id = 'd2000000-0000-4000-8000-000000000010';
set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000010', true);
select throws_ok('select * from public.request_worker_certification()', '55000', 'approved worker required',
  'pending worker cannot request certification');
reset role;
select set_config('request.jwt.claim.sub', '', true);
update public.worker_profiles set approval_status = 'rejected' where id = 'd2000000-0000-4000-8000-000000000010';
set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000010', true);
select throws_ok('select * from public.request_worker_certification()', '55000', 'approved worker required',
  'rejected worker cannot request certification');
select set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000012', true);
select throws_ok('select * from public.request_worker_certification()', '42501', 'active confirmed account required',
  'suspended worker account cannot request certification');
select set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000013', true);
select throws_ok('select * from public.request_worker_certification()', '42501', 'active confirmed account required',
  'unconfirmed worker account cannot request certification');

reset role;
select set_config('request.jwt.claim.sub', '', true);
update public.worker_profiles set approval_status = 'approved' where id = 'd2000000-0000-4000-8000-000000000010';
set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000010', true);
select is((select display_state from public.get_my_worker_certification_state()), 'eligible',
  'approved worker without history is eligible');
select ok((select membership_status = 'pending_payment' and price_bob = 50
  from public.request_worker_certification()), 'eligible owner creates a Bs 50 pending request');
reset role;
select is((select worker_id from public.certification_memberships),
  'd2000000-0000-4000-8000-000000000010'::uuid, 'worker identity is derived from auth.uid');
select ok((select starts_at is null and expires_at is null from public.certification_memberships),
  'worker cannot supply certification dates');
set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000010', true);
select is((select display_state from public.get_my_worker_certification_state()), 'pending',
  'own certification state maps pending_payment to pending review');
select throws_ok('select * from public.request_worker_certification()', '23505',
  'certification request already pending', 'duplicate pending request is rejected');
reset role;
select is((select count(*)::integer from public.certification_memberships
  where worker_id = 'd2000000-0000-4000-8000-000000000010'), 1, 'duplicate request creates no extra row');
select id as worker_a_membership_id from public.certification_memberships
where worker_id = 'd2000000-0000-4000-8000-000000000010' and status = 'pending_payment' \gset

set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000002', true);
select throws_ok($sql$insert into public.certification_memberships (worker_id) values ('d2000000-0000-4000-8000-000000000010')$sql$,
  '42501', 'permission denied for table certification_memberships', 'another user cannot create a membership directly');
select throws_ok($sql$update public.certification_memberships set status='active', starts_at=now(), expires_at=now()+interval '12 months'$sql$,
  '42501', 'permission denied for table certification_memberships', 'user cannot forge status or validity');
select throws_ok('delete from public.certification_memberships', '42501',
  'permission denied for table certification_memberships', 'user cannot delete certification history');
select throws_ok('select * from public.list_admin_certification_requests(null,null,null,30)', '42501',
  'administrator access required', 'non-admin cannot list certification requests');
select throws_ok(format('select * from public.approve_certification_request(%L::uuid)', :'worker_a_membership_id'),
  '42501', 'administrator access required', 'non-admin cannot approve certification');

-- Second approved worker requests certification for rejection/reapplication coverage.
select set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000011', true);
select lives_ok('select * from public.request_worker_certification()', 'second approved owner can request certification');

-- Administrative review is server-authorized and atomic with audit.
reset role;
select id as worker_b_membership_id from public.certification_memberships
where worker_id = 'd2000000-0000-4000-8000-000000000011' and status = 'pending_payment' \gset
set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000001', true);
select is((select count(*)::integer from public.list_admin_certification_requests('pending_payment',null,null,30)), 2,
  'admin lists pending certification requests');
select ok(not exists (
  select 1 from public.list_admin_certification_requests(null,null,null,30) as row
  cross join lateral jsonb_object_keys(to_jsonb(row)) as field
  where field in ('email','phone','private_location','exact_location')
), 'admin certification allowlist omits contact and private location');
select throws_ok($sql$select * from public.list_admin_certification_requests('unknown',null,null,30)$sql$,
  '22023', 'invalid certification status', 'admin status filter accepts only frozen states');
select throws_ok($sql$select * from public.list_admin_certification_requests(null,now(),null,30)$sql$,
  '22023', 'complete certification cursor required', 'admin pagination requires a complete cursor');
select throws_ok($sql$select * from public.list_admin_certification_requests(null,null,null,51)$sql$,
  '22023', 'certification page size must be between 1 and 50', 'admin pagination is bounded');

select lives_ok(format('select * from public.approve_certification_request(%L::uuid)', :'worker_a_membership_id'),
  'admin approves the current pending certification');
reset role;
select is((select status from public.certification_memberships where id = :'worker_a_membership_id'::uuid),
  'active', 'approval records the frozen active state');
select ok((select starts_at between clock_timestamp() - interval '10 seconds' and clock_timestamp()
  from public.certification_memberships where id = :'worker_a_membership_id'::uuid),
  'approval start uses recent PostgreSQL server time');
select ok((select expires_at = starts_at + interval '12 months'
  from public.certification_memberships where id = :'worker_a_membership_id'::uuid),
  'approval expires exactly twelve calendar months after start');
select is((select count(*)::integer from public.audit_logs
  where action = 'certification.approved' and entity_id = :'worker_a_membership_id'::uuid), 1,
  'approval appends exactly one audit event');
select is((select actor_profile_id from public.audit_logs
  where action = 'certification.approved' and entity_id = :'worker_a_membership_id'::uuid),
  'd1000000-0000-4000-8000-000000000001'::uuid, 'audit actor is derived from the authenticated admin');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000010', true);
select throws_ok('select * from public.request_worker_certification()', '23505', 'certification already active',
  'active certification prevents another request');
select is((select display_state from public.get_my_worker_certification_state()), 'active',
  'worker state exposes active certification safely');
select ok((select is_verified from public.get_public_worker_certifications(
  array['d2000000-0000-4000-8000-000000000010'::uuid])), 'public badge is active during validity');
select ok((select certification_expires_at is not null from public.get_public_worker_certifications(
  array['d2000000-0000-4000-8000-000000000010'::uuid])), 'public contract exposes only safe validity date');
select is((select count(*)::integer from public.get_public_worker_certifications(array[
  'd2000000-0000-4000-8000-000000000010'::uuid,
  'd2000000-0000-4000-8000-000000000010'::uuid
])), 1, 'public batch deduplicates worker ids');
select throws_ok($sql$select * from public.get_public_worker_certifications(array[]::uuid[])$sql$,
  '22023', 'between 1 and 50 worker ids are required', 'public batch rejects empty input');
select is((select array_agg(parameter_name order by ordinal_position)::text
  from information_schema.parameters
  where specific_schema = 'public'
    and specific_name like 'get_public_worker_certifications_%'
    and parameter_mode = 'OUT'),
  '{worker_id,is_verified,certification_expires_at}', 'public certification contract has only the safe allowlist');

select set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000001', true);
select throws_ok(format('select * from public.approve_certification_request(%L::uuid)', :'worker_a_membership_id'),
  '55000', 'certification request was already reviewed', 'approved request cannot be approved twice');
select throws_ok(format('select * from public.reject_certification_request(%L::uuid)', :'worker_a_membership_id'),
  '55000', 'certification request was already reviewed', 'approved request cannot later be rejected');

-- Public badge always rechecks worker eligibility without destroying history.
reset role;
select set_config('request.jwt.claim.sub', '', true);
update public.worker_profiles set approval_status = 'suspended'
where id = 'd2000000-0000-4000-8000-000000000010';
set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000002', true);
select is((select count(*)::integer from public.get_public_worker_certifications(
  array['d2000000-0000-4000-8000-000000000010'::uuid])), 0,
  'badge disappears when worker loses public eligibility');
reset role;
select is((select count(*)::integer from public.certification_memberships
  where id = :'worker_a_membership_id'::uuid), 1, 'eligibility loss preserves certification history');
select set_config('request.jwt.claim.sub', '', true);
update public.worker_profiles set approval_status = 'approved'
where id = 'd2000000-0000-4000-8000-000000000010';
set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000002', true);
select ok((select is_verified from public.get_public_worker_certifications(
  array['d2000000-0000-4000-8000-000000000010'::uuid])),
  'badge returns when eligibility is restored before expiration');

-- Expiration is derived at query time and permits historical reapplication.
reset role;
select set_config('request.jwt.claim.sub', '', true);
update public.certification_memberships
set starts_at = now() - interval '13 months', expires_at = now() - interval '1 month'
where id = :'worker_a_membership_id'::uuid;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000002', true);
select is((select is_verified from public.get_public_worker_certifications(
  array['d2000000-0000-4000-8000-000000000010'::uuid])), false,
  'expired active record produces no public badge without a cron job');
select set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000010', true);
select is((select display_state from public.get_my_worker_certification_state()), 'expired',
  'worker state derives expiration from server time');
select lives_ok('select * from public.request_worker_certification()',
  'worker may reapply after expiration');
reset role;
select is((select status from public.certification_memberships where id = :'worker_a_membership_id'::uuid),
  'expired', 'reapplication persists the expired historical state');
select is((select count(*)::integer from public.certification_memberships
  where worker_id = 'd2000000-0000-4000-8000-000000000010'), 2,
  'reapplication appends instead of overwriting history');
select is((select count(*)::integer from public.certification_memberships
  where worker_id = 'd2000000-0000-4000-8000-000000000010' and status = 'pending_payment'), 1,
  'reapplication leaves exactly one current pending request');

-- Rejection uses the frozen cancelled state because the entity has no rejection-notes field.
set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000001', true);
select lives_ok(format('select * from public.reject_certification_request(%L::uuid)', :'worker_b_membership_id'),
  'admin rejects a pending certification');
reset role;
select is((select status from public.certification_memberships where id = :'worker_b_membership_id'::uuid),
  'cancelled', 'rejection maps to the frozen cancelled state');
select ok((select starts_at is null and expires_at is null from public.certification_memberships
  where id = :'worker_b_membership_id'::uuid), 'rejection cannot forge validity dates');
select is((select count(*)::integer from public.audit_logs
  where action = 'certification.rejected' and entity_id = :'worker_b_membership_id'::uuid), 1,
  'rejection appends exactly one audit event');
set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000011', true);
select is((select display_state from public.get_my_worker_certification_state()), 'rejected',
  'worker safely sees rejected state without internal admin identity');
select lives_ok('select * from public.request_worker_certification()',
  'worker may reapply immediately after rejection');
reset role;
select is((select count(*)::integer from public.certification_memberships
  where worker_id = 'd2000000-0000-4000-8000-000000000011'), 2,
  'reapplication after rejection preserves decision history');
select is((select count(*)::integer from public.certification_memberships
  where worker_id = 'd2000000-0000-4000-8000-000000000011' and status = 'pending_payment'), 1,
  'reapplication after rejection creates one actionable pending request');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000001', true);
select is((select count(*)::integer from public.list_admin_certification_requests(null,null,null,30)), 4,
  'admin history lists all preserved decisions and reapplications');
select is((select count(*)::integer from public.get_admin_certification_request(:'worker_b_membership_id'::uuid)), 1,
  'admin opens a specific historical decision');
select is((select count(*)::integer from public.list_admin_certification_requests('cancelled',null,null,30)), 1,
  'admin filter exposes the frozen rejection representation');
select set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000002', true);
select is((select is_verified from public.get_public_worker_certifications(
  array['d2000000-0000-4000-8000-000000000011'::uuid])), false,
  'pending reapplication never produces a public badge');
reset role;
select is((select bool_and(price_bob = 50.00) from public.certification_memberships), true,
  'every certification request retains the approved Bs 50 offer price');
select is((select count(*)::integer from public.notifications where type like '%certification%'), 0,
  'MOD-13 invents no push or notification workflow');
select is((select count(*)::integer from public.audit_logs
  where entity_type = 'certification_membership'), 2,
  'only successful administrative decisions create audit events');

select * from finish();
rollback;
