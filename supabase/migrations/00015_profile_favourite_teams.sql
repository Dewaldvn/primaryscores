-- Signed-in users can bookmark specific teams (e.g. U13 rugby, U16 hockey girls) for quick access.
create table if not exists public.profile_favourite_teams (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, team_id)
);

create index if not exists profile_favourite_teams_profile_idx
  on public.profile_favourite_teams (profile_id);

alter table public.profile_favourite_teams enable row level security;

drop policy if exists "profile_favourite_teams_select_own" on public.profile_favourite_teams;
create policy "profile_favourite_teams_select_own" on public.profile_favourite_teams
  for select to authenticated using (profile_id = auth.uid());

drop policy if exists "profile_favourite_teams_insert_own" on public.profile_favourite_teams;
create policy "profile_favourite_teams_insert_own" on public.profile_favourite_teams
  for insert to authenticated with check (profile_id = auth.uid());

drop policy if exists "profile_favourite_teams_delete_own" on public.profile_favourite_teams;
create policy "profile_favourite_teams_delete_own" on public.profile_favourite_teams
  for delete to authenticated using (profile_id = auth.uid());
