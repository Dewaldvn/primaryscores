-- 00019 revoked EXECUTE from PUBLIC and only granted postgres + service_role. Many
-- DATABASE_URL pooler / hosted roles are not those names, so the activation RPC failed.
-- Re-open execute to all DB roles (same as typical default for public-schema functions);
-- callers still need SQL access to the DB; this does not expose PostgREST unless you
-- explicitly allow RPC for this function in the API.

grant execute on function public.prssa_activate_scheduled_live_sessions(timestamptz) to public;
