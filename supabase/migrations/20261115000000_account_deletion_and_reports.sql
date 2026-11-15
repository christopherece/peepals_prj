-- Store requirements: members can delete their account in the app (App Store 5.1.1(v), Google Play),
-- and can report offensive reviews, photos and toilets (App Store 1.2, user-generated content).

-- Deletes the calling user. profiles cascades from auth.users, and reviews, user_toilets,
-- toilet_photos and reports cascade from profiles. The app removes the photo files first.
create function public.delete_account() returns void
language sql security definer set search_path = ''
as $$
  delete from auth.users where id = (select auth.uid());
$$;

revoke execute on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;

-- Reports: write-only for members. Read them in the Supabase dashboard (Table Editor → reports)
-- and delete the offending row from reviews / toilet_photos / user_toilets there.
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  target_kind text not null check (target_kind in ('review', 'photo', 'toilet')),
  -- A reviews.id, a toilet_photos.id, or a toilet id like "user-<uuid>" / "osm-node-123".
  target_id text not null check (char_length(target_id) <= 100),
  reason text not null default '' check (char_length(reason) <= 280),
  created_at timestamptz not null default now(),
  unique (reporter_id, target_kind, target_id)
);
create index reports_target_idx on public.reports (target_kind, target_id);

alter table public.reports enable row level security;
-- No select policy: reports are only visible to the project owner.
create policy "Members file their own reports" on public.reports
  for insert to authenticated
  with check ((select auth.uid()) = reporter_id and (select public.is_member()));

grant insert on public.reports to authenticated;
