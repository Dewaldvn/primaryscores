-- Hockey live boards store boys/girls side for icons and duplicate detection.
ALTER TABLE public.live_sessions
  ADD COLUMN IF NOT EXISTS team_gender team_gender NULL;

COMMENT ON COLUMN public.live_sessions.team_gender IS 'For hockey live sessions: MALE or FEMALE. NULL for other sports or legacy rows.';
