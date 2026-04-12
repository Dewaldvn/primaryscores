-- Optional team logos when live session was started with a school picked from the directory.
alter table public.live_sessions
  add column if not exists home_logo_path text,
  add column if not exists away_logo_path text;
