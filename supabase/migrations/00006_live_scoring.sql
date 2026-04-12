-- Live scoreboard: public sessions, crowd-sourced votes, majority display; wrap-up → submissions.

do $$ begin
  create type live_session_status as enum ('ACTIVE', 'WRAPUP', 'CLOSED');
exception when duplicate_object then null; end $$;

create table if not exists public.live_sessions (
  id uuid primary key default gen_random_uuid(),
  home_team_name text not null,
  away_team_name text not null,
  venue text,
  status live_session_status not null default 'ACTIVE',
  /** Set when the first score vote is recorded; drives 90m / 100m timers. */
  first_vote_at timestamptz,
  wrapup_started_at timestamptz,
  submission_id uuid references public.submissions (id),
  created_by_user_id uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists live_sessions_status_idx on public.live_sessions (status);
create index if not exists live_sessions_first_vote_idx on public.live_sessions (first_vote_at);

create table if not exists public.live_score_votes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.live_sessions (id) on delete cascade,
  voter_key text not null,
  home_score integer not null,
  away_score integer not null,
  created_at timestamptz not null default now()
);

create index if not exists live_score_votes_session_idx on public.live_score_votes (session_id);
create index if not exists live_score_votes_session_created_idx
  on public.live_score_votes (session_id, created_at desc);

alter table public.submissions
  add column if not exists live_session_id uuid references public.live_sessions (id);

create index if not exists submissions_live_session_idx on public.submissions (live_session_id);

alter table public.live_sessions enable row level security;
alter table public.live_score_votes enable row level security;

-- Read-only for anon/authenticated via PostgREST; server-side Drizzle uses DB role that bypasses RLS.
drop policy if exists "live_sessions_select_all" on public.live_sessions;
create policy "live_sessions_select_all" on public.live_sessions for select using (true);

drop policy if exists "live_score_votes_select_all" on public.live_score_votes;
create policy "live_score_votes_select_all" on public.live_score_votes for select using (true);
