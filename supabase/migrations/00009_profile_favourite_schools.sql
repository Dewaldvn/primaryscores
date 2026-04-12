-- Signed-in users can bookmark schools for quick access to their results and live games.
create table if not exists public.profile_favourite_schools (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  school_id uuid not null references public.schools (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, school_id)
);

create index if not exists profile_favourite_schools_profile_idx
  on public.profile_favourite_schools (profile_id);

alter table public.profile_favourite_schools enable row level security;

drop policy if exists "profile_favourite_schools_select_own" on public.profile_favourite_schools;
create policy "profile_favourite_schools_select_own" on public.profile_favourite_schools
  for select to authenticated using (profile_id = auth.uid());

drop policy if exists "profile_favourite_schools_insert_own" on public.profile_favourite_schools;
create policy "profile_favourite_schools_insert_own" on public.profile_favourite_schools
  for insert to authenticated with check (profile_id = auth.uid());

drop policy if exists "profile_favourite_schools_delete_own" on public.profile_favourite_schools;
create policy "profile_favourite_schools_delete_own" on public.profile_favourite_schools
  for delete to authenticated using (profile_id = auth.uid());
