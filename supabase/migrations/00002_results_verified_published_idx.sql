-- Recent verified results: filter + order by published_at (home page, listings).
-- Without this, Supabase often hits statement_timeout on join-heavy plans.
create index if not exists results_verified_published_at_idx
  on public.results (published_at desc nulls last)
  where is_verified = true and published_at is not null;
