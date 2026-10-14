-- Peepals community accounts and photos.
-- Guests (no session, or an anonymous session from older app versions) can read everything.
-- Writing reviews, adding toilets and uploading photos needs a real account (Google, Apple or email).

-- true for a signed-in, non-anonymous user.
create function public.is_member() returns boolean
language sql stable set search_path = ''
as $$
  select auth.uid() is not null
     and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false;
$$;

-- Reviews: members only.
drop policy "Users add their own reviews" on public.reviews;
drop policy "Users edit their own reviews" on public.reviews;
create policy "Members add their own reviews" on public.reviews
  for insert to authenticated
  with check ((select auth.uid()) = user_id and (select public.is_member()));
create policy "Members edit their own reviews" on public.reviews
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id and (select public.is_member()));

-- User-added toilets: members only.
drop policy "Users add toilets as themselves" on public.user_toilets;
create policy "Members add toilets as themselves" on public.user_toilets
  for insert to authenticated
  with check ((select auth.uid()) = created_by and (select public.is_member()));

-- Photos: files live in the public `toilet-photos` bucket under "<user id>/...",
-- and this table links each file to a toilet.
create table public.toilet_photos (
  id uuid primary key default gen_random_uuid(),
  toilet_id text not null check (char_length(toilet_id) <= 100),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  path text not null unique check (char_length(path) <= 300),
  created_at timestamptz not null default now()
);
create index toilet_photos_toilet_id_idx on public.toilet_photos (toilet_id, created_at desc);

alter table public.toilet_photos enable row level security;
create policy "Photos are public" on public.toilet_photos
  for select using (true);
create policy "Members add photos from their own folder" on public.toilet_photos
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and (select public.is_member())
    and split_part(path, '/', 1) = (select auth.uid())::text
  );
create policy "Members delete their own photos" on public.toilet_photos
  for delete to authenticated using ((select auth.uid()) = user_id);

grant select on public.toilet_photos to anon, authenticated;
grant insert, delete on public.toilet_photos to authenticated;

-- Storage bucket: public read (served by URL), 5 MB images only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('toilet-photos', 'toilet-photos', true, 5242880, array['image/jpeg', 'image/png']);

create policy "Members upload toilet photos to their own folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'toilet-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.is_member())
  );
create policy "Members delete their own toilet photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'toilet-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
