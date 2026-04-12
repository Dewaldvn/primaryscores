-- Scheduled → ACTIVE update was failing under RLS: live_sessions has SELECT-only policies,
-- and some DATABASE_URL roles are not table owners / superuser. Run the transition as the
-- function owner (SECURITY DEFINER) so server jobs and Drizzle always succeed.

create or replace function public.prssa_activate_scheduled_live_sessions(p_now timestamptz)
returns void
language sql
security definer
set search_path = public
as $$
  update public.live_sessions
  set status = 'ACTIVE'::live_session_status, updated_at = p_now
  where status = 'SCHEDULED'::live_session_status
    and goes_live_at is not null
    and goes_live_at <= p_now;
$$;

revoke all on function public.prssa_activate_scheduled_live_sessions(timestamptz) from public;

-- Roles your app may use (Supabase direct / pooler often connects as postgres).
grant execute on function public.prssa_activate_scheduled_live_sessions(timestamptz) to postgres;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.prssa_activate_scheduled_live_sessions(timestamptz) to service_role;
  end if;
end $$;
