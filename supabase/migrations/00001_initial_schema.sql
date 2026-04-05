-- Primary Rugby Scores SA — initial schema for Supabase (PostgreSQL)
-- Run in Supabase SQL Editor or via `supabase db push` if linked.

create extension if not exists "pgcrypto";

-- —— enums ——
do $$ begin
  create type profile_role as enum ('PUBLIC', 'CONTRIBUTOR', 'MODERATOR', 'ADMIN');
exception when duplicate_object then null; end $$;

do $$ begin
  create type moderation_status as enum ('PENDING', 'APPROVED', 'REJECTED', 'NEEDS_REVIEW');
exception when duplicate_object then null; end $$;

do $$ begin
  create type fixture_status as enum ('SCHEDULED', 'PLAYED', 'CANCELLED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type verification_level as enum ('SUBMITTED', 'MODERATOR_VERIFIED', 'SOURCE_VERIFIED');
exception when duplicate_object then null; end $$;

-- —— provinces ——
create table if not exists public.provinces (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null
);

-- —— profiles (linked to auth.users) ——
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text not null,
  role profile_role not null default 'CONTRIBUTOR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists profiles_email_idx on public.profiles (email);

-- —— schools ——
create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  official_name text not null,
  display_name text not null,
  slug text not null unique,
  province_id uuid not null references public.provinces (id),
  district text,
  town text,
  website text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists schools_province_idx on public.schools (province_id);
create index if not exists schools_display_name_idx on public.schools (display_name);

-- —— teams ——
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id),
  age_group text not null,
  team_label text not null,
  is_first_team boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists teams_school_idx on public.teams (school_id);

-- —— seasons ——
create table if not exists public.seasons (
  id uuid primary key default gen_random_uuid(),
  year integer not null,
  name text not null,
  start_date date not null,
  end_date date not null
);

-- —— competitions ——
create table if not exists public.competitions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  province_id uuid references public.provinces (id),
  organiser text,
  level text,
  active boolean not null default true
);
create index if not exists competitions_province_idx on public.competitions (province_id);

-- —— fixtures ——
create table if not exists public.fixtures (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons (id),
  competition_id uuid not null references public.competitions (id),
  match_date date not null,
  home_team_id uuid not null references public.teams (id),
  away_team_id uuid not null references public.teams (id),
  venue text,
  status fixture_status not null default 'SCHEDULED',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists fixtures_season_idx on public.fixtures (season_id);
create index if not exists fixtures_competition_idx on public.fixtures (competition_id);
create index if not exists fixtures_match_date_idx on public.fixtures (match_date);
create index if not exists fixtures_home_team_idx on public.fixtures (home_team_id);
create index if not exists fixtures_away_team_idx on public.fixtures (away_team_id);

-- —— results ——
create table if not exists public.results (
  id uuid primary key default gen_random_uuid(),
  fixture_id uuid not null references public.fixtures (id),
  home_score integer not null,
  away_score integer not null,
  is_verified boolean not null default false,
  verification_level verification_level not null default 'SUBMITTED',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint results_fixture_id_unique unique (fixture_id)
);

-- —— submissions ——
create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  fixture_id uuid references public.fixtures (id),
  proposed_home_team_id uuid references public.teams (id),
  proposed_away_team_id uuid references public.teams (id),
  proposed_home_team_name text not null,
  proposed_away_team_name text not null,
  proposed_school_name text,
  proposed_match_date date not null,
  proposed_home_score integer not null,
  proposed_away_score integer not null,
  proposed_venue text,
  proposed_competition_id uuid references public.competitions (id),
  proposed_season_id uuid references public.seasons (id),
  proposed_province_id uuid references public.provinces (id),
  submitted_by_user_id uuid references public.profiles (id),
  source_url text,
  notes text,
  moderation_status moderation_status not null default 'PENDING',
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by_user_id uuid references public.profiles (id)
);
create index if not exists submissions_status_idx on public.submissions (moderation_status);
create index if not exists submissions_submitted_idx on public.submissions (submitted_at);
create index if not exists submissions_user_idx on public.submissions (submitted_by_user_id);

-- —— attachments ——
create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions (id) on delete cascade,
  file_path text not null,
  file_name text not null,
  mime_type text not null,
  created_at timestamptz not null default now()
);
create index if not exists attachments_submission_idx on public.attachments (submission_id);

-- —— moderation_logs ——
create table if not exists public.moderation_logs (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions (id) on delete cascade,
  moderator_user_id uuid not null references public.profiles (id),
  action text not null,
  reason text,
  created_at timestamptz not null default now()
);
create index if not exists moderation_logs_submission_idx on public.moderation_logs (submission_id);

-- —— updated_at helper ——
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_schools_updated_at on public.schools;
create trigger set_schools_updated_at
before update on public.schools
for each row execute function public.set_updated_at();

drop trigger if exists set_teams_updated_at on public.teams;
create trigger set_teams_updated_at
before update on public.teams
for each row execute function public.set_updated_at();

drop trigger if exists set_fixtures_updated_at on public.fixtures;
create trigger set_fixtures_updated_at
before update on public.fixtures
for each row execute function public.set_updated_at();

drop trigger if exists set_results_updated_at on public.results;
create trigger set_results_updated_at
before update on public.results
for each row execute function public.set_updated_at();

-- —— auth: auto-create profile ——
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'CONTRIBUTOR'
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- —— Row Level Security (client / future anon reads) ——
-- Server-side Drizzle uses a Postgres role that bypasses RLS when using the service/direct connection.
alter table public.profiles enable row level security;
alter table public.submissions enable row level security;
alter table public.attachments enable row level security;
alter table public.moderation_logs enable row level security;

-- Profiles: users can read/update own row
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- Submissions: insert own; read own
create policy "submissions_insert_authenticated" on public.submissions
  for insert to authenticated
  with check (submitted_by_user_id = auth.uid());
create policy "submissions_select_own" on public.submissions
  for select using (submitted_by_user_id = auth.uid());

-- Attachments tied to own submissions
create policy "attachments_select_own" on public.attachments
  for select using (
    exists (
      select 1 from public.submissions s
      where s.id = submission_id and s.submitted_by_user_id = auth.uid()
    )
  );
create policy "attachments_insert_own" on public.attachments
  for insert to authenticated
  with check (
    exists (
      select 1 from public.submissions s
      where s.id = submission_id and s.submitted_by_user_id = auth.uid()
    )
  );

-- Moderation logs: no client access by default (service role / Drizzle on server)

-- —— Storage bucket for evidence ——
insert into storage.buckets (id, name, public)
values ('evidence', 'evidence', false)
on conflict (id) do nothing;

-- Authenticated users can upload/read objects under folder matching their submission (simplified: allow uploads to evidence bucket for authenticated)
create policy "evidence_insert_authenticated"
on storage.objects for insert to authenticated
with check (bucket_id = 'evidence');

create policy "evidence_select_authenticated"
on storage.objects for select to authenticated
using (bucket_id = 'evidence');

-- Optional: tighten storage policies in production using path checks per submission ownership.
