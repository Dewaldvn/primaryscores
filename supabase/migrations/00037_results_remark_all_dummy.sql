-- Idempotent: mark every result as dummy (e.g. repair or re-backfill after 00036).
-- Requires 00036 (is_dummy column on public.results).
update public.results
set is_dummy = true;
