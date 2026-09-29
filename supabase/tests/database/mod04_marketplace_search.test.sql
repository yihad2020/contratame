-- MOD-04 pgTAP suite. All marketplace fixtures and mutations roll back.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(54);

-- Contract, privileges and supporting indexes.
select ok(to_regprocedure('public.search_marketplace_workers(text,uuid,text,text,double precision,double precision,integer,text,numeric,numeric,smallint,smallint,text,integer,integer)') is not null,
  'marketplace RPC exists with the documented signature');
select ok((select prosecdef from pg_proc where oid = 'public.search_marketplace_workers(text,uuid,text,text,double precision,double precision,integer,text,numeric,numeric,smallint,smallint,text,integer,integer)'::regprocedure),
  'marketplace RPC is SECURITY DEFINER');
select ok(exists (select 1 from pg_proc procedure, unnest(procedure.proconfig) setting
  where procedure.oid = 'public.search_marketplace_workers(text,uuid,text,text,double precision,double precision,integer,text,numeric,numeric,smallint,smallint,text,integer,integer)'::regprocedure
    and setting = 'search_path=""'), 'marketplace RPC has an empty search_path');
select ok(has_function_privilege('authenticated', 'public.search_marketplace_workers(text,uuid,text,text,double precision,double precision,integer,text,numeric,numeric,smallint,smallint,text,integer,integer)', 'EXECUTE'),
  'authenticated may execute the controlled marketplace RPC');
select ok(not has_function_privilege('anon', 'public.search_marketplace_workers(text,uuid,text,text,double precision,double precision,integer,text,numeric,numeric,smallint,smallint,text,integer,integer)', 'EXECUTE'),
  'anonymous clients cannot execute marketplace search');
select ok(
  has_table_privilege('authenticated', 'public.worker_locations', 'SELECT')
  and not has_table_privilege('anon', 'public.worker_locations', 'SELECT')
  and exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'worker_locations'
      and policyname = 'worker_locations_select_owner_or_admin'
      and cmd = 'SELECT'
  ),
  'MOD-02 owner/admin SELECT remains RLS-restricted and anonymous has no table access');
select ok(exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'worker_profiles_marketplace_approved_idx'),
  'approved-worker marketplace index exists');
select ok(exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'worker_services_marketplace_active_idx'),
  'active-service marketplace index exists');
select ok(exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'worker_availability_marketplace_active_day_idx'),
  'availability marketplace index exists');
select ok(exists (select 1 from pg_extension where extname = 'pg_trgm'),
  'PostgreSQL trigram search support is installed');

-- One customer, two eligible workers, six worker-state/account/service exclusions,
-- an unconfirmed caller and a suspended caller.
insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data)
values
  ('40000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'market-customer@example.invalid', now(), '{"first_name":"Cliente","last_name":"Activo"}'::jsonb),
  ('40000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'market-unconfirmed@example.invalid', null, '{"first_name":"Cliente","last_name":"SinConfirmar"}'::jsonb),
  ('40000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'market-blocked@example.invalid', now(), '{"first_name":"Cliente","last_name":"Suspendido"}'::jsonb),
  ('40000000-0000-4000-8000-000000000010', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'market-approved-a@example.invalid', now(), '{"first_name":"Ana","last_name":"Profesional"}'::jsonb),
  ('40000000-0000-4000-8000-000000000011', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'market-approved-b@example.invalid', now(), '{"first_name":"Bruno","last_name":"Trabajador"}'::jsonb),
  ('40000000-0000-4000-8000-000000000012', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'market-draft@example.invalid', now(), '{"first_name":"Dora","last_name":"Borrador"}'::jsonb),
  ('40000000-0000-4000-8000-000000000013', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'market-pending@example.invalid', now(), '{"first_name":"Pedro","last_name":"Pendiente"}'::jsonb),
  ('40000000-0000-4000-8000-000000000014', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'market-rejected@example.invalid', now(), '{"first_name":"Rita","last_name":"Rechazada"}'::jsonb),
  ('40000000-0000-4000-8000-000000000015', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'market-suspended-worker@example.invalid', now(), '{"first_name":"Sonia","last_name":"Suspendida"}'::jsonb),
  ('40000000-0000-4000-8000-000000000016', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'market-inactive-account@example.invalid', now(), '{"first_name":"Inés","last_name":"Inactiva"}'::jsonb),
  ('40000000-0000-4000-8000-000000000017', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'market-inactive-service@example.invalid', now(), '{"first_name":"Iván","last_name":"Servicio"}'::jsonb),
  ('40000000-0000-4000-8000-000000000018', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'market-inactive-category@example.invalid', now(), '{"first_name":"Carla","last_name":"Categoría"}'::jsonb);

update public.profiles set account_status = 'suspended'
where id = '40000000-0000-4000-8000-000000000003';

insert into public.service_categories (id, name, slug, icon_key, active, sort_order)
values ('40000000-0000-4000-8000-000000000900', 'Categoría archivada', 'categoria-archivada-mod04', 'archive', true, 900);

insert into public.worker_profiles (id, profile_id, bio, years_experience, approval_status)
values
  ('41000000-0000-4000-8000-000000000010', '40000000-0000-4000-8000-000000000010', 'Especialista en instalaciones solares y mantenimiento eléctrico responsable.', 9, 'draft'),
  ('41000000-0000-4000-8000-000000000011', '40000000-0000-4000-8000-000000000011', 'Profesional de plomería para reparaciones domiciliarias y comerciales.', 4, 'draft'),
  ('41000000-0000-4000-8000-000000000012', '40000000-0000-4000-8000-000000000012', 'Trabajo profesional todavía en preparación y sin aprobación administrativa.', 3, 'draft'),
  ('41000000-0000-4000-8000-000000000013', '40000000-0000-4000-8000-000000000013', 'Trabajo profesional enviado para revisión administrativa de la plataforma.', 3, 'draft'),
  ('41000000-0000-4000-8000-000000000014', '40000000-0000-4000-8000-000000000014', 'Trabajo profesional rechazado que todavía requiere correcciones adicionales.', 3, 'draft'),
  ('41000000-0000-4000-8000-000000000015', '40000000-0000-4000-8000-000000000015', 'Trabajo profesional suspendido que no puede publicarse en el marketplace.', 3, 'draft'),
  ('41000000-0000-4000-8000-000000000016', '40000000-0000-4000-8000-000000000016', 'Trabajo aprobado cuya cuenta general se encuentra desactivada actualmente.', 3, 'draft'),
  ('41000000-0000-4000-8000-000000000017', '40000000-0000-4000-8000-000000000017', 'Trabajo aprobado que conserva únicamente un servicio marcado como inactivo.', 3, 'draft'),
  ('41000000-0000-4000-8000-000000000018', '40000000-0000-4000-8000-000000000018', 'Trabajo aprobado que pertenece únicamente a una categoría inactiva.', 3, 'draft');

-- Create child rows through the real owner/state protections while workers are drafts.
select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000010', true);
insert into public.worker_locations (worker_id, private_location, public_area_label, city, department, country_code, service_radius_m)
values ('41000000-0000-4000-8000-000000000010', 'SRID=4326;POINT(-63.1800 -17.7800)'::extensions.geography, 'Equipetrol', 'Santa Cruz de la Sierra', 'Santa Cruz', 'BO', 15000);
insert into public.worker_services (id, worker_id, category_id, title, description, pricing_type, price_bob, active)
values
  ('42000000-0000-4000-8000-000000000010', '41000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000001', 'Instalación solar residencial', 'Instalación eléctrica y mantenimiento de paneles solares para viviendas.', 'fixed', 120, true),
  ('42000000-0000-4000-8000-000000000019', '41000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000001', 'Reparación eléctrica urgente', 'Diagnóstico y reparación de instalaciones eléctricas residenciales.', 'hourly', 80, true);
insert into public.worker_availability (id, worker_id, day_of_week, start_time, end_time, active)
values ('43000000-0000-4000-8000-000000000010', '41000000-0000-4000-8000-000000000010', 1, '08:00', '12:00', true);

select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000011', true);
insert into public.worker_locations (worker_id, private_location, public_area_label, city, department, country_code, service_radius_m)
values ('41000000-0000-4000-8000-000000000011', 'SRID=4326;POINT(-63.3000 -17.9000)'::extensions.geography, 'Villa Primero de Mayo', 'Santa Cruz de la Sierra', 'Santa Cruz', 'BO', 50000);
insert into public.worker_services (id, worker_id, category_id, title, description, pricing_type, price_bob, active)
values ('42000000-0000-4000-8000-000000000011', '41000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000002', 'Plomería domiciliaria', 'Reparación de tuberías, grifos y conexiones de agua domiciliarias.', 'daily', 250, true);
insert into public.worker_availability (id, worker_id, day_of_week, start_time, end_time, active)
values ('43000000-0000-4000-8000-000000000011', '41000000-0000-4000-8000-000000000011', 2, '09:00', '13:00', true);

-- Insert the excluded fixtures individually so owner/state triggers see the correct caller.
select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000012', true);
insert into public.worker_locations values ('41000000-0000-4000-8000-000000000012', 'SRID=4326;POINT(-63.18 -17.78)'::extensions.geography, null, 'Centro', 'Santa Cruz de la Sierra', 'Santa Cruz', 'BO', 5000, now());
insert into public.worker_services values ('42000000-0000-4000-8000-000000000012', '41000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000001', 'Servicio en borrador', 'Descripción válida para servicio todavía en borrador.', 'quote', null, true, now(), now());
select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000013', true);
insert into public.worker_locations values ('41000000-0000-4000-8000-000000000013', 'SRID=4326;POINT(-63.18 -17.78)'::extensions.geography, null, 'Centro', 'Santa Cruz de la Sierra', 'Santa Cruz', 'BO', 5000, now());
insert into public.worker_services values ('42000000-0000-4000-8000-000000000013', '41000000-0000-4000-8000-000000000013', '00000000-0000-4000-8000-000000000001', 'Servicio pendiente', 'Descripción válida para servicio todavía pendiente.', 'quote', null, true, now(), now());
select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000014', true);
insert into public.worker_locations values ('41000000-0000-4000-8000-000000000014', 'SRID=4326;POINT(-63.18 -17.78)'::extensions.geography, null, 'Centro', 'Santa Cruz de la Sierra', 'Santa Cruz', 'BO', 5000, now());
insert into public.worker_services values ('42000000-0000-4000-8000-000000000014', '41000000-0000-4000-8000-000000000014', '00000000-0000-4000-8000-000000000001', 'Servicio rechazado', 'Descripción válida para servicio todavía rechazado.', 'quote', null, true, now(), now());
select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000015', true);
insert into public.worker_locations values ('41000000-0000-4000-8000-000000000015', 'SRID=4326;POINT(-63.18 -17.78)'::extensions.geography, null, 'Centro', 'Santa Cruz de la Sierra', 'Santa Cruz', 'BO', 5000, now());
insert into public.worker_services values ('42000000-0000-4000-8000-000000000015', '41000000-0000-4000-8000-000000000015', '00000000-0000-4000-8000-000000000001', 'Servicio suspendido', 'Descripción válida para servicio actualmente suspendido.', 'quote', null, true, now(), now());
select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000016', true);
insert into public.worker_locations values ('41000000-0000-4000-8000-000000000016', 'SRID=4326;POINT(-63.18 -17.78)'::extensions.geography, null, 'Centro', 'Santa Cruz de la Sierra', 'Santa Cruz', 'BO', 5000, now());
insert into public.worker_services values ('42000000-0000-4000-8000-000000000016', '41000000-0000-4000-8000-000000000016', '00000000-0000-4000-8000-000000000001', 'Servicio cuenta inactiva', 'Descripción válida para cuenta general actualmente inactiva.', 'quote', null, true, now(), now());
select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000017', true);
insert into public.worker_locations values ('41000000-0000-4000-8000-000000000017', 'SRID=4326;POINT(-63.18 -17.78)'::extensions.geography, null, 'Centro', 'Santa Cruz de la Sierra', 'Santa Cruz', 'BO', 5000, now());
insert into public.worker_services values ('42000000-0000-4000-8000-000000000017', '41000000-0000-4000-8000-000000000017', '00000000-0000-4000-8000-000000000001', 'Servicio desactivado', 'Descripción válida para servicio marcado como desactivado.', 'quote', null, false, now(), now());
select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000018', true);
insert into public.worker_locations values ('41000000-0000-4000-8000-000000000018', 'SRID=4326;POINT(-63.18 -17.78)'::extensions.geography, null, 'Centro', 'Santa Cruz de la Sierra', 'Santa Cruz', 'BO', 5000, now());
insert into public.worker_services values ('42000000-0000-4000-8000-000000000018', '41000000-0000-4000-8000-000000000018', '40000000-0000-4000-8000-000000000900', 'Servicio categoría archivada', 'Descripción válida para servicio con categoría luego archivada.', 'quote', null, true, now(), now());

select set_config('request.jwt.claim.sub', '', true);
update public.worker_profiles set approval_status = case id
  when '41000000-0000-4000-8000-000000000010' then 'approved'
  when '41000000-0000-4000-8000-000000000011' then 'approved'
  when '41000000-0000-4000-8000-000000000012' then 'draft'
  when '41000000-0000-4000-8000-000000000013' then 'pending_approval'
  when '41000000-0000-4000-8000-000000000014' then 'rejected'
  when '41000000-0000-4000-8000-000000000015' then 'suspended'
  else 'approved' end
where id::text like '41000000-0000-4000-8000-%';
update public.profiles set account_status = 'deactivated'
where id = '40000000-0000-4000-8000-000000000016';
update public.service_categories set active = false
where id = '40000000-0000-4000-8000-000000000900';

-- Execute as a normal active customer. Direct RLS stays private while the RPC
-- exposes only its explicit return type.
set local role authenticated;
select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000001', true);

select is((select count(*)::integer from public.search_marketplace_workers(p_limit => 20)), 2,
  'only the two eligible approved workers are discoverable');
select ok(exists (select 1 from public.search_marketplace_workers(p_limit => 20)
  where worker_id = '41000000-0000-4000-8000-000000000010'), 'approved active worker A appears');
select is((select count(*)::integer from public.search_marketplace_workers(p_limit => 20)),
  (select count(distinct worker_id)::integer from public.search_marketplace_workers(p_limit => 20)),
  'multiple matching services do not duplicate a worker');
select is((select display_name from public.search_marketplace_workers(p_category_id => '00000000-0000-4000-8000-000000000001', p_limit => 20)),
  'Ana P.', 'public display name minimizes the family name');
select ok(not exists (select 1 from public.search_marketplace_workers(p_limit => 20) result
  where to_jsonb(result) ?| array['private_location', 'public_location']),
  'RPC output has no private or public coordinate key');
select ok(not exists (select 1 from public.search_marketplace_workers(p_limit => 20) result
  where to_jsonb(result) ?| array['profile_snapshot', 'approval_status', 'account_status', 'admin_notes']),
  'RPC output has no approval or internal status data');
select ok(not exists (select 1 from public.search_marketplace_workers(p_limit => 20) result
  where to_jsonb(result) ?| array['profile_id', 'email', 'phone', 'first_name', 'last_name']),
  'RPC output has no private account fields');
select ok(not exists (select 1 from public.search_marketplace_workers(p_limit => 20)
  where worker_id = '41000000-0000-4000-8000-000000000012'), 'draft worker is excluded');
select ok(not exists (select 1 from public.search_marketplace_workers(p_limit => 20)
  where worker_id = '41000000-0000-4000-8000-000000000013'), 'pending worker is excluded');
select ok(not exists (select 1 from public.search_marketplace_workers(p_limit => 20)
  where worker_id = '41000000-0000-4000-8000-000000000014'), 'rejected worker is excluded');
select ok(not exists (select 1 from public.search_marketplace_workers(p_limit => 20)
  where worker_id = '41000000-0000-4000-8000-000000000015'), 'suspended worker is excluded');
select ok(not exists (select 1 from public.search_marketplace_workers(p_limit => 20)
  where worker_id = '41000000-0000-4000-8000-000000000016'), 'inactive account worker is excluded');
select ok(not exists (select 1 from public.search_marketplace_workers(p_limit => 20)
  where worker_id = '41000000-0000-4000-8000-000000000017'), 'inactive service worker is excluded');
select ok(not exists (select 1 from public.search_marketplace_workers(p_limit => 20)
  where worker_id = '41000000-0000-4000-8000-000000000018'), 'inactive category worker is excluded');
select is((select count(*)::integer from public.search_marketplace_workers(
  p_category_id => '00000000-0000-4000-8000-000000000002', p_limit => 20)), 1,
  'category filter returns the matching active category');
select is((select worker_id from public.search_marketplace_workers(p_query => 'SOLAR', p_limit => 20)),
  '41000000-0000-4000-8000-000000000010'::uuid, 'text search is case-insensitive over service title');
select is((select worker_id from public.search_marketplace_workers(p_query => 'comerciales', p_limit => 20)),
  '41000000-0000-4000-8000-000000000011'::uuid, 'text search matches professional bio');
select is((select count(*)::integer from public.search_marketplace_workers(p_city => 'santa cruz de la sierra', p_limit => 20)), 2,
  'city filtering is case-insensitive');
select is((select count(*)::integer from public.search_marketplace_workers(p_department => 'SANTA CRUZ', p_limit => 20)), 2,
  'department filtering is case-insensitive');
select is((select worker_id from public.search_marketplace_workers(p_pricing_type => 'daily', p_limit => 20)),
  '41000000-0000-4000-8000-000000000011'::uuid, 'pricing type filters matched services');
select is((select worker_id from public.search_marketplace_workers(p_min_price_bob => 100, p_max_price_bob => 150, p_limit => 20)),
  '41000000-0000-4000-8000-000000000010'::uuid, 'price range filters priced services');
select is((select worker_id from public.search_marketplace_workers(p_min_years_experience => 8::smallint, p_limit => 20)),
  '41000000-0000-4000-8000-000000000010'::uuid, 'minimum experience filter is enforced');
select is((select worker_id from public.search_marketplace_workers(p_availability_day => 2::smallint, p_limit => 20)),
  '41000000-0000-4000-8000-000000000011'::uuid, 'availability day requires an active matching range');
select is((select count(*)::integer from public.search_marketplace_workers(
  p_latitude => -17.781, p_longitude => -63.181, p_radius_m => 5000, p_limit => 20)), 1,
  'PostGIS proximity and optional search radius exclude the distant worker');
select ok((select distance_m between 1 and 5000 from public.search_marketplace_workers(
  p_latitude => -17.781, p_longitude => -63.181, p_radius_m => 5000, p_limit => 20)),
  'safe rounded distance is returned without coordinates');
select is((select total_count from public.search_marketplace_workers(p_limit => 1, p_offset => 0)), 2::bigint,
  'paginated rows include the full eligible total');
select is((select count(*)::integer from public.search_marketplace_workers(p_limit => 1, p_offset => 0)), 1,
  'page limit bounds the first page');
select isnt((select worker_id from public.search_marketplace_workers(p_limit => 1, p_offset => 0)),
  (select worker_id from public.search_marketplace_workers(p_limit => 1, p_offset => 1)),
  'consecutive pages do not duplicate workers');
select is(
  (select array(select worker_id from public.search_marketplace_workers(p_limit => 20))),
  (select array(select worker_id from public.search_marketplace_workers(p_limit => 20))),
  'default ordering is deterministic');
select is((select count(*)::integer from public.search_marketplace_workers(p_query => 'resultado inexistente', p_limit => 20)), 0,
  'unmatched filters return an empty result');
select throws_ok($sql$select * from public.search_marketplace_workers(p_latitude => -17.78)$sql$, '22023',
  'latitude and longitude must be supplied together', 'partial coordinates are rejected');
select throws_ok($sql$select * from public.search_marketplace_workers(p_min_price_bob => 300, p_max_price_bob => 100)$sql$, '22023',
  'minimum price must not exceed maximum price', 'invalid price range is rejected');
select throws_ok($sql$select * from public.search_marketplace_workers(p_sort => 'distance')$sql$, '22023',
  'distance sort requires customer coordinates', 'distance sort cannot run without a customer location');
select throws_ok($sql$select * from public.search_marketplace_workers(p_sort => 'price_asc')$sql$, '22023',
  'price sort requires one comparable priced service type', 'price sort requires a comparable pricing type');
select throws_ok($sql$select * from public.search_marketplace_workers(p_limit => 21)$sql$, '22023',
  'page size must be between 1 and 20', 'page size cannot bypass the backend maximum');
select is((select count(*)::integer from public.worker_locations), 0,
  'ordinary customer still cannot read exact worker locations directly');
select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000010', true);
select is((select count(*)::integer from public.worker_locations
  where worker_id = '41000000-0000-4000-8000-000000000011'), 0,
  'worker A cannot read worker B private location through the MOD-02 owner policy');
select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000001', true);
select is((select count(*)::integer from public.worker_approval_requests), 0,
  'ordinary customer cannot read private approval data directly');
select ok(not exists (
  select 1 from (
    select * from public.search_marketplace_workers(p_limit => 1, p_offset => 0)
    union all
    select * from public.search_marketplace_workers(p_limit => 1, p_offset => 1)
  ) pages
  where pages.worker_id not in (
    '41000000-0000-4000-8000-000000000010'::uuid,
    '41000000-0000-4000-8000-000000000011'::uuid
  )
), 'pagination cannot bypass eligibility rules');
select is((select worker_id from public.search_marketplace_workers(
  p_latitude => -17.781, p_longitude => -63.181, p_sort => 'distance', p_limit => 1)),
  '41000000-0000-4000-8000-000000000010'::uuid, 'distance sorting returns the nearest eligible worker first');
select is((select worker_id from public.search_marketplace_workers(p_sort => 'experience_desc', p_limit => 1)),
  '41000000-0000-4000-8000-000000000010'::uuid, 'experience sorting returns the most experienced worker first');
select is((select service_id from public.search_marketplace_workers(
  p_pricing_type => 'fixed', p_sort => 'price_asc', p_limit => 20)),
  '42000000-0000-4000-8000-000000000010'::uuid, 'price sorting works within one comparable pricing type');

select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000002', true);
select throws_ok('select * from public.search_marketplace_workers()', '42501',
  'active confirmed account required', 'unconfirmed customer cannot search');
select set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000003', true);
select throws_ok('select * from public.search_marketplace_workers()', '42501',
  'active confirmed account required', 'suspended customer cannot search');

reset role;
select * from finish();
rollback;
