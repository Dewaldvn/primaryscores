-- 1) Deduplicate existing team rows per school/sport/age/label/gender
-- 2) Enforce uniqueness so duplicates cannot be inserted again

-- Keep labels normalized so uniqueness is case-stable.
update public.teams
set team_label = upper(team_label)
where team_label <> upper(team_label);

-- Map duplicate rows to a canonical keeper (oldest created_at, then lowest id).
create temporary table team_dedupe_map on commit drop as
with ranked as (
  select
    id,
    first_value(id) over (
      partition by school_id, sport, age_group, team_label, gender
      order by created_at asc, id asc
    ) as keep_id,
    row_number() over (
      partition by school_id, sport, age_group, team_label, gender
      order by created_at asc, id asc
    ) as rn
  from public.teams
)
select id as dup_id, keep_id
from ranked
where rn > 1;

-- Repoint FK references to the keeper team id.
update public.fixtures f
set home_team_id = m.keep_id
from team_dedupe_map m
where f.home_team_id = m.dup_id;

update public.fixtures f
set away_team_id = m.keep_id
from team_dedupe_map m
where f.away_team_id = m.dup_id;

update public.submissions s
set proposed_home_team_id = m.keep_id
from team_dedupe_map m
where s.proposed_home_team_id = m.dup_id;

update public.submissions s
set proposed_away_team_id = m.keep_id
from team_dedupe_map m
where s.proposed_away_team_id = m.dup_id;

-- Tables with PK(profile_id, team_id): insert remapped rows first, then remove dup-id rows.
insert into public.profile_favourite_teams (profile_id, team_id, created_at)
select p.profile_id, m.keep_id, p.created_at
from public.profile_favourite_teams p
join team_dedupe_map m on p.team_id = m.dup_id
on conflict (profile_id, team_id) do nothing;

delete from public.profile_favourite_teams p
using team_dedupe_map m
where p.team_id = m.dup_id;

insert into public.profile_team_links (profile_id, team_id, created_at, created_by_profile_id)
select l.profile_id, m.keep_id, l.created_at, l.created_by_profile_id
from public.profile_team_links l
join team_dedupe_map m on l.team_id = m.dup_id
on conflict (profile_id, team_id) do nothing;

delete from public.profile_team_links l
using team_dedupe_map m
where l.team_id = m.dup_id;

-- Remove duplicate team rows once all references are repointed.
delete from public.teams t
using team_dedupe_map m
where t.id = m.dup_id;

-- Enforce uniqueness for future inserts/updates.
create unique index if not exists teams_school_sport_age_label_gender_notnull_uq
  on public.teams (school_id, sport, age_group, team_label, gender)
  where gender is not null;

create unique index if not exists teams_school_sport_age_label_gender_null_uq
  on public.teams (school_id, sport, age_group, team_label)
  where gender is null;
