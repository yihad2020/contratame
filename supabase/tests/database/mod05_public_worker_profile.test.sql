-- MOD-05 pgTAP suite. All public-profile fixtures and mutations roll back.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(50);

-- Contract, privileges and Storage boundary.
select ok(to_regprocedure('public.get_public_worker_profile(uuid)') is not null,
  'public worker profile RPC exists with the documented signature');
select ok((select prosecdef from pg_proc where oid = 'public.get_public_worker_profile(uuid)'::regprocedure),
  'public worker profile RPC is SECURITY DEFINER');
select ok(exists (select 1 from pg_proc procedure, unnest(procedure.proconfig) setting
  where procedure.oid = 'public.get_public_worker_profile(uuid)'::regprocedure
    and setting = 'search_path=""'), 'public worker profile RPC has an empty search_path');
select ok(has_function_privilege('authenticated', 'public.get_public_worker_profile(uuid)', 'EXECUTE'),
  'authenticated clients may execute the controlled profile RPC');
select ok(not has_function_privilege('anon', 'public.get_public_worker_profile(uuid)', 'EXECUTE'),
  'anonymous clients cannot execute the profile RPC');
select is((select (array_length(proallargtypes, 1) - pronargs)::integer
  from pg_proc where oid = 'public.get_public_worker_profile(uuid)'::regprocedure), 11,
  'RPC exposes the documented eleven-column allowlist');
select ok((select prosecdef from pg_proc where oid = 'private.can_read_public_worker_portfolio_object(text)'::regprocedure),
  'portfolio object guard is SECURITY DEFINER');
select ok(exists (select 1 from pg_proc procedure, unnest(procedure.proconfig) setting
  where procedure.oid = 'private.can_read_public_worker_portfolio_object(text)'::regprocedure
    and setting = 'search_path=""'), 'portfolio object guard has an empty search_path');
select ok(has_function_privilege('authenticated', 'private.can_read_public_worker_portfolio_object(text)', 'EXECUTE')
    and not has_function_privilege('anon', 'private.can_read_public_worker_portfolio_object(text)', 'EXECUTE'),
  'only authenticated clients may invoke the Storage guard');
select ok(exists (select 1 from pg_policies
  where schemaname = 'storage' and tablename = 'objects'
    and policyname = 'worker_portfolio_objects_select_public_eligible' and cmd = 'SELECT'),
  'public-eligible portfolio SELECT policy exists');
select is((select public from storage.buckets where id = 'worker-portfolio'), false,
  'portfolio bucket remains private');

-- Active customer, blocked callers and one worker whose state is changed below.
insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data)
values
  ('50000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'profile-customer@example.invalid', now(), '{"first_name":"Cliente","last_name":"Activo"}'::jsonb),
  ('50000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'profile-unconfirmed@example.invalid', null, '{"first_name":"Cliente","last_name":"SinConfirmar"}'::jsonb),
  ('50000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'profile-blocked@example.invalid', now(), '{"first_name":"Cliente","last_name":"Suspendido"}'::jsonb),
  ('50000000-0000-4000-8000-000000000010', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'profile-worker@example.invalid', now(), '{"first_name":"Ana","last_name":"Profesional"}'::jsonb);

update public.profiles set account_status = 'suspended'
where id = '50000000-0000-4000-8000-000000000003';

insert into public.service_categories (id, name, slug, icon_key, active, sort_order)
values ('50000000-0000-4000-8000-000000000900', 'Categoría archivada', 'categoria-archivada-mod05', 'archive', true, 900);

insert into public.worker_profiles (id, profile_id, bio, years_experience, approval_status)
values (
  '51000000-0000-4000-8000-000000000010',
  '50000000-0000-4000-8000-000000000010',
  'Especialista en instalaciones eléctricas residenciales con trabajo responsable y seguro.',
  8,
  'draft'
);

-- Create private child data through the real owner/state guards while draft.
select set_config('request.jwt.claim.sub', '50000000-0000-4000-8000-000000000010', true);
insert into public.worker_locations (
  worker_id, private_location, public_location, public_area_label, city, department,
  country_code, service_radius_m
) values (
  '51000000-0000-4000-8000-000000000010',
  'SRID=4326;POINT(-63.1800 -17.7800)'::extensions.geography,
  'SRID=4326;POINT(-63.1810 -17.7810)'::extensions.geography,
  'Equipetrol', 'Santa Cruz de la Sierra', 'Santa Cruz', 'BO', 12000
);

insert into public.worker_services (
  id, worker_id, category_id, title, description, pricing_type, price_bob, active
) values
  ('52000000-0000-4000-8000-000000000010', '51000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000001', 'Instalación eléctrica', 'Instalación eléctrica residencial con materiales acordados.', 'fixed', 180, true),
  ('52000000-0000-4000-8000-000000000011', '51000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000001', 'Reparación urgente', 'Diagnóstico y reparación segura de fallas eléctricas.', 'quote', null, true),
  ('52000000-0000-4000-8000-000000000012', '51000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000001', 'Servicio inactivo', 'Este servicio inactivo no debe aparecer públicamente.', 'hourly', 80, false),
  ('52000000-0000-4000-8000-000000000013', '51000000-0000-4000-8000-000000000010', '50000000-0000-4000-8000-000000000900', 'Categoría inactiva', 'Este servicio pertenece a una categoría posteriormente inactiva.', 'daily', 240, true);

insert into public.worker_availability (
  id, worker_id, day_of_week, start_time, end_time, active
) values
  ('53000000-0000-4000-8000-000000000010', '51000000-0000-4000-8000-000000000010', 1, '08:00', '12:00', true),
  ('53000000-0000-4000-8000-000000000011', '51000000-0000-4000-8000-000000000010', 2, '14:00', '18:00', false);

insert into public.worker_portfolio_items (
  id, worker_id, storage_path, title, description, sort_order
) values
  ('54000000-0000-4000-8000-000000000010', '51000000-0000-4000-8000-000000000010', '51000000-0000-4000-8000-000000000010/54000000-0000-4000-8000-000000000010/image.jpg', 'Tablero terminado', 'Instalación residencial terminada.', 1),
  ('54000000-0000-4000-8000-000000000011', '51000000-0000-4000-8000-000000000010', '51000000-0000-4000-8000-000000000010/54000000-0000-4000-8000-000000000011/image.jpg', 'Cableado seguro', null, 0);

select set_config('request.jwt.claim.sub', '', true);
insert into storage.objects (bucket_id, name, metadata)
values
  ('worker-portfolio', '51000000-0000-4000-8000-000000000010/54000000-0000-4000-8000-000000000010/image.jpg', '{"mimetype":"image/jpeg"}'::jsonb),
  ('worker-portfolio', '51000000-0000-4000-8000-000000000010/54000000-0000-4000-8000-000000000011/image.jpg', '{"mimetype":"image/jpeg"}'::jsonb),
  ('worker-portfolio', '51000000-0000-4000-8000-000000000010/54999999-0000-4000-8000-000000000099/image.jpg', '{"mimetype":"image/jpeg"}'::jsonb);

update public.worker_profiles set approval_status = 'approved'
where id = '51000000-0000-4000-8000-000000000010';
update public.service_categories set active = false
where id = '50000000-0000-4000-8000-000000000900';

set local role authenticated;
select set_config('request.jwt.claim.sub', '50000000-0000-4000-8000-000000000001', true);

select is((select count(*)::integer from public.get_public_worker_profile('51000000-0000-4000-8000-000000000010')), 1,
  'eligible approved worker returns exactly one profile row');
select is((select worker_id from public.get_public_worker_profile('51000000-0000-4000-8000-000000000010')),
  '51000000-0000-4000-8000-000000000010'::uuid, 'profile is keyed by public worker id');
select is((select display_name from public.get_public_worker_profile('51000000-0000-4000-8000-000000000010')),
  'Ana P.', 'display name minimizes the family name');
select is((select professional_bio from public.get_public_worker_profile('51000000-0000-4000-8000-000000000010')),
  'Especialista en instalaciones eléctricas residenciales con trabajo responsable y seguro.',
  'professional biography is exposed');
select is((select years_experience from public.get_public_worker_profile('51000000-0000-4000-8000-000000000010')),
  8::smallint, 'years of experience are exposed');
select is((select concat_ws('|', public_area_label, city, department)
  from public.get_public_worker_profile('51000000-0000-4000-8000-000000000010')),
  'Equipetrol|Santa Cruz de la Sierra|Santa Cruz', 'only public area labels are exposed');
select is((select service_radius_m from public.get_public_worker_profile('51000000-0000-4000-8000-000000000010')),
  12000, 'service radius is exposed without coordinates');
select is((select jsonb_array_length(services) from public.get_public_worker_profile('51000000-0000-4000-8000-000000000010')),
  2, 'only active services in active categories are returned');
select ok(not exists (select 1 from public.get_public_worker_profile('51000000-0000-4000-8000-000000000010') profile,
  jsonb_array_elements(profile.services) service where service ->> 'title' = 'Servicio inactivo'),
  'inactive worker service is excluded');
select ok(not exists (select 1 from public.get_public_worker_profile('51000000-0000-4000-8000-000000000010') profile,
  jsonb_array_elements(profile.services) service where service ->> 'title' = 'Categoría inactiva'),
  'service in an inactive category is excluded');
select is((select (services -> 0 ->> 'title') from public.get_public_worker_profile('51000000-0000-4000-8000-000000000010')),
  'Instalación eléctrica', 'active services use deterministic category/title ordering');
select is((select (services -> 0 ->> 'price_bob')::numeric from public.get_public_worker_profile('51000000-0000-4000-8000-000000000010')),
  180::numeric, 'service pricing is returned without fabrication');
select is((select jsonb_array_length(availability) from public.get_public_worker_profile('51000000-0000-4000-8000-000000000010')),
  1, 'only active weekly availability is returned');
select is((select concat_ws('|', availability -> 0 ->> 'day_of_week', availability -> 0 ->> 'start_time', availability -> 0 ->> 'end_time')
  from public.get_public_worker_profile('51000000-0000-4000-8000-000000000010')),
  '1|08:00|12:00', 'availability contains safe ordered weekday and time values');
select is((select jsonb_array_length(portfolio) from public.get_public_worker_profile('51000000-0000-4000-8000-000000000010')),
  2, 'portfolio metadata is returned');
select is((select portfolio -> 0 ->> 'title' from public.get_public_worker_profile('51000000-0000-4000-8000-000000000010')),
  'Cableado seguro', 'portfolio follows sort order');
select is((select portfolio -> 0 ->> 'storage_path' from public.get_public_worker_profile('51000000-0000-4000-8000-000000000010')),
  '51000000-0000-4000-8000-000000000010/54000000-0000-4000-8000-000000000011/image.jpg',
  'portfolio exposes the private object path needed for controlled URL signing');
select ok(not exists (select 1 from public.get_public_worker_profile('51000000-0000-4000-8000-000000000010') profile,
  jsonb_array_elements(profile.portfolio) item where item ?| array['signed_url', 'signedUrl', 'public_url']),
  'RPC never persists or fabricates a public or signed URL');
select is((select count(*)::integer from public.get_public_worker_profile('51000000-0000-4000-8000-000000000010') profile,
  lateral jsonb_object_keys(to_jsonb(profile)) key
  where key not in ('worker_id', 'display_name', 'professional_bio', 'years_experience',
    'public_area_label', 'city', 'department', 'service_radius_m', 'services', 'availability', 'portfolio')), 0,
  'top-level output contains no field outside the explicit allowlist');
select ok(not exists (select 1 from public.get_public_worker_profile('51000000-0000-4000-8000-000000000010') profile
  where to_jsonb(profile)::text ~ '"(private_location|public_location|exact_location|latitude|longitude)"'),
  'output contains no exact, approximate or raw coordinate key');
select ok(not exists (select 1 from public.get_public_worker_profile('51000000-0000-4000-8000-000000000010') profile
  where to_jsonb(profile)::text ~ '"(approval_status|account_status|profile_snapshot|admin_notes|rejection_reason)"'),
  'output contains no approval or administrative state');
select ok(not exists (select 1 from public.get_public_worker_profile('51000000-0000-4000-8000-000000000010') profile
  where to_jsonb(profile)::text ~ '"(profile_id|email|phone|first_name|last_name|user_id|auth_user_id)"'),
  'output contains no contact or Auth/profile identifier');
select ok(not exists (select 1 from public.get_public_worker_profile('51000000-0000-4000-8000-000000000010') profile
  where to_jsonb(profile)::text ~ '"(is_certified|certification|rating|review_count|reviews)"'),
  'output does not anticipate certification or reviews');
select is((select count(*)::integer from public.get_public_worker_profile('51999999-0000-4000-8000-000000000099')), 0,
  'unknown valid worker id returns an unavailable result without leaking detail');
select is((select count(*)::integer from public.worker_locations), 0,
  'ordinary customer cannot read worker locations directly');
select is((select count(*)::integer from public.worker_profiles), 0,
  'ordinary customer does not gain broad worker-profile SELECT');
select is((select count(*)::integer from storage.objects where bucket_id = 'worker-portfolio'), 2,
  'customer reads only registered objects of the eligible public portfolio');
select is((select count(*)::integer from storage.objects where bucket_id = 'worker-portfolio'
  and name like '%54999999-0000-4000-8000-000000000099%'), 0,
  'unregistered object under an eligible worker prefix remains private');
select set_config('request.jwt.claim.sub', '50000000-0000-4000-8000-000000000001', true);
select is((select count(*)::integer from public.worker_locations
  where worker_id = '51000000-0000-4000-8000-000000000010'), 0,
  'cross-worker private location access remains blocked');

-- Recheck every target eligibility condition independently of discovery.
reset role;
select set_config('request.jwt.claim.sub', '', true);
update public.worker_profiles set approval_status = 'draft' where id = '51000000-0000-4000-8000-000000000010';
set local role authenticated;
select set_config('request.jwt.claim.sub', '50000000-0000-4000-8000-000000000001', true);
select is((select count(*)::integer from public.get_public_worker_profile('51000000-0000-4000-8000-000000000010')), 0,
  'draft worker is unavailable by direct profile lookup');
reset role;
select set_config('request.jwt.claim.sub', '', true);
update public.worker_profiles set approval_status = 'pending_approval' where id = '51000000-0000-4000-8000-000000000010';
set local role authenticated;
select set_config('request.jwt.claim.sub', '50000000-0000-4000-8000-000000000001', true);
select is((select count(*)::integer from public.get_public_worker_profile('51000000-0000-4000-8000-000000000010')), 0,
  'pending worker is unavailable by direct profile lookup');
reset role;
select set_config('request.jwt.claim.sub', '', true);
update public.worker_profiles set approval_status = 'rejected' where id = '51000000-0000-4000-8000-000000000010';
set local role authenticated;
select set_config('request.jwt.claim.sub', '50000000-0000-4000-8000-000000000001', true);
select is((select count(*)::integer from public.get_public_worker_profile('51000000-0000-4000-8000-000000000010')), 0,
  'rejected worker is unavailable by direct profile lookup');
select is((select count(*)::integer from storage.objects where bucket_id = 'worker-portfolio'), 0,
  'portfolio access closes immediately when worker is no longer eligible');
select set_config('request.jwt.claim.sub', '50000000-0000-4000-8000-000000000010', true);
select is((select count(*)::integer from storage.objects where bucket_id = 'worker-portfolio'), 3,
  'existing owner Storage access remains available for the worker');
reset role;
select set_config('request.jwt.claim.sub', '', true);
update public.worker_profiles set approval_status = 'suspended' where id = '51000000-0000-4000-8000-000000000010';
set local role authenticated;
select set_config('request.jwt.claim.sub', '50000000-0000-4000-8000-000000000001', true);
select is((select count(*)::integer from public.get_public_worker_profile('51000000-0000-4000-8000-000000000010')), 0,
  'suspended worker is unavailable by direct profile lookup');
reset role;
select set_config('request.jwt.claim.sub', '', true);
update public.worker_profiles set approval_status = 'approved' where id = '51000000-0000-4000-8000-000000000010';
update public.profiles set account_status = 'deactivated' where id = '50000000-0000-4000-8000-000000000010';
set local role authenticated;
select set_config('request.jwt.claim.sub', '50000000-0000-4000-8000-000000000001', true);
select is((select count(*)::integer from public.get_public_worker_profile('51000000-0000-4000-8000-000000000010')), 0,
  'worker with inactive underlying account is unavailable');
reset role;
select set_config('request.jwt.claim.sub', '', true);
update public.profiles set account_status = 'active' where id = '50000000-0000-4000-8000-000000000010';
update public.service_categories set active = false
where id = '00000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub', '50000000-0000-4000-8000-000000000001', true);
select is((select count(*)::integer from public.get_public_worker_profile('51000000-0000-4000-8000-000000000010')), 0,
  'worker without an active service in an active category is unavailable');

select set_config('request.jwt.claim.sub', '50000000-0000-4000-8000-000000000002', true);
select throws_ok($sql$select * from public.get_public_worker_profile('51000000-0000-4000-8000-000000000010')$sql$,
  '42501', 'active confirmed account required', 'unconfirmed caller cannot read public profiles');
select set_config('request.jwt.claim.sub', '50000000-0000-4000-8000-000000000003', true);
select throws_ok($sql$select * from public.get_public_worker_profile('51000000-0000-4000-8000-000000000010')$sql$,
  '42501', 'active confirmed account required', 'suspended caller cannot read public profiles');

reset role;
select * from finish();
rollback;
