-- MOD-09 — Reseñas posteriores a servicios completados

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id),
  rating smallint not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reviews_booking_id_key unique (booking_id)
);

alter table public.reviews enable row level security;
revoke all on table public.reviews from anon, authenticated;

create or replace function private.prevent_review_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception using errcode = '55000', message = 'submitted reviews are immutable';
end;
$$;

create trigger prevent_review_mutation
  before update or delete on public.reviews
  for each row execute function private.prevent_review_mutation();

create or replace function public.create_booking_review(
  p_booking_id uuid,
  p_rating smallint,
  p_comment text default null
)
returns table (
  review_id uuid,
  booking_id uuid,
  worker_id uuid,
  rating smallint,
  comment text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  booking_row public.bookings%rowtype;
  worker_owner_id uuid;
  clean_comment text := nullif(
    regexp_replace(btrim(coalesce(p_comment, '')), '[[:space:]]+', ' ', 'g'),
    ''
  );
  created_review public.reviews%rowtype;
begin
  if caller_id is null or not private.is_current_user_active() then
    raise exception using errcode = '42501', message = 'active confirmed account required';
  end if;
  if p_booking_id is null then
    raise exception using errcode = '22023', message = 'booking is required';
  end if;
  if p_rating is null or p_rating not between 1 and 5 then
    raise exception using errcode = '22023', message = 'rating must be between 1 and 5';
  end if;

  select booking.* into booking_row
  from public.bookings as booking
  where booking.id = p_booking_id
  for update;

  if booking_row.id is null or booking_row.customer_profile_id <> caller_id then
    raise exception using errcode = '42501', message = 'booking customer required';
  end if;
  if booking_row.status <> 'completed' then
    raise exception using errcode = '55000', message = 'booking is not completed';
  end if;
  if exists (
    select 1 from public.reviews as review
    where review.booking_id = booking_row.id
  ) then
    raise exception using errcode = '23505', message = 'booking already has a review';
  end if;

  select worker.profile_id into worker_owner_id
  from public.worker_profiles as worker
  where worker.id = booking_row.worker_id;

  insert into public.reviews (booking_id, rating, comment)
  values (booking_row.id, p_rating, clean_comment)
  returning * into created_review;

  insert into public.notifications (
    profile_id, type, title, body, related_entity_type, related_entity_id
  ) values (
    worker_owner_id,
    'review_received',
    'Nueva reseña recibida',
    'Un cliente calificó un servicio completado.',
    'review',
    created_review.id
  );

  return query select
    created_review.id,
    created_review.booking_id,
    booking_row.worker_id,
    created_review.rating,
    created_review.comment,
    created_review.created_at;
end;
$$;

create or replace function public.get_my_booking_review(p_booking_id uuid)
returns table (
  review_id uuid,
  booking_id uuid,
  rating smallint,
  comment text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
begin
  if caller_id is null or not private.is_current_user_active() then
    raise exception using errcode = '42501', message = 'active confirmed account required';
  end if;

  return query
  select review.id, review.booking_id, review.rating, review.comment, review.created_at
  from public.reviews as review
  join public.bookings as booking on booking.id = review.booking_id
  join public.worker_profiles as worker on worker.id = booking.worker_id
  where booking.id = p_booking_id
    and (booking.customer_profile_id = caller_id or worker.profile_id = caller_id);
end;
$$;

create or replace function public.get_public_worker_reputation(
  p_worker_id uuid,
  p_offset integer default 0,
  p_limit integer default 10
)
returns table (
  worker_id uuid,
  average_rating numeric,
  review_count bigint,
  reviews jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not private.is_current_user_active() then
    raise exception using errcode = '42501', message = 'active confirmed account required';
  end if;
  if p_offset is null or p_offset < 0 or p_limit is null or p_limit not between 1 and 20 then
    raise exception using errcode = '22023', message = 'invalid review pagination';
  end if;

  return query
  select
    worker.id,
    reputation.average_rating,
    reputation.review_count,
    coalesce(review_page.items, '[]'::jsonb)
  from public.worker_profiles as worker
  join public.profiles as profile on profile.id = worker.profile_id
  join public.worker_locations as location on location.worker_id = worker.id
  left join lateral (
    select
      round(avg(review.rating)::numeric, 2) as average_rating,
      count(*)::bigint as review_count
    from public.reviews as review
    join public.bookings as booking on booking.id = review.booking_id
    where booking.worker_id = worker.id
      and booking.status = 'completed'
  ) as reputation on true
  left join lateral (
    select jsonb_agg(
      jsonb_build_object(
        'review_id', page.id,
        'rating', page.rating,
        'comment', page.comment,
        'created_at', page.created_at
      ) order by page.created_at desc, page.id desc
    ) as items
    from (
      select review.id, review.rating, review.comment, review.created_at
      from public.reviews as review
      join public.bookings as booking on booking.id = review.booking_id
      where booking.worker_id = worker.id
        and booking.status = 'completed'
      order by review.created_at desc, review.id desc
      offset p_offset limit p_limit
    ) as page
  ) as review_page on true
  where worker.id = p_worker_id
    and profile.account_status = 'active'
    and worker.approval_status = 'approved'
    and exists (
      select 1
      from public.worker_services as service
      join public.service_categories as category on category.id = service.category_id
      where service.worker_id = worker.id
        and service.active
        and category.active
    );
end;
$$;

revoke all on function public.create_booking_review(uuid, smallint, text)
  from public, anon;
revoke all on function public.get_my_booking_review(uuid)
  from public, anon;
revoke all on function public.get_public_worker_reputation(uuid, integer, integer)
  from public, anon;

grant execute on function public.create_booking_review(uuid, smallint, text)
  to authenticated;
grant execute on function public.get_my_booking_review(uuid)
  to authenticated;
grant execute on function public.get_public_worker_reputation(uuid, integer, integer)
  to authenticated;

comment on table public.reviews is
  'MOD-09 immutable one-per-booking customer review materialized from the frozen logical model.';
comment on function public.create_booking_review(uuid, smallint, text) is
  'MOD-09 customer-only atomic review creation for a completed booking. Derives customer and worker from the locked booking and creates a persistent worker notification.';
comment on function public.get_my_booking_review(uuid) is
  'MOD-09 participant-only read contract for the immutable review attached to a booking.';
comment on function public.get_public_worker_reputation(uuid, integer, integer) is
  'MOD-09 bounded public-safe reputation contract for an eligible worker. Returns derived aggregate and review allowlist without reviewer identity or booking data.';

