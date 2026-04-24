-- Mark test/dummy results; backfill all existing results as dummy per launch request.
alter table public.results
  add column if not exists is_dummy boolean not null default false;

alter table public.submissions
  add column if not exists is_dummy boolean not null default false;

-- Every existing result row: dummy / test data.
update public.results
set is_dummy = true;
