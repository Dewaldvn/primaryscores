-- District is no longer captured for schools.
alter table public.schools
  drop column if exists district;
