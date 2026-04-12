-- Optional start time for live boards (scheduled → ACTIVE when due).
-- Optional school nickname (short name) distinct from display name.

do $$ begin
  alter type live_session_status add value 'SCHEDULED';
exception
  when duplicate_object then null;
end $$;

alter table public.live_sessions
  add column if not exists goes_live_at timestamptz;

-- Partial index on SCHEDULED is in 00020: PG forbids using a new enum literal in the same
-- transaction as ALTER TYPE ... ADD VALUE (Supabase runs each migration in one txn).

alter table public.schools
  add column if not exists nickname text;
