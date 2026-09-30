-- MOD-06 pgTAP suite. All direct-request fixtures and mutations roll back.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(68);

-- Frozen entities and controlled contracts.
select ok(to_regclass('public.service_requests') is not null, 'service_requests exists');
select ok(to_regclass('public.service_request_locations') is not null, 'service_request_locations exists');
select ok(to_regclass('public.conversations') is not null, 'conversations exists');
select ok(to_regclass('public.notifications') is not null, 'notifications exists');
select ok(to_regprocedure('public.create_service_request(uuid,uuid,text,text,double precision,double precision,date,time,numeric,text)') is not null,
  'atomic creation RPC exists with its documented signature');
select ok(to_regprocedure('public.list_my_service_requests(text,integer,integer)') is not null,
  'participant list RPC exists with its documented signature');
select ok(to_regprocedure('public.get_my_service_request(uuid)') is not null,
  'participant detail RPC exists with its documented signature');
select ok((select prosecdef from pg_proc where oid = 'public.create_service_request(uuid,uuid,text,text,double precision,double precision,date,time,numeric,text)'::regprocedure),
  'creation RPC is SECURITY DEFINER');
select ok((select prosecdef from pg_proc where oid = 'public.list_my_service_requests(text,integer,integer)'::regprocedure),
  'list RPC is SECURITY DEFINER');
select ok((select prosecdef from pg_proc where oid = 'public.get_my_service_request(uuid)'::regprocedure),
  'detail RPC is SECURITY DEFINER');
select ok(not exists (
  select 1 from pg_proc procedure, unnest(procedure.proconfig) setting
  where procedure.oid in (
    'public.create_service_request(uuid,uuid,text,text,double precision,double precision,date,time,numeric,text)'::regprocedure,
    'public.list_my_service_requests(text,integer,integer)'::regprocedure,
    'public.get_my_service_request(uuid)'::regprocedure
  ) and setting <> 'search_path=""'
) and (select count(*) from pg_proc procedure, unnest(procedure.proconfig) setting
  where procedure.oid in (
    'public.create_service_request(uuid,uuid,text,text,double precision,double precision,date,time,numeric,text)'::regprocedure,
    'public.list_my_service_requests(text,integer,integer)'::regprocedure,
    'public.get_my_service_request(uuid)'::regprocedure
  ) and setting = 'search_path=""') = 3,
  'all MOD-06 RPCs pin an empty search_path');
select ok(has_function_privilege('authenticated', 'public.create_service_request(uuid,uuid,text,text,double precision,double precision,date,time,numeric,text)', 'EXECUTE')
    and has_function_privilege('authenticated', 'public.list_my_service_requests(text,integer,integer)', 'EXECUTE')
    and has_function_privilege('authenticated', 'public.get_my_service_request(uuid)', 'EXECUTE'),
  'authenticated clients may execute only the controlled contracts');
select ok(not has_function_privilege('anon', 'public.create_service_request(uuid,uuid,text,text,double precision,double precision,date,time,numeric,text)', 'EXECUTE')
    and not has_function_privilege('anon', 'public.list_my_service_requests(text,integer,integer)', 'EXECUTE')
    and not has_function_privilege('anon', 'public.get_my_service_request(uuid)', 'EXECUTE'),
  'anonymous clients cannot execute MOD-06 contracts');
select ok(not has_table_privilege('anon', 'public.service_requests', 'SELECT')
    and not has_table_privilege('anon', 'public.service_request_locations', 'SELECT')
    and not has_table_privilege('anon', 'public.conversations', 'SELECT')
    and not has_table_privilege('anon', 'public.notifications', 'SELECT'),
  'anonymous clients cannot read any MOD-06 table');
select ok(not has_table_privilege('authenticated', 'public.service_requests', 'INSERT')
    and not has_table_privilege('authenticated', 'public.service_request_locations', 'INSERT')
    and not has_table_privilege('authenticated', 'public.conversations', 'INSERT')
    and not has_table_privilege('authenticated', 'public.notifications', 'INSERT'),
  'authenticated clients cannot forge transactional companion rows directly');
select ok(not has_table_privilege('authenticated', 'public.service_requests', 'UPDATE')
    and not has_table_privilege('authenticated', 'public.service_requests', 'DELETE'),
  'authenticated clients cannot forge request state or delete requests directly');
select ok((select count(*) = 4 from pg_class class
  join pg_namespace namespace on namespace.oid = class.relnamespace
  where namespace.nspname = 'public'
    and class.relname in ('service_requests', 'service_request_locations', 'conversations', 'notifications')
    and class.relrowsecurity), 'all four MOD-06 tables have RLS enabled');
select ok(exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'service_requests' and policyname = 'service_requests_select_participants')
    and exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'service_request_locations' and policyname = 'service_request_locations_select_customer')
    and exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'conversations' and policyname = 'conversations_select_participants')
    and exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'notifications' and policyname = 'notifications_select_receiver'),
  'participant, private-location and receiver policies exist');
select ok(not exists (
  select 1
  from pg_proc procedure, unnest(procedure.proargnames) argument_name
  where procedure.oid = 'public.create_service_request(uuid,uuid,text,text,double precision,double precision,date,time,numeric,text)'::regprocedure
    and argument_name in ('p_customer_profile_id', 'p_status')
),
  'creation accepts neither customer identity nor internal status from the client');

-- Callers and target workers in every relevant eligibility state.
insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data)
values
  ('60000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'request-customer-a@example.invalid', now(), '{"first_name":"Carla","last_name":"Cliente"}'::jsonb),
  ('60000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'request-customer-b@example.invalid', now(), '{"first_name":"Bruno","last_name":"Ajeno"}'::jsonb),
  ('60000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'request-unconfirmed@example.invalid', null, '{"first_name":"Usuario","last_name":"SinConfirmar"}'::jsonb),
  ('60000000-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'request-suspended@example.invalid', now(), '{"first_name":"Usuario","last_name":"Suspendido"}'::jsonb),
  ('60000000-0000-4000-8000-000000000010', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'request-worker-ok@example.invalid', now(), '{"first_name":"Ana","last_name":"Profesional"}'::jsonb),
  ('60000000-0000-4000-8000-000000000011', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'request-worker-other@example.invalid', now(), '{"first_name":"Omar","last_name":"Otro"}'::jsonb),
  ('60000000-0000-4000-8000-000000000012', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'request-worker-draft@example.invalid', now(), '{"first_name":"Dora","last_name":"Borrador"}'::jsonb),
  ('60000000-0000-4000-8000-000000000013', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'request-worker-pending@example.invalid', now(), '{"first_name":"Pedro","last_name":"Pendiente"}'::jsonb),
  ('60000000-0000-4000-8000-000000000014', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'request-worker-rejected@example.invalid', now(), '{"first_name":"Rita","last_name":"Rechazada"}'::jsonb),
  ('60000000-0000-4000-8000-000000000015', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'request-worker-suspended@example.invalid', now(), '{"first_name":"Sonia","last_name":"Suspendida"}'::jsonb),
  ('60000000-0000-4000-8000-000000000016', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'request-worker-inactive@example.invalid', now(), '{"first_name":"Ines","last_name":"Inactiva"}'::jsonb);

update public.profiles set account_status = 'suspended'
where id = '60000000-0000-4000-8000-000000000004';

insert into public.service_categories (id, name, slug, icon_key, active, sort_order)
values ('60000000-0000-4000-8000-000000000900', 'Categoría inactiva MOD-06', 'categoria-inactiva-mod06', 'archive', true, 906);

insert into public.worker_profiles (id, profile_id, bio, years_experience, approval_status)
values
  ('61000000-0000-4000-8000-000000000010', '60000000-0000-4000-8000-000000000010', 'Profesional aprobado para solicitudes directas de instalaciones eléctricas seguras.', 8, 'draft'),
  ('61000000-0000-4000-8000-000000000011', '60000000-0000-4000-8000-000000000011', 'Otro profesional aprobado para verificar el aislamiento entre destinatarios.', 5, 'draft'),
  ('61000000-0000-4000-8000-000000000012', '60000000-0000-4000-8000-000000000012', 'Profesional todavía en borrador que no puede recibir solicitudes directas.', 2, 'draft'),
  ('61000000-0000-4000-8000-000000000013', '60000000-0000-4000-8000-000000000013', 'Profesional pendiente de aprobación que no puede recibir solicitudes nuevas.', 3, 'draft'),
  ('61000000-0000-4000-8000-000000000014', '60000000-0000-4000-8000-000000000014', 'Profesional rechazado que no puede recibir solicitudes hasta nueva aprobación.', 4, 'draft'),
  ('61000000-0000-4000-8000-000000000015', '60000000-0000-4000-8000-000000000015', 'Profesional suspendido que no puede recibir solicitudes directas nuevas.', 6, 'draft'),
  ('61000000-0000-4000-8000-000000000016', '60000000-0000-4000-8000-000000000016', 'Profesional aprobado cuya cuenta general está desactivada y no es elegible.', 7, 'draft');

select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000010', true);
insert into public.worker_locations (
  worker_id, private_location, public_area_label, city, department, country_code, service_radius_m
)
values ('61000000-0000-4000-8000-000000000010', 'SRID=4326;POINT(-63.1800 -17.7800)', 'Equipetrol', 'Santa Cruz de la Sierra', 'Santa Cruz', 'BO', 12000);

insert into public.worker_services (
  id, worker_id, category_id, title, description, pricing_type, price_bob, active
)
values
  ('62000000-0000-4000-8000-000000000010', '61000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000001', 'Instalación eléctrica', 'Instalación residencial con materiales previamente acordados.', 'fixed', 180, true),
  ('62000000-0000-4000-8000-000000000011', '61000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000001', 'Servicio histórico inactivo', 'Servicio que ya no debe admitir solicitudes directas nuevas.', 'quote', null, false),
  ('62000000-0000-4000-8000-000000000013', '61000000-0000-4000-8000-000000000010', '60000000-0000-4000-8000-000000000900', 'Servicio de categoría inactiva', 'Servicio que no puede contratarse porque su categoría está inactiva.', 'daily', 250, true);

select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000011', true);
insert into public.worker_locations (worker_id, private_location, public_area_label, city, department, country_code, service_radius_m)
values ('61000000-0000-4000-8000-000000000011', 'SRID=4326;POINT(-63.1810 -17.7810)', 'Equipetrol', 'Santa Cruz de la Sierra', 'Santa Cruz', 'BO', 12000);
insert into public.worker_services (id, worker_id, category_id, title, description, pricing_type, price_bob, active)
values ('62000000-0000-4000-8000-000000000012', '61000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000001', 'Servicio de otro worker', 'Servicio activo perteneciente exclusivamente al segundo profesional.', 'hourly', 75, true);

select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000012', true);
insert into public.worker_locations (worker_id, private_location, public_area_label, city, department, country_code, service_radius_m)
values ('61000000-0000-4000-8000-000000000012', 'SRID=4326;POINT(-63.1820 -17.7820)', 'Equipetrol', 'Santa Cruz de la Sierra', 'Santa Cruz', 'BO', 12000);
insert into public.worker_services (id, worker_id, category_id, title, description, pricing_type, price_bob, active)
values ('62000000-0000-4000-8000-000000000014', '61000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000001', 'Servicio worker draft', 'Servicio de un profesional que todavía permanece en borrador.', 'quote', null, true);

select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000013', true);
insert into public.worker_locations (worker_id, private_location, public_area_label, city, department, country_code, service_radius_m)
values ('61000000-0000-4000-8000-000000000013', 'SRID=4326;POINT(-63.1830 -17.7830)', 'Equipetrol', 'Santa Cruz de la Sierra', 'Santa Cruz', 'BO', 12000);
insert into public.worker_services (id, worker_id, category_id, title, description, pricing_type, price_bob, active)
values ('62000000-0000-4000-8000-000000000015', '61000000-0000-4000-8000-000000000013', '00000000-0000-4000-8000-000000000001', 'Servicio worker pending', 'Servicio de un profesional cuya aprobación todavía está pendiente.', 'quote', null, true);

select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000014', true);
insert into public.worker_locations (worker_id, private_location, public_area_label, city, department, country_code, service_radius_m)
values ('61000000-0000-4000-8000-000000000014', 'SRID=4326;POINT(-63.1840 -17.7840)', 'Equipetrol', 'Santa Cruz de la Sierra', 'Santa Cruz', 'BO', 12000);
insert into public.worker_services (id, worker_id, category_id, title, description, pricing_type, price_bob, active)
values ('62000000-0000-4000-8000-000000000016', '61000000-0000-4000-8000-000000000014', '00000000-0000-4000-8000-000000000001', 'Servicio worker rejected', 'Servicio de un profesional cuyo perfil fue rechazado en revisión.', 'quote', null, true);

select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000015', true);
insert into public.worker_locations (worker_id, private_location, public_area_label, city, department, country_code, service_radius_m)
values ('61000000-0000-4000-8000-000000000015', 'SRID=4326;POINT(-63.1850 -17.7850)', 'Equipetrol', 'Santa Cruz de la Sierra', 'Santa Cruz', 'BO', 12000);
insert into public.worker_services (id, worker_id, category_id, title, description, pricing_type, price_bob, active)
values ('62000000-0000-4000-8000-000000000017', '61000000-0000-4000-8000-000000000015', '00000000-0000-4000-8000-000000000001', 'Servicio worker suspended', 'Servicio de un profesional suspendido administrativamente.', 'quote', null, true);

select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000016', true);
insert into public.worker_locations (worker_id, private_location, public_area_label, city, department, country_code, service_radius_m)
values ('61000000-0000-4000-8000-000000000016', 'SRID=4326;POINT(-63.1860 -17.7860)', 'Equipetrol', 'Santa Cruz de la Sierra', 'Santa Cruz', 'BO', 12000);
insert into public.worker_services (id, worker_id, category_id, title, description, pricing_type, price_bob, active)
values ('62000000-0000-4000-8000-000000000018', '61000000-0000-4000-8000-000000000016', '00000000-0000-4000-8000-000000000001', 'Servicio cuenta inactiva', 'Servicio de un profesional cuya cuenta general no está activa.', 'quote', null, true);

select set_config('request.jwt.claim.sub', '', true);
update public.worker_profiles set approval_status = case id
  when '61000000-0000-4000-8000-000000000010'::uuid then 'approved'
  when '61000000-0000-4000-8000-000000000011'::uuid then 'approved'
  when '61000000-0000-4000-8000-000000000013'::uuid then 'pending_approval'
  when '61000000-0000-4000-8000-000000000014'::uuid then 'rejected'
  when '61000000-0000-4000-8000-000000000015'::uuid then 'suspended'
  when '61000000-0000-4000-8000-000000000016'::uuid then 'approved'
  else approval_status end;
update public.profiles set account_status = 'deactivated'
where id = '60000000-0000-4000-8000-000000000016';
update public.service_categories set active = false
where id = '60000000-0000-4000-8000-000000000900';

create temporary table mod06_created (label text primary key, id uuid not null);
grant select, insert, update, delete on mod06_created to authenticated;

set local role authenticated;
select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000001', true);

insert into mod06_created (label, id)
select 'first', request_id
from public.create_service_request(
  '61000000-0000-4000-8000-000000000010',
  '62000000-0000-4000-8000-000000000010',
  E'  Necesito   revisar\n el tablero eléctrico.  ',
  '  Equipetrol   Norte  ',
  -17.7812,
  -63.1818,
  '2026-10-15',
  '10:30',
  350.50,
  '  Calle 8,   casa 12  '
);

select is((select status from public.get_my_service_request((select id from mod06_created where label = 'first'))),
  'pending', 'eligible customer creates a pending request');

reset role;
select set_config('request.jwt.claim.sub', '', true);

select is((select customer_profile_id from public.service_requests where id = (select id from mod06_created where label = 'first')),
  '60000000-0000-4000-8000-000000000001'::uuid, 'customer identity is derived from auth.uid()');
select ok((select status = 'pending' and expires_at is null from public.service_requests where id = (select id from mod06_created where label = 'first')),
  'initial status is frozen pending and no expiration policy is invented');
select is((select description from public.service_requests where id = (select id from mod06_created where label = 'first')),
  'Necesito revisar el tablero eléctrico.', 'description whitespace is normalized without truncation');
select is((select job_area_label from public.service_requests where id = (select id from mod06_created where label = 'first')),
  'Equipetrol Norte', 'job area label whitespace is normalized');
select ok((select worker_id = '61000000-0000-4000-8000-000000000010'::uuid
    and worker_service_id = '62000000-0000-4000-8000-000000000010'::uuid
    from public.service_requests where id = (select id from mod06_created where label = 'first')),
  'request preserves the validated worker and service relationship');
select ok((select preferred_date = '2026-10-15'::date and preferred_time = '10:30'::time
    and budget_reference_bob = 350.50
    from public.service_requests where id = (select id from mod06_created where label = 'first')),
  'approved optional schedule and budget fields are stored');
select ok((select abs(extensions.st_y(exact_location::extensions.geometry) - (-17.7812)) < 0.0000001
    and abs(extensions.st_x(exact_location::extensions.geometry) - (-63.1818)) < 0.0000001
    from public.service_request_locations where service_request_id = (select id from mod06_created where label = 'first')),
  'exact request location is stored as the supplied PostGIS point');
select is((select address_text from public.service_request_locations where service_request_id = (select id from mod06_created where label = 'first')),
  'Calle 8, casa 12', 'optional exact address whitespace is normalized');
select is((select count(*)::integer from public.conversations where service_request_id = (select id from mod06_created where label = 'first') and status = 'active'),
  1, 'one active conversation is created atomically with the request');
select is((select count(*)::integer from public.notifications where related_entity_id = (select id from mod06_created where label = 'first')
    and profile_id = '60000000-0000-4000-8000-000000000010' and type = 'service_request_created'),
  1, 'one receiver notification is created atomically for the target worker');

-- Customer and worker participant reads; exact location remains customer-only.
set local role authenticated;
select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000001', true);
select is((select count(*)::integer from public.list_my_service_requests('customer', 0, 12)), 1,
  'requesting customer lists the owned request');
select ok(not exists (select 1 from public.list_my_service_requests('customer', 0, 12) item
  where to_jsonb(item)::text ~ 'exact_(latitude|longitude)|address_text|private_location'),
  'customer list contract contains no exact-location field');
select is((select perspective from public.get_my_service_request((select id from mod06_created where label = 'first'))),
  'customer', 'customer reads the owned request detail');
select ok((select exact_latitude is not null and exact_longitude is not null and address_text = 'Calle 8, casa 12'
  from public.get_my_service_request((select id from mod06_created where label = 'first'))),
  'customer owner receives the private request location in the authorized detail');

select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000010', true);
select is((select count(*)::integer from public.list_my_service_requests('worker', 0, 12)), 1,
  'target worker lists a request addressed to that worker');
select is((select customer_display_name from public.get_my_service_request((select id from mod06_created where label = 'first'))),
  'Carla C.', 'target worker receives only minimized customer identity');
select ok((select exact_latitude is null and exact_longitude is null and address_text is null
  from public.get_my_service_request((select id from mod06_created where label = 'first'))),
  'target worker cannot read exact coordinates or address before booking');

select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000002', true);
select is((select count(*)::integer from public.list_my_service_requests('customer', 0, 12)), 0,
  'unrelated customer list excludes another customer request');
select is((select count(*)::integer from public.get_my_service_request((select id from mod06_created where label = 'first'))), 0,
  'unrelated customer cannot read request detail');

select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000011', true);
select is((select count(*)::integer from public.list_my_service_requests('worker', 0, 12)), 0,
  'unrelated worker list excludes requests addressed to another worker');
select is((select count(*)::integer from public.get_my_service_request((select id from mod06_created where label = 'first'))), 0,
  'unrelated worker cannot read request detail');

reset role;
insert into public.user_roles (profile_id, role) values ('60000000-0000-4000-8000-000000000002', 'admin');
set local role authenticated;
select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000002', true);
select is((select count(*)::integer from public.list_my_service_requests('customer', 0, 12)), 0,
  'admin role does not bypass the frozen participant list contract');
select ok(not has_table_privilege('authenticated', 'public.service_requests', 'UPDATE'),
  'normal authenticated clients cannot forge internal request status');

-- Creation eligibility is always revalidated server-side.
select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000001', true);
select throws_ok($sql$select * from public.create_service_request('61000000-0000-4000-8000-000000000012', '62000000-0000-4000-8000-000000000014', 'Trabajo válido', 'Zona', -17.78, -63.18)$sql$,
  '22023', 'worker or service is not eligible', 'draft worker is rejected');
select throws_ok($sql$select * from public.create_service_request('61000000-0000-4000-8000-000000000013', '62000000-0000-4000-8000-000000000015', 'Trabajo válido', 'Zona', -17.78, -63.18)$sql$,
  '22023', 'worker or service is not eligible', 'pending worker is rejected');
select throws_ok($sql$select * from public.create_service_request('61000000-0000-4000-8000-000000000014', '62000000-0000-4000-8000-000000000016', 'Trabajo válido', 'Zona', -17.78, -63.18)$sql$,
  '22023', 'worker or service is not eligible', 'rejected worker is rejected');
select throws_ok($sql$select * from public.create_service_request('61000000-0000-4000-8000-000000000015', '62000000-0000-4000-8000-000000000017', 'Trabajo válido', 'Zona', -17.78, -63.18)$sql$,
  '22023', 'worker or service is not eligible', 'suspended worker is rejected');
select throws_ok($sql$select * from public.create_service_request('61000000-0000-4000-8000-000000000016', '62000000-0000-4000-8000-000000000018', 'Trabajo válido', 'Zona', -17.78, -63.18)$sql$,
  '22023', 'worker or service is not eligible', 'worker with inactive account is rejected');
select throws_ok($sql$select * from public.create_service_request('61000000-0000-4000-8000-000000000010', '62000000-0000-4000-8000-000000000011', 'Trabajo válido', 'Zona', -17.78, -63.18)$sql$,
  '22023', 'worker or service is not eligible', 'inactive historical service is rejected');
select throws_ok($sql$select * from public.create_service_request('61000000-0000-4000-8000-000000000010', '62000000-0000-4000-8000-000000000012', 'Trabajo válido', 'Zona', -17.78, -63.18)$sql$,
  '22023', 'worker or service is not eligible', 'service belonging to another worker is rejected');
select throws_ok($sql$select * from public.create_service_request('61000000-0000-4000-8000-000000000010', '62000000-0000-4000-8000-000000000013', 'Trabajo válido', 'Zona', -17.78, -63.18)$sql$,
  '22023', 'worker or service is not eligible', 'service in inactive category is rejected');

select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000003', true);
select throws_ok($sql$select * from public.create_service_request('61000000-0000-4000-8000-000000000010', '62000000-0000-4000-8000-000000000010', 'Trabajo válido', 'Zona', -17.78, -63.18)$sql$,
  '42501', 'active confirmed account required', 'unconfirmed customer cannot create a request');
select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000004', true);
select throws_ok($sql$select * from public.create_service_request('61000000-0000-4000-8000-000000000010', '62000000-0000-4000-8000-000000000010', 'Trabajo válido', 'Zona', -17.78, -63.18)$sql$,
  '42501', 'active confirmed account required', 'suspended customer cannot create a request');

-- Input validation rejects empty, malformed and unsupported values.
select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000001', true);
select throws_ok($sql$select * from public.create_service_request('61000000-0000-4000-8000-000000000010', '62000000-0000-4000-8000-000000000010', '   ', 'Zona', -17.78, -63.18)$sql$,
  '22023', 'description must contain between 1 and 2000 characters', 'empty normalized description is rejected');
select throws_ok($sql$select * from public.create_service_request('61000000-0000-4000-8000-000000000010', '62000000-0000-4000-8000-000000000010', 'Trabajo válido', 'Zona', -91, -63.18)$sql$,
  '22023', 'valid latitude and longitude are required', 'out-of-range coordinate is rejected');
select throws_ok($sql$select * from public.create_service_request('61000000-0000-4000-8000-000000000010', '62000000-0000-4000-8000-000000000010', 'Trabajo válido', 'Zona', 'NaN'::double precision, -63.18)$sql$,
  '22023', 'valid latitude and longitude are required', 'NaN coordinate is rejected');
select throws_ok($sql$select * from public.create_service_request('61000000-0000-4000-8000-000000000010', '62000000-0000-4000-8000-000000000010', 'Trabajo válido', 'Zona', -17.78, -63.18, null, null, 0)$sql$,
  '22023', 'budget_reference_bob must be a positive supported amount', 'non-positive optional budget is rejected');

-- Force a failure in the last companion insert to prove transaction rollback.
reset role;
create or replace function private.mod06_test_fail_notification()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.body = 'Recibiste una nueva solicitud directa de servicio.' then
    raise exception 'test notification companion failure';
  end if;
  return new;
end;
$$;
create trigger mod06_test_fail_notification
  before insert on public.notifications
  for each row execute function private.mod06_test_fail_notification();

set local role authenticated;
select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000001', true);
select throws_ok($sql$select * from public.create_service_request('61000000-0000-4000-8000-000000000010', '62000000-0000-4000-8000-000000000010', 'Solicitud que debe revertirse', 'Zona rollback', -17.79, -63.19)$sql$,
  'P0001', 'test notification companion failure', 'failure in a required companion aborts creation');

reset role;
drop trigger mod06_test_fail_notification on public.notifications;
drop function private.mod06_test_fail_notification();
select is((select count(*)::integer from public.service_requests where description = 'Solicitud que debe revertirse'), 0,
  'failed companion leaves no service request');
select ok(not exists (select 1 from public.service_request_locations location
    join public.service_requests request on request.id = location.service_request_id
    where request.job_area_label = 'Zona rollback')
  and not exists (select 1 from public.conversations conversation
    join public.service_requests request on request.id = conversation.service_request_id
    where request.job_area_label = 'Zona rollback')
  and not exists (select 1 from public.notifications where title = 'Nueva solicitud de servicio'
    and related_entity_id not in (select id from public.service_requests)),
  'failed transaction leaves no location, conversation or orphan notification');

-- Deterministic pagination and bounded list parameters.
set local role authenticated;
select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000001', true);
insert into mod06_created (label, id)
select 'second', request_id from public.create_service_request(
  '61000000-0000-4000-8000-000000000010', '62000000-0000-4000-8000-000000000010',
  'Segunda solicitud', 'Centro', -17.782, -63.182
);
insert into mod06_created (label, id)
select 'third', request_id from public.create_service_request(
  '61000000-0000-4000-8000-000000000010', '62000000-0000-4000-8000-000000000010',
  'Tercera solicitud', 'Centro', -17.783, -63.183
);

reset role;
update public.service_requests set created_at = case id
  when (select id from mod06_created where label = 'first') then '2026-09-29 10:00:00+00'::timestamptz
  when (select id from mod06_created where label = 'second') then '2026-09-29 11:00:00+00'::timestamptz
  when (select id from mod06_created where label = 'third') then '2026-09-29 12:00:00+00'::timestamptz
  else created_at end;

set local role authenticated;
select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000001', true);
select is((select request_id from public.list_my_service_requests('customer', 0, 1)),
  (select id from mod06_created where label = 'third'), 'first page returns newest request deterministically');
select is((select request_id from public.list_my_service_requests('customer', 1, 1)),
  (select id from mod06_created where label = 'second'), 'second page returns the next request without duplication');
select ok((select total_count = 3 from public.list_my_service_requests('customer', 0, 1))
    and (select request_id from public.list_my_service_requests('customer', 0, 1))
      <> (select request_id from public.list_my_service_requests('customer', 1, 1)),
  'pagination returns stable total_count and distinct pages');
select throws_ok($sql$select * from public.list_my_service_requests('customer', 0, 21)$sql$,
  '22023', 'limit must be between 1 and 20', 'list limit is bounded');
select throws_ok($sql$select * from public.list_my_service_requests('admin', 0, 12)$sql$,
  '22023', 'perspective must be customer or worker', 'list accepts only frozen participant perspectives');

-- Public MOD-05 remains free of transaction location and frozen status rejects forgery.
select ok(not exists (
  select 1 from public.get_public_worker_profile('61000000-0000-4000-8000-000000000010') profile
  where to_jsonb(profile)::text ~ 'exact_location|address_text|exact_latitude|exact_longitude'
), 'public worker profile remains unable to expose request location');
select ok(not exists (
  select 1 from public.list_my_service_requests('customer', 0, 20) item
  where to_jsonb(item)::text ~ 'exact_location|address_text|exact_latitude|exact_longitude'
), 'request history list remains location-minimized');

reset role;
select throws_ok($sql$
  insert into public.service_requests (
    customer_profile_id, worker_id, worker_service_id, description, job_area_label, status
  ) values (
    '60000000-0000-4000-8000-000000000001',
    '61000000-0000-4000-8000-000000000010',
    '62000000-0000-4000-8000-000000000010',
    'Intento de estado inventado', 'Zona', 'in_progress'
  )
$sql$, '23514', null, 'database status constraint rejects an invented internal state');

select * from finish();
rollback;
