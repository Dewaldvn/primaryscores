alter table public.seasons
  add column if not exists sport public.school_sport;

alter table public.competitions
  add column if not exists sport public.school_sport;

create index if not exists seasons_sport_idx
  on public.seasons (sport);

create index if not exists competitions_sport_idx
  on public.competitions (sport);
