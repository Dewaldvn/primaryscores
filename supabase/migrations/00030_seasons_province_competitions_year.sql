alter table public.seasons
  add column if not exists province_id uuid references public.provinces(id);

alter table public.competitions
  add column if not exists year integer;

create index if not exists seasons_province_idx
  on public.seasons (province_id);

create index if not exists competitions_year_idx
  on public.competitions (year);
