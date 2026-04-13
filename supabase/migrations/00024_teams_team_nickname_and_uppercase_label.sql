alter table public.teams
  add column if not exists team_nickname text;

update public.teams
set team_label = upper(team_label)
where team_label <> upper(team_label);
