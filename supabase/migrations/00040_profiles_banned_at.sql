-- Ban flag: when set, the account cannot use contributor features (enforced in app + requireUser).
alter table public.profiles
  add column if not exists banned_at timestamptz;

comment on column public.profiles.banned_at is 'When set, user is blocked from using the site (checked server-side).';
