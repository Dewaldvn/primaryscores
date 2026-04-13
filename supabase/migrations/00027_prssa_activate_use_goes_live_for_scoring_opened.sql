-- If 00026 was applied with scoring_opened_at = p_now, align activation with the scheduled start instant.

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
    scoring_opened_at = coalesce(scoring_opened_at, goes_live_at)
  where status = 'SCHEDULED'::live_session_status
    and goes_live_at is not null
    and goes_live_at <= p_now;
$$;

grant execute on function public.prssa_activate_scheduled_live_sessions(timestamptz) to public;
