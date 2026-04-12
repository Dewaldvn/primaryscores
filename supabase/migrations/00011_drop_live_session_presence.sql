-- Revert unused presence tracking; live scoring allows multiple contributors by design.
drop table if exists public.live_session_presence;
