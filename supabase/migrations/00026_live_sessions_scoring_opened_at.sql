-- When live scoring "opens" (immediate ACTIVE row, or SCHEDULED → ACTIVE). Used for wrap-up / auto-submit timers
-- instead of first_vote_at (first submitted score).

alter table public.live_sessions
  add column if not exists scoring_opened_at timestamptz;

update public.live_sessions
set scoring_opened_at = coalesce(first_vote_at, created_at)
where scoring_opened_at is null;

create or replace function public.prssa_activate_scheduled_live_sessions(p_now timestamptz)
returns void
language sql
security definer
set search_path = public
as $$
  update public.live_sessions
  set
    status = 'ACTIVE'::live_session_status,
    updated_at = p_now,
    -- Anchor wrap-up / auto-submit to the scheduled go-live instant (not cron run time).
    scoring_opened_at = coalesce(scoring_opened_at, goes_live_at)
  where status = 'SCHEDULED'::live_session_status
    and goes_live_at is not null
    and goes_live_at <= p_now;
$$;

grant execute on function public.prssa_activate_scheduled_live_sessions(timestamptz) to public;
