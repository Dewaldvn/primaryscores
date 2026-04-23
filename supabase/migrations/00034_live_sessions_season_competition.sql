-- Optional season/competition on scheduled live sessions so wrap-up submissions can inherit context.

alter table public.live_sessions
  add column if not exists season_id uuid references public.seasons (id),
  add column if not exists competition_id uuid references public.competitions (id);

create index if not exists live_sessions_season_idx
  on public.live_sessions (season_id);

create index if not exists live_sessions_competition_idx
  on public.live_sessions (competition_id);
