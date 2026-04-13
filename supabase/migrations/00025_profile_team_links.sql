-- Optional link between a user profile and a team (e.g. coach / team manager).

create table if not exists public.profile_team_links (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by_profile_id uuid references public.profiles (id),
  primary key (profile_id, team_id)
);

create index if not exists profile_team_links_team_idx
  on public.profile_team_links (team_id);
