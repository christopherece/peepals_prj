-- Peepals schema: profiles, reviews, and user-added toilets.
-- Toilets from OpenStreetMap are not stored here; reviews reference them by id ("osm-node-123").

-- Profiles: one per auth user, including anonymous users.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null check (char_length(nickname) between 2 and 30),
  created_at timestamptz not null default now()
);

-- Give every new user a default nickname like "Peepal 4F2A".
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, nickname)
  values (new.id, 'Peepal ' || upper(substr(replace(new.id::text, '-', ''), 1, 4)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Reviews: one per user per toilet (posting again updates it).
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  toilet_id text not null check (char_length(toilet_id) <= 100),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  cleanliness smallint not null check (cleanliness between 1 and 5),
  safety smallint not null check (safety between 1 and 5),
  wait smallint not null check (wait between 1 and 5),
  comment text not null default '' check (char_length(comment) <= 280),
  created_at timestamptz not null default now(),
  unique (toilet_id, user_id)
);
create index reviews_toilet_id_idx on public.reviews (toilet_id);

-- Toilets added by users (missing from OpenStreetMap).
create table public.user_toilets (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  fee boolean,
  access text not null default 'unknown' check (access in ('public', 'customers', 'unknown')),
  wheelchair boolean,
  changing_table boolean,
  gender_neutral boolean,
  opening_hours text check (char_length(opening_hours) <= 200),
  created_at timestamptz not null default now()
);
create index user_toilets_lat_lon_idx on public.user_toilets (latitude, longitude);

-- Row level security: everyone can read; signed-in users (anonymous included) write only their own rows.
alter table public.profiles enable row level security;
alter table public.reviews enable row level security;
alter table public.user_toilets enable row level security;

create policy "Profiles are public" on public.profiles
  for select using (true);
create policy "Users update their own profile" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "Reviews are public" on public.reviews
  for select using (true);
create policy "Users add their own reviews" on public.reviews
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users edit their own reviews" on public.reviews
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users delete their own reviews" on public.reviews
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy "User toilets are public" on public.user_toilets
  for select using (true);
create policy "Users add toilets as themselves" on public.user_toilets
  for insert to authenticated with check ((select auth.uid()) = created_by);

-- Explicit grants; only the nickname column of a profile is editable.
grant select on public.profiles, public.reviews, public.user_toilets to anon, authenticated;
grant update (nickname) on public.profiles to authenticated;
grant insert, update, delete on public.reviews to authenticated;
grant insert on public.user_toilets to authenticated;
