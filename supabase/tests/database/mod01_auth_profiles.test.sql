-- MOD-01 pgTAP contract checks. All setup stays inside this transaction.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(18);

select ok(to_regclass('public.profiles') is not null, 'profiles table exists');
select ok(to_regclass('public.user_roles') is not null, 'user_roles table exists');
select ok(to_regprocedure('public.handle_new_user()') is not null, 'signup provisioning trigger function exists');
select ok(to_regprocedure('public.update_my_profile(text,text,text)') is not null, 'controlled profile update RPC exists');
select ok(to_regprocedure('public.get_my_account_status()') is not null, 'account-status RPC exists');
select ok((select relrowsecurity from pg_class where oid = 'public.profiles'::regclass), 'profiles RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.user_roles'::regclass), 'user_roles RLS enabled');
select is((select count(*)::integer from pg_policies where schemaname = 'public'
  and tablename = 'profiles' and policyname = 'profiles_select_own_active'), 1,
  'one own-active profile SELECT policy exists');
select ok(not has_table_privilege('anon', 'public.profiles', 'SELECT'), 'anon cannot select profiles');
select ok(not has_table_privilege('authenticated', 'public.profiles', 'UPDATE'), 'authenticated has no direct profile UPDATE');
select ok(not has_table_privilege('authenticated', 'public.profiles', 'INSERT'), 'authenticated cannot insert profiles');
select ok(not has_table_privilege('authenticated', 'public.user_roles', 'INSERT,UPDATE,DELETE'),
  'authenticated cannot mutate administrative roles');
select ok(has_function_privilege('authenticated', 'public.update_my_profile(text,text,text)', 'EXECUTE'),
  'authenticated may execute controlled profile update');
select ok((select prosecdef from pg_proc where oid = 'public.handle_new_user()'::regprocedure),
  'signup provisioning function is SECURITY DEFINER');
select ok(exists (select 1 from pg_proc p, unnest(p.proconfig) setting
  where p.oid = 'public.handle_new_user()'::regprocedure and setting = 'search_path=""'),
  'signup provisioning function has an empty search_path');
select ok(to_regprocedure('private.is_current_user_confirmed()') is not null, 'confirmed-account helper exists');
select ok(to_regprocedure('private.is_current_user_active()') is not null, 'active-account helper exists');
select ok(pg_get_functiondef('public.handle_new_user()'::regprocedure) not ilike '%worker_profiles%',
  'normal signup provisioning never creates a worker profile');

select * from finish();
rollback;
