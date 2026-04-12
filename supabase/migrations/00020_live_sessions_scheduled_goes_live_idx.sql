-- Index rows that have a scheduled start time. App only sets `goes_live_at` for SCHEDULED
-- sessions (ACTIVE boards keep it null), so this matches the activation query well.
-- We avoid `(status)::text` or `'SCHEDULED'::live_session_status` in the predicate: PG requires
-- index predicates to use IMMUTABLE expressions (enum casts are not).

drop index if exists public.live_sessions_scheduled_goes_live_idx;

create index live_sessions_scheduled_goes_live_idx
  on public.live_sessions (goes_live_at)
  where goes_live_at is not null;
