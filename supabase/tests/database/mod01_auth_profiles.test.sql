-- Structural database verification for MOD-01. Run with: npx supabase test db
begin;

do $$
declare
  profile_policy_count integer;
begin
  if to_regclass('public.profiles') is null then raise exception 'profiles table is missing'; end if;
  if to_regclass('public.user_roles') is null then raise exception 'user_roles table is missing'; end if;
  if to_regprocedure('public.handle_new_user()') is null then raise exception 'provisioning function is missing'; end if;
  if to_regprocedure('public.update_my_profile(text,text,text)') is null then raise exception 'profile RPC is missing'; end if;
  if to_regprocedure('public.get_my_account_status()') is null then raise exception 'account status RPC is missing'; end if;

  if not (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass) then raise exception 'RLS is disabled on profiles'; end if;
  if not (select relrowsecurity from pg_class where oid = 'public.user_roles'::regclass) then raise exception 'RLS is disabled on user_roles'; end if;

  select count(*) into profile_policy_count from pg_policies
  where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_select_own_active';
  if profile_policy_count <> 1 then raise exception 'expected own-profile select policy'; end if;

  if has_table_privilege('anon', 'public.profiles', 'SELECT') then raise exception 'anon can select profiles'; end if;
  if has_table_privilege('authenticated', 'public.profiles', 'UPDATE') then raise exception 'authenticated has direct profile update'; end if;
  if has_table_privilege('authenticated', 'public.profiles', 'INSERT') then raise exception 'authenticated can insert profiles'; end if;
  if has_table_privilege('authenticated', 'public.user_roles', 'INSERT,UPDATE,DELETE') then raise exception 'authenticated can mutate roles'; end if;
  if not has_function_privilege('authenticated', 'public.update_my_profile(text,text,text)', 'EXECUTE') then raise exception 'authenticated cannot execute controlled update'; end if;
end;
$$;

rollback;
