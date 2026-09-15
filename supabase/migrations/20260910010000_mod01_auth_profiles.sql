-- MOD-01 — Autenticación y perfiles de usuario

create table public.profiles (
  id uuid primary key references auth.users (id),
  first_name text not null,
  last_name text not null,
  phone text,
  avatar_path text,
  account_status text not null default 'active'
    check (account_status in ('active', 'suspended', 'deactivated')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_account_status_idx on public.profiles (account_status);

create table public.user_roles (
  profile_id uuid not null references public.profiles (id),
  role text not null check (role in ('admin')),
  granted_by_profile_id uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  primary key (profile_id, role)
);

create schema if not exists private;
revoke all on schema private from public;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_first_name text := btrim(coalesce(new.raw_user_meta_data ->> 'first_name', ''));
  new_last_name text := btrim(coalesce(new.raw_user_meta_data ->> 'last_name', ''));
  raw_phone text := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'phone', '')), '');
  new_phone text;
begin
  if char_length(new_first_name) not between 2 and 50 then
    raise exception using errcode = '22023', message = 'first_name must contain between 2 and 50 characters';
  end if;
  if char_length(new_last_name) not between 2 and 80 then
    raise exception using errcode = '22023', message = 'last_name must contain between 2 and 80 characters';
  end if;

  if raw_phone is not null then
    new_phone := regexp_replace(raw_phone, '[[:space:]().-]', '', 'g');
    if new_phone !~ '^\+[1-9][0-9]{7,14}$' then
      raise exception using errcode = '22023', message = 'phone must use international format';
    end if;
  end if;

  insert into public.profiles (id, first_name, last_name, phone)
  values (new.id, new_first_name, new_last_name, new_phone);
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function private.is_current_user_confirmed()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from auth.users
    where id = (select auth.uid()) and email_confirmed_at is not null
  );
$$;

create or replace function private.is_current_user_active()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users as users
    join public.profiles as profiles on profiles.id = users.id
    where users.id = (select auth.uid())
      and users.email_confirmed_at is not null
      and profiles.account_status = 'active'
  );
$$;

revoke all on function private.is_current_user_confirmed() from public, anon;
revoke all on function private.is_current_user_active() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_current_user_confirmed() to authenticated;
grant execute on function private.is_current_user_active() to authenticated;

create or replace function public.get_my_account_status()
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result text;
begin
  if (select auth.uid()) is null or not private.is_current_user_confirmed() then
    raise exception using errcode = '42501', message = 'confirmed account required';
  end if;
  select account_status into result from public.profiles where id = (select auth.uid());
  if result is null then raise exception using errcode = 'P0002', message = 'profile not found'; end if;
  return result;
end;
$$;

revoke all on function public.get_my_account_status() from public, anon;
grant execute on function public.get_my_account_status() to authenticated;

create or replace function public.update_my_profile(
  p_first_name text,
  p_last_name text,
  p_phone text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean_first_name text := btrim(coalesce(p_first_name, ''));
  clean_last_name text := btrim(coalesce(p_last_name, ''));
  clean_phone text := nullif(btrim(coalesce(p_phone, '')), '');
  result public.profiles;
begin
  if (select auth.uid()) is null or not private.is_current_user_active() then
    raise exception using errcode = '42501', message = 'active confirmed account required';
  end if;
  if char_length(clean_first_name) not between 2 and 50 then
    raise exception using errcode = '22023', message = 'first_name must contain between 2 and 50 characters';
  end if;
  if char_length(clean_last_name) not between 2 and 80 then
    raise exception using errcode = '22023', message = 'last_name must contain between 2 and 80 characters';
  end if;
  if clean_phone is not null then
    clean_phone := regexp_replace(clean_phone, '[[:space:]().-]', '', 'g');
    if clean_phone !~ '^\+[1-9][0-9]{7,14}$' then
      raise exception using errcode = '22023', message = 'phone must use international format';
    end if;
  end if;

  update public.profiles
  set first_name = clean_first_name,
      last_name = clean_last_name,
      phone = clean_phone,
      updated_at = now()
  where id = (select auth.uid())
  returning * into result;

  if result.id is null then
    raise exception using errcode = 'P0002', message = 'profile not found';
  end if;
  return result;
end;
$$;

revoke all on function public.update_my_profile(text, text, text) from public, anon;
grant execute on function public.update_my_profile(text, text, text) to authenticated;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.user_roles from anon, authenticated;
grant select on table public.profiles to authenticated;

create policy profiles_select_own_active
on public.profiles
for select
to authenticated
using (id = (select auth.uid()) and private.is_current_user_active());

comment on function public.update_my_profile(text, text, text) is
  'MOD-01 controlled update path. Updates only first_name, last_name and phone for an active confirmed owner.';
