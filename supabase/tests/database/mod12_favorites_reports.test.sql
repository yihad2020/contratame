-- MOD-12 pgTAP suite: favorites, reports and administrative moderation.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(119);

-- Frozen favorite entity and hardened contracts.
select has_table('public', 'favorites', 'favorites materializes the frozen entity');
select columns_are('public', 'favorites', array['profile_id','worker_id','created_at'],
  'favorites contains exactly the frozen columns');
select col_is_pk('public', 'favorites', array['profile_id','worker_id'],
  'favorite owner and worker form the composite primary key');
select fk_ok('public', 'favorites', 'profile_id', 'public', 'profiles', 'id',
  'favorite owner references profiles');
select fk_ok('public', 'favorites', 'worker_id', 'public', 'worker_profiles', 'id',
  'favorite target references worker_profiles');
select col_has_default('public', 'favorites', 'created_at',
  'PostgreSQL owns the favorite timestamp');
select has_index('public', 'favorites', 'favorites_profile_created_worker_idx',
  'owner list has a deterministic keyset index');
select has_index('public', 'favorites', 'favorites_worker_idx',
  'worker foreign-key lookup has an index');
select ok((select relrowsecurity from pg_class where oid = 'public.favorites'::regclass),
  'favorites has RLS enabled');
select ok(exists (select 1 from pg_policies where schemaname = 'public'
    and tablename = 'favorites' and policyname = 'favorites_select_owner'),
  'favorite policy is owner-only');
select ok(
  to_regprocedure('public.get_my_worker_favorite_state(uuid)') is not null
  and to_regprocedure('public.add_worker_favorite(uuid)') is not null
  and to_regprocedure('public.remove_worker_favorite(uuid)') is not null
  and to_regprocedure('public.list_my_worker_favorites(timestamptz,uuid,integer)') is not null,
  'all favorite RPC contracts exist');
select ok((select bool_and(prosecdef) from pg_proc where oid in (
  'public.get_my_worker_favorite_state(uuid)'::regprocedure,
  'public.add_worker_favorite(uuid)'::regprocedure,
  'public.remove_worker_favorite(uuid)'::regprocedure,
  'public.list_my_worker_favorites(timestamptz,uuid,integer)'::regprocedure
)), 'all favorite contracts are SECURITY DEFINER');
select is((select count(*)::integer from pg_proc procedure, unnest(procedure.proconfig) setting
  where procedure.oid in (
    'public.get_my_worker_favorite_state(uuid)'::regprocedure,
    'public.add_worker_favorite(uuid)'::regprocedure,
    'public.remove_worker_favorite(uuid)'::regprocedure,
    'public.list_my_worker_favorites(timestamptz,uuid,integer)'::regprocedure
  ) and setting = 'search_path=""'), 4, 'all favorite contracts pin an empty search_path');
select ok(
  has_function_privilege('authenticated', 'public.get_my_worker_favorite_state(uuid)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.add_worker_favorite(uuid)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.remove_worker_favorite(uuid)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.list_my_worker_favorites(timestamptz,uuid,integer)', 'EXECUTE'),
  'authenticated receives only controlled favorite contracts');
select ok(
  not has_function_privilege('anon', 'public.get_my_worker_favorite_state(uuid)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.add_worker_favorite(uuid)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.remove_worker_favorite(uuid)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.list_my_worker_favorites(timestamptz,uuid,integer)', 'EXECUTE'),
  'anonymous has no favorite contract execution');
select ok(
  not has_table_privilege('authenticated', 'public.favorites', 'SELECT')
  and not has_table_privilege('authenticated', 'public.favorites', 'INSERT')
  and not has_table_privilege('authenticated', 'public.favorites', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.favorites', 'DELETE'),
  'normal clients have no direct favorite table privileges');
select ok(not exists (
  select 1 from pg_proc procedure, unnest(procedure.proargnames) argument_name
  where procedure.oid in (
    'public.add_worker_favorite(uuid)'::regprocedure,
    'public.remove_worker_favorite(uuid)'::regprocedure,
    'public.list_my_worker_favorites(timestamptz,uuid,integer)'::regprocedure
  ) and argument_name in ('p_profile_id','p_owner_id','p_created_at')
), 'favorite contracts cannot accept forged owner or timestamp');

-- Two customers, blocked accounts and four worker identities.
insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data)
values
  ('c1000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'favorite-a@example.invalid', now(), '{"first_name":"Carla","last_name":"Cliente"}'::jsonb),
  ('c1000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'favorite-b@example.invalid', now(), '{"first_name":"Bruno","last_name":"Cliente"}'::jsonb),
  ('c1000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'favorite-unconfirmed@example.invalid', null, '{"first_name":"Una","last_name":"Persona"}'::jsonb),
  ('c1000000-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'favorite-suspended@example.invalid', now(), '{"first_name":"Sonia","last_name":"Persona"}'::jsonb),
  ('c1000000-0000-4000-8000-000000000010', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'favorite-worker-a@example.invalid', now(), '{"first_name":"Ana","last_name":"Profesional"}'::jsonb),
  ('c1000000-0000-4000-8000-000000000011', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'favorite-worker-b@example.invalid', now(), '{"first_name":"Beto","last_name":"Profesional"}'::jsonb),
  ('c1000000-0000-4000-8000-000000000012', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'favorite-worker-c@example.invalid', now(), '{"first_name":"Celia","last_name":"Profesional"}'::jsonb),
  ('c1000000-0000-4000-8000-000000000013', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'favorite-worker-d@example.invalid', now(), '{"first_name":"Dario","last_name":"Profesional"}'::jsonb);

update public.profiles set account_status = 'suspended'
where id = 'c1000000-0000-4000-8000-000000000004';

select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000010', true);
insert into public.worker_profiles (id, profile_id, bio, years_experience, approval_status)
values ('c2000000-0000-4000-8000-000000000010', 'c1000000-0000-4000-8000-000000000010', 'Profesional eléctrico con experiencia verificable en hogares y negocios.', 8, 'draft');
insert into public.worker_locations (worker_id, private_location, public_area_label, city, department, country_code, service_radius_m)
values ('c2000000-0000-4000-8000-000000000010', 'SRID=4326;POINT(-63.18 -17.78)'::extensions.geography, 'Equipetrol', 'Santa Cruz de la Sierra', 'Santa Cruz', 'BO', 10000);
insert into public.worker_services (id, worker_id, category_id, title, description, pricing_type, price_bob, active)
values ('c3000000-0000-4000-8000-000000000010', 'c2000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000001', 'Instalación eléctrica', 'Servicio eléctrico seguro para hogares de Santa Cruz.', 'fixed', 250, true);

select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000011', true);
insert into public.worker_profiles (id, profile_id, bio, years_experience, approval_status)
values ('c2000000-0000-4000-8000-000000000011', 'c1000000-0000-4000-8000-000000000011', 'Profesional de plomería con atención domiciliaria segura y responsable.', 6, 'draft');
insert into public.worker_locations (worker_id, private_location, public_area_label, city, department, country_code, service_radius_m)
values ('c2000000-0000-4000-8000-000000000011', 'SRID=4326;POINT(-63.19 -17.79)'::extensions.geography, 'Centro', 'Santa Cruz de la Sierra', 'Santa Cruz', 'BO', 12000);
insert into public.worker_services (id, worker_id, category_id, title, description, pricing_type, price_bob, active)
values ('c3000000-0000-4000-8000-000000000011', 'c2000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000002', 'Plomería domiciliaria', 'Reparación de tuberías y conexiones residenciales.', 'hourly', 80, true);

select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000012', true);
insert into public.worker_profiles (id, profile_id, bio, years_experience, approval_status)
values ('c2000000-0000-4000-8000-000000000012', 'c1000000-0000-4000-8000-000000000012', 'Profesional de limpieza con experiencia en espacios residenciales amplios.', 4, 'draft');
insert into public.worker_locations (worker_id, private_location, public_area_label, city, department, country_code, service_radius_m)
values ('c2000000-0000-4000-8000-000000000012', 'SRID=4326;POINT(-63.20 -17.80)'::extensions.geography, 'Norte', 'Santa Cruz de la Sierra', 'Santa Cruz', 'BO', 9000);
insert into public.worker_services (id, worker_id, category_id, title, description, pricing_type, price_bob, active)
values ('c3000000-0000-4000-8000-000000000012', 'c2000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000003', 'Limpieza residencial', 'Limpieza programada para hogares y departamentos.', 'daily', 180, true);

select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000013', true);
insert into public.worker_profiles (id, profile_id, bio, years_experience, approval_status)
values ('c2000000-0000-4000-8000-000000000013', 'c1000000-0000-4000-8000-000000000013', 'Perfil todavía no aprobado y fuera del marketplace público vigente.', 2, 'draft');
insert into public.worker_locations (worker_id, private_location, public_area_label, city, department, country_code, service_radius_m)
values ('c2000000-0000-4000-8000-000000000013', 'SRID=4326;POINT(-63.21 -17.81)'::extensions.geography, 'Sur', 'Santa Cruz de la Sierra', 'Santa Cruz', 'BO', 7000);
insert into public.worker_services (id, worker_id, category_id, title, description, pricing_type, price_bob, active)
values ('c3000000-0000-4000-8000-000000000013', 'c2000000-0000-4000-8000-000000000013', '00000000-0000-4000-8000-000000000001', 'Servicio no aprobado', 'Este servicio no puede exponerse todavía al público.', 'quote', null, true);

select set_config('request.jwt.claim.sub', '', true);
update public.worker_profiles set approval_status = 'approved'
where id in (
  'c2000000-0000-4000-8000-000000000010',
  'c2000000-0000-4000-8000-000000000011',
  'c2000000-0000-4000-8000-000000000012'
);

-- Authentication and creation.
set local role anon;
select throws_ok($sql$select * from public.add_worker_favorite(
  'c2000000-0000-4000-8000-000000000010')$sql$,
  '42501', 'permission denied for function add_worker_favorite', 'anonymous cannot add favorites');
select throws_ok($sql$select * from public.list_my_worker_favorites(null, null, 20)$sql$,
  '42501', 'permission denied for function list_my_worker_favorites', 'anonymous cannot list favorites');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000003', true);
select throws_ok($sql$select * from public.add_worker_favorite(
  'c2000000-0000-4000-8000-000000000010')$sql$,
  '42501', 'active confirmed account required', 'unconfirmed account cannot add favorites');
select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000004', true);
select throws_ok($sql$select * from public.add_worker_favorite(
  'c2000000-0000-4000-8000-000000000010')$sql$,
  '42501', 'active confirmed account required', 'suspended account cannot add favorites');

select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000001', true);
select is((select worker_id from public.add_worker_favorite(
  'c2000000-0000-4000-8000-000000000010')),
  'c2000000-0000-4000-8000-000000000010'::uuid, 'active caller adds an eligible worker');
reset role;
select is((select profile_id from public.favorites
  where worker_id = 'c2000000-0000-4000-8000-000000000010'),
  'c1000000-0000-4000-8000-000000000001'::uuid, 'favorite owner is derived from auth.uid');
set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000001', true);
select lives_ok($sql$select * from public.add_worker_favorite(
  'c2000000-0000-4000-8000-000000000010')$sql$,
  'duplicate favorite submission is idempotent');
reset role;
select is((select count(*)::integer from public.favorites
  where profile_id = 'c1000000-0000-4000-8000-000000000001'
    and worker_id = 'c2000000-0000-4000-8000-000000000010'), 1,
  'composite primary key prevents duplicate favorite rows');
select ok((select created_at is not null from public.favorites
  where profile_id = 'c1000000-0000-4000-8000-000000000001'
    and worker_id = 'c2000000-0000-4000-8000-000000000010'),
  'favorite timestamp is generated by PostgreSQL');
set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000001', true);
select throws_ok($sql$select * from public.add_worker_favorite(
  'c2000000-0000-4000-8000-000000000013')$sql$,
  'P0002', 'public worker not available', 'ineligible worker cannot be added');
reset role;
select is((select count(*)::integer from public.favorites
  where worker_id = 'c2000000-0000-4000-8000-000000000013'), 0,
  'failed ineligible add leaves no favorite');
select is((select count(*)::integer from public.notifications), 0,
  'favorites do not notify the worker');

-- Multiple favorites and cross-user isolation.
set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000001', true);
select lives_ok($sql$select * from public.add_worker_favorite(
  'c2000000-0000-4000-8000-000000000011')$sql$, 'caller adds second eligible worker');
select lives_ok($sql$select * from public.add_worker_favorite(
  'c2000000-0000-4000-8000-000000000012')$sql$, 'caller adds third eligible worker');
select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000002', true);
select lives_ok($sql$select * from public.add_worker_favorite(
  'c2000000-0000-4000-8000-000000000010')$sql$, 'another caller may independently favorite the same worker');
reset role;
select is((select count(*)::integer from public.favorites
  where worker_id = 'c2000000-0000-4000-8000-000000000010'), 2,
  'same worker can belong to independent owner lists');

update public.favorites set created_at = case worker_id
  when 'c2000000-0000-4000-8000-000000000010' then '2026-10-04 10:00:00+00'::timestamptz
  when 'c2000000-0000-4000-8000-000000000011' then '2026-10-04 11:00:00+00'::timestamptz
  when 'c2000000-0000-4000-8000-000000000012' then '2026-10-04 12:00:00+00'::timestamptz
  else created_at end
where profile_id = 'c1000000-0000-4000-8000-000000000001';

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000001', true);
select ok(public.get_my_worker_favorite_state('c2000000-0000-4000-8000-000000000010'),
  'owner state reports a persisted favorite');
select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000002', true);
select ok(public.get_my_worker_favorite_state('c2000000-0000-4000-8000-000000000010'),
  'second owner state is independent');
select ok(not public.get_my_worker_favorite_state('c2000000-0000-4000-8000-000000000011'),
  'state never leaks another owner list');
select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000001', true);
select is((select count(*)::integer from public.list_my_worker_favorites(null, null, 20)), 3,
  'owner lists exactly their three favorites');
select is((select count(*)::integer
  from (select * from public.list_my_worker_favorites(null, null, 1)) favorite_row
  cross join lateral jsonb_object_keys(to_jsonb(favorite_row)) keys(key)), 11,
  'favorite list returns only the eleven-field public allowlist');
select ok(not exists (
  select 1
  from (select * from public.list_my_worker_favorites(null, null, 1)) favorite_row
  cross join lateral jsonb_object_keys(to_jsonb(favorite_row)) keys(key)
  where key in ('profile_id','private_location','phone','email','approval_status')
), 'favorite list excludes owner, contact, exact location and internal status');
select is((select array_agg(worker_id order by ordinal)::text from (
  select worker_id, row_number() over () ordinal
  from public.list_my_worker_favorites(null, null, 2)
) page), '{c2000000-0000-4000-8000-000000000012,c2000000-0000-4000-8000-000000000011}',
  'favorites are newest-first with deterministic worker tie-breaker');
select is((select array_agg(worker_id order by ordinal)::text from (
  select worker_id, row_number() over () ordinal
  from public.list_my_worker_favorites(
    '2026-10-04 11:00:00+00', 'c2000000-0000-4000-8000-000000000011', 2)
) page), '{c2000000-0000-4000-8000-000000000010}',
  'favorite keyset cursor retrieves only older rows');
select is((select count(*)::integer from (
  select worker_id from public.list_my_worker_favorites(null, null, 2)
  intersect
  select worker_id from public.list_my_worker_favorites(
    '2026-10-04 11:00:00+00', 'c2000000-0000-4000-8000-000000000011', 2)
) overlap), 0, 'adjacent favorite pages do not overlap');
select throws_ok($sql$select * from public.list_my_worker_favorites(now(), null, 20)$sql$,
  '22023', 'complete favorite cursor required', 'partial favorite cursor is rejected');
select throws_ok($sql$select * from public.list_my_worker_favorites(null, null, 51)$sql$,
  '22023', 'favorite page size must be between 1 and 50', 'favorite page size is bounded');
select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000002', true);
select is((select count(*)::integer from public.list_my_worker_favorites(null, null, 20)), 1,
  'second owner sees only their list');

-- A worker that becomes non-public stays removable without leaking profile data.
reset role;
select set_config('request.jwt.claim.sub', '', true);
update public.worker_profiles set approval_status = 'rejected'
where id = 'c2000000-0000-4000-8000-000000000011';
set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000001', true);
select ok(not (select available from public.list_my_worker_favorites(null, null, 20)
  where worker_id = 'c2000000-0000-4000-8000-000000000011'),
  'later-ineligible worker becomes an unavailable favorite placeholder');
select ok((select display_name is null and professional_bio is null
    and public_area_label is null and city is null and service_title is null
  from public.list_my_worker_favorites(null, null, 20)
  where worker_id = 'c2000000-0000-4000-8000-000000000011'),
  'unavailable placeholder exposes no formerly public worker detail');
select is(public.remove_worker_favorite('c2000000-0000-4000-8000-000000000011'), false,
  'owner can remove an unavailable favorite');
reset role;
select is((select count(*)::integer from public.favorites
  where profile_id = 'c1000000-0000-4000-8000-000000000001'
    and worker_id = 'c2000000-0000-4000-8000-000000000011'), 0,
  'unavailable favorite removal persists');
set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000001', true);
select is(public.remove_worker_favorite('c2000000-0000-4000-8000-000000000011'), false,
  'repeated removal is idempotent');
select is(public.remove_worker_favorite('c2000000-0000-4000-8000-000000000010'), false,
  'owner removes their copy of a shared favorite');
reset role;
select is((select count(*)::integer from public.favorites
  where profile_id = 'c1000000-0000-4000-8000-000000000002'
    and worker_id = 'c2000000-0000-4000-8000-000000000010'), 1,
  'removing one owner copy preserves another owner favorite');

-- Direct mutation and blocked-account defenses.
set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000001', true);
select throws_ok($sql$insert into public.favorites (profile_id, worker_id) values (
  'c1000000-0000-4000-8000-000000000002', 'c2000000-0000-4000-8000-000000000012'
)$sql$, '42501', 'permission denied for table favorites', 'direct forged owner insert is denied');
select throws_ok($sql$update public.favorites set created_at = now()$sql$,
  '42501', 'permission denied for table favorites', 'direct favorite update is denied');
select throws_ok($sql$delete from public.favorites$sql$,
  '42501', 'permission denied for table favorites', 'direct favorite delete is denied');
select throws_ok($sql$select * from public.favorites$sql$,
  '42501', 'permission denied for table favorites', 'direct favorite read is denied');
select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000004', true);
select throws_ok($sql$select * from public.list_my_worker_favorites(null, null, 20)$sql$,
  '42501', 'active confirmed account required', 'suspended account cannot list favorites');
select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000001', true);
select is(public.remove_worker_favorite('c2000000-0000-4000-8000-000000000013'), false,
  'idempotent removal does not disclose whether an ineligible target was favorited');
reset role;
select ok(
  to_regprocedure('public.search_marketplace_workers(text,uuid,text,text,double precision,double precision,integer,text,numeric,numeric,smallint,smallint,text,integer,integer)') is not null
  and to_regprocedure('public.get_public_worker_profile(uuid)') is not null
  and to_regprocedure('public.list_my_notifications(timestamptz,uuid,integer)') is not null,
  'existing marketplace, public profile and notification contracts remain present');

-- Frozen report entity and hardened contracts.
select has_table('public', 'user_reports', 'user_reports materializes the frozen entity');
select columns_are('public', 'user_reports', array[
  'id','reporter_profile_id','reported_profile_id','booking_id','reason','description','status',
  'reviewed_by_profile_id','reviewed_at','resolution_notes','created_at','updated_at'
], 'user_reports contains exactly the frozen columns');
select col_is_pk('public', 'user_reports', 'id', 'report id is the primary key');
select fk_ok('public', 'user_reports', 'reporter_profile_id', 'public', 'profiles', 'id', 'reporter references profiles');
select fk_ok('public', 'user_reports', 'reported_profile_id', 'public', 'profiles', 'id', 'reported profile references profiles');
select fk_ok('public', 'user_reports', 'booking_id', 'public', 'bookings', 'id', 'optional context references bookings');
select fk_ok('public', 'user_reports', 'reviewed_by_profile_id', 'public', 'profiles', 'id', 'reviewer references profiles');
select col_has_default('public', 'user_reports', 'status', 'PostgreSQL assigns initial status');
select col_has_default('public', 'user_reports', 'created_at', 'PostgreSQL assigns creation timestamp');
select ok((select relrowsecurity from pg_class where oid = 'public.user_reports'::regclass), 'RLS is enabled on user_reports');
select ok(not has_table_privilege('authenticated', 'public.user_reports', 'SELECT')
  and not has_table_privilege('authenticated', 'public.user_reports', 'INSERT')
  and not has_table_privilege('authenticated', 'public.user_reports', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.user_reports', 'DELETE'),
  'authenticated has no direct report table privileges');
select is((select count(*)::integer from pg_proc where oid in (
  'public.create_profile_report(uuid,text,text)'::regprocedure,
  'public.create_booking_report(uuid,text,text)'::regprocedure,
  'public.list_my_user_reports(timestamptz,uuid,integer)'::regprocedure,
  'public.get_my_user_report(uuid)'::regprocedure,
  'public.list_admin_user_reports(text,timestamptz,uuid,integer)'::regprocedure,
  'public.get_admin_user_report(uuid)'::regprocedure,
  'public.transition_user_report(uuid,text,text)'::regprocedure
) and prosecdef), 7, 'all report contracts are SECURITY DEFINER');
select is((select count(*)::integer from pg_proc procedure, unnest(procedure.proconfig) setting where procedure.oid in (
  'public.create_profile_report(uuid,text,text)'::regprocedure,
  'public.create_booking_report(uuid,text,text)'::regprocedure,
  'public.list_my_user_reports(timestamptz,uuid,integer)'::regprocedure,
  'public.get_my_user_report(uuid)'::regprocedure,
  'public.list_admin_user_reports(text,timestamptz,uuid,integer)'::regprocedure,
  'public.get_admin_user_report(uuid)'::regprocedure,
  'public.transition_user_report(uuid,text,text)'::regprocedure
) and setting = 'search_path=""'), 7, 'all report contracts pin an empty search_path');
select ok(not has_function_privilege('anon', 'public.create_profile_report(uuid,text,text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.create_booking_report(uuid,text,text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.list_my_user_reports(timestamptz,uuid,integer)', 'EXECUTE'),
  'anonymous has no report contracts');

insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data)
values ('c1000000-0000-4000-8000-000000000020', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'mod12-admin@example.invalid', now(), '{"first_name":"Ada","last_name":"Admin"}'::jsonb);
insert into public.user_roles (profile_id, role)
values ('c1000000-0000-4000-8000-000000000020', 'admin');

insert into public.service_requests (id, customer_profile_id, worker_id, worker_service_id, description, job_area_label, status)
values ('c4000000-0000-4000-8000-000000000010', 'c1000000-0000-4000-8000-000000000001',
  'c2000000-0000-4000-8000-000000000010', 'c3000000-0000-4000-8000-000000000010',
  'Trabajo de prueba para validar un reporte con contexto de contratación.', 'Equipetrol', 'accepted');
insert into public.quotes (id, service_request_id, revision_number, amount_bob, status)
values ('c5000000-0000-4000-8000-000000000010', 'c4000000-0000-4000-8000-000000000010', 1, 250, 'accepted');
insert into public.bookings (id, service_request_id, accepted_quote_id, customer_profile_id, worker_id, service_title_snapshot, agreed_price_bob, scheduled_at)
values ('c6000000-0000-4000-8000-000000000010', 'c4000000-0000-4000-8000-000000000010',
  'c5000000-0000-4000-8000-000000000010', 'c1000000-0000-4000-8000-000000000001',
  'c2000000-0000-4000-8000-000000000010', 'Instalación eléctrica', 250, now() + interval '1 day');

set local role anon;
select throws_ok($sql$select * from public.create_profile_report('c2000000-0000-4000-8000-000000000010','other','Descripción suficientemente extensa.')$sql$,
  '42501', 'permission denied for function create_profile_report', 'anonymous cannot create reports');
set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000003', true);
select throws_ok($sql$select * from public.create_profile_report('c2000000-0000-4000-8000-000000000010','other','Descripción suficientemente extensa.')$sql$,
  '42501', 'active confirmed account required', 'unconfirmed account cannot create reports');
select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000004', true);
select throws_ok($sql$select * from public.create_profile_report('c2000000-0000-4000-8000-000000000010','other','Descripción suficientemente extensa.')$sql$,
  '42501', 'active confirmed account required', 'suspended account cannot create reports');
select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000010', true);
select throws_ok($sql$select * from public.create_profile_report('c2000000-0000-4000-8000-000000000010','other','Descripción suficientemente extensa.')$sql$,
  '22023', 'self reporting is not allowed', 'self reporting is forbidden');
select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000002', true);
select throws_ok($sql$select * from public.create_profile_report('c2000000-0000-4000-8000-000000000010','fraud_or_scam','Descripción suficientemente extensa.')$sql$,
  '22023', 'invalid profile report reason', 'profile context rejects booking-only reasons');
select throws_ok($sql$select * from public.create_profile_report('c2000000-0000-4000-8000-000000000013','other','Descripción suficientemente extensa.')$sql$,
  'P0002', 'public worker not available', 'profile reports require a public worker');
select throws_ok($sql$select * from public.create_profile_report('c2000000-0000-4000-8000-000000000010','other','demasiado corto')$sql$,
  '22023', 'report description must contain between 20 and 2000 characters', 'short descriptions are rejected');
select throws_ok($sql$select * from public.create_profile_report('c2000000-0000-4000-8000-000000000010','other',repeat('a',2001))$sql$,
  '22023', 'report description must contain between 20 and 2000 characters', 'overlong descriptions are rejected');
select lives_ok($sql$select * from public.create_profile_report('c2000000-0000-4000-8000-000000000010','other',repeat('😀',20))$sql$,
  'Unicode description length uses characters');
reset role;
select is((select reporter_profile_id from public.user_reports where booking_id is null),
  'c1000000-0000-4000-8000-000000000002'::uuid, 'profile reporter is derived from auth.uid');
select is((select reported_profile_id from public.user_reports where booking_id is null),
  'c1000000-0000-4000-8000-000000000010'::uuid, 'profile target is derived from the public worker');
select is((select status from public.user_reports where booking_id is null), 'open', 'new report starts open');
select ok((select reviewed_by_profile_id is null and reviewed_at is null and resolution_notes is null from public.user_reports where booking_id is null),
  'new report has no client-controlled moderation data');
set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000002', true);
select throws_ok($sql$select * from public.create_profile_report('c2000000-0000-4000-8000-000000000010','other',repeat('😀',20))$sql$,
  '23505', 'duplicate report', 'permanent duplicate context and reason is rejected');
select throws_ok($sql$select * from public.create_booking_report('c6000000-0000-4000-8000-000000000010','service_issue','Descripción suficientemente extensa.')$sql$,
  '42501', 'booking participant required', 'unrelated user cannot report a booking');
select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000001', true);
select lives_ok($sql$select * from public.create_booking_report('c6000000-0000-4000-8000-000000000010','service_issue','  Hubo   un problema importante con el servicio acordado.  ')$sql$,
  'booking participant creates a booking-context report');
reset role;
select is((select reported_profile_id from public.user_reports where booking_id is not null),
  'c1000000-0000-4000-8000-000000000010'::uuid, 'booking report target is the exact counterpart');
select is((select description from public.user_reports where booking_id is not null),
  'Hubo un problema importante con el servicio acordado.', 'server normalizes report whitespace');
select id as profile_report_id from public.user_reports where booking_id is null \gset
select id as customer_booking_report_id from public.user_reports where booking_id is not null \gset
set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000010', true);
select lives_ok($sql$select * from public.create_booking_report('c6000000-0000-4000-8000-000000000010','harassment','Descripción del comportamiento ocurrido durante el trabajo.')$sql$,
  'worker can report the customer counterpart');
reset role;
select id as worker_booking_report_id from public.user_reports where reporter_profile_id = 'c1000000-0000-4000-8000-000000000010' \gset
set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000010', true);
select is((select count(*)::integer from public.list_my_user_reports(null,null,20)), 1, 'reporter lists only their own report');
select is((select count(*)::integer from public.get_my_user_report(:'worker_booking_report_id'::uuid)), 1,
  'reporter can read own report detail');
select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000002', true);
select is((select count(*)::integer from public.list_my_user_reports(null,null,20)), 1, 'another reporter sees only their own report');
select is((select count(*)::integer from public.get_my_user_report(:'customer_booking_report_id'::uuid)), 0,
  'reporter cannot read another reporter detail');
select ok(not exists (select 1 from public.list_my_user_reports(null,null,20) as row
  cross join lateral jsonb_object_keys(to_jsonb(row)) key where key in ('reviewed_by_profile_id','resolution_notes','phone','email','private_location')),
  'reporter contract excludes admin, contact and location fields');
select throws_ok($sql$select * from public.list_my_user_reports(now(),null,20)$sql$,
  '22023', 'complete report cursor required', 'partial reporter cursor is rejected');
select throws_ok($sql$select * from public.list_my_user_reports(null,null,51)$sql$,
  '22023', 'report page size must be between 1 and 50', 'reporter pagination is bounded');
select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000001', true);
select throws_ok($sql$select * from public.list_admin_user_reports(null,null,null,30)$sql$,
  '42501', 'administrator access required', 'non-admin cannot list moderation reports');
select throws_ok(format('select * from public.transition_user_report(%L::uuid,%L,%L)', :'profile_report_id', 'resolved', 'Notas de resolución válidas.'),
  '42501', 'administrator access required', 'non-admin cannot moderate');
reset role;
select set_config('request.jwt.claim.sub', '', true);
select throws_ok($sql$update public.user_reports set status='resolved'$sql$,
  '23514', null, 'table constraint rejects forged terminal state without review metadata');
set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000001', true);
select throws_ok($sql$update public.user_reports set description='contenido modificado'$sql$,
  '42501', 'permission denied for table user_reports', 'reporters cannot edit submitted reports');
select throws_ok($sql$delete from public.user_reports$sql$,
  '42501', 'permission denied for table user_reports', 'reporters cannot delete submitted reports');
select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000020', true);
select is((select count(*)::integer from public.list_admin_user_reports(null,null,null,30)), 3, 'admin lists complete report history');
select is((select count(*)::integer from public.list_admin_user_reports('open',null,null,30)), 3, 'admin status filter returns open reports');
select throws_ok($sql$select * from public.list_admin_user_reports('invalid',null,null,30)$sql$,
  '22023', 'invalid report status', 'admin filter rejects unknown statuses');
select lives_ok(format('select * from public.transition_user_report(%L::uuid,%L,null)', :'profile_report_id', 'under_review'),
  'admin moves open report under review');
reset role;
select is((select status from public.user_reports where booking_id is null), 'under_review', 'moderation transition persists');
select ok(
  (select count(*) = 1 from public.audit_logs where action='user_report.under_review')
  and coalesce((select actor_profile_id='c1000000-0000-4000-8000-000000000020'::uuid
    and metadata->>'previous_status'='open' and metadata->>'resulting_status'='under_review'
    from public.audit_logs where action='user_report.under_review'), false),
  'under-review transition appends exactly one server-derived audit event'
);
set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000020', true);
select throws_ok(format('select * from public.transition_user_report(%L::uuid,%L,null)', :'profile_report_id', 'under_review'),
  '55000', 'report transition is stale or not allowed', 'duplicate moderation attempt is rejected');
select throws_ok(format('select * from public.transition_user_report(%L::uuid,%L,%L)', :'profile_report_id', 'resolved', 'corto'),
  '22023', 'resolution notes must contain between 10 and 1000 characters', 'terminal transition requires valid notes');
select lives_ok(format('select * from public.transition_user_report(%L::uuid,%L,%L)', :'profile_report_id', 'resolved', '  Caso   revisado y concluido sin sanción automática. '),
  'under-review report can be resolved');
reset role;
select is((select resolution_notes from public.user_reports where booking_id is null),
  'Caso revisado y concluido sin sanción automática.', 'resolution notes are normalized');
select is((select count(*)::integer from public.audit_logs where action='user_report.resolved'), 1, 'resolution appends audit event');
set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-4000-8000-000000000020', true);
select throws_ok(format('select * from public.transition_user_report(%L::uuid,%L,%L)', :'profile_report_id', 'dismissed', 'Intento posterior no permitido.'),
  '55000', 'report transition is stale or not allowed', 'terminal report cannot be processed again');
select lives_ok(format('select * from public.transition_user_report(%L::uuid,%L,%L)', :'customer_booking_report_id', 'dismissed', 'Reporte revisado sin acción en este módulo.'),
  'admin can dismiss directly from open');
reset role;
select is((select count(*)::integer from public.audit_logs where action='user_report.dismissed'), 1, 'dismissal appends audit event');
select ok(
  (select count(*) = 0 from public.notifications where type like '%report%')
  and coalesce((select approval_status='approved' from public.worker_profiles where id='c2000000-0000-4000-8000-000000000010'), false),
  'report moderation creates no automatic notification or sanction and does not alter worker approval'
);

select * from finish();
rollback;
