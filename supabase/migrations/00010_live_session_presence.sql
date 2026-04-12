-- Track who has a live game page open (heartbeat) to warn when multiple people score the same match.

create table if not exists public.live_session_presence (
  session_id uuid not null references public.live_sessions (id) on delete cascade,
  viewer_key text not null,
  last_seen_at timestamptz not null default now(),
  primary key (session_id, viewer_key)
);

create index if not exists live_session_presence_session_seen_idx
  on public.live_session_presence (session_id, last_seen_at desc);
