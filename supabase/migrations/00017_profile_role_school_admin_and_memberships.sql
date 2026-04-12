-- School Admin role + per-school access (claim → moderator approves → ACTIVE).

do $$ begin
  alter type profile_role add value 'SCHOOL_ADMIN';
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type school_admin_membership_status as enum ('PENDING', 'ACTIVE', 'REVOKED');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.school_admin_memberships (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  school_id uuid not null references public.schools (id) on delete cascade,
  status school_admin_membership_status not null default 'PENDING',
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by_profile_id uuid references public.profiles (id)
);

create index if not exists school_admin_memberships_profile_idx
  on public.school_admin_memberships (profile_id);

create index if not exists school_admin_memberships_school_idx
  on public.school_admin_memberships (school_id);

create index if not exists school_admin_memberships_status_idx
  on public.school_admin_memberships (status);

create unique index if not exists school_admin_memberships_profile_school_pending_active_uq
  on public.school_admin_memberships (profile_id, school_id)
  where status in ('PENDING', 'ACTIVE');
