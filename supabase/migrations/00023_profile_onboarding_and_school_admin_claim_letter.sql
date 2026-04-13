-- First-sign-in onboarding gate and required proof letter for school-admin claims.

do $$ begin
  create type profile_onboarding_status as enum ('PENDING', 'COMPLETED');
exception
  when duplicate_object then null;
end $$;

alter table public.profiles
  add column if not exists onboarding_status profile_onboarding_status not null default 'PENDING';

-- Existing users should not be forced into first-sign-in onboarding.
update public.profiles
set onboarding_status = 'COMPLETED'
where onboarding_status is null or onboarding_status = 'PENDING';

alter table public.school_admin_memberships
  add column if not exists requested_letter_path text,
  add column if not exists requested_letter_file_name text;

insert into storage.buckets (id, name, public)
values ('school-admin-claims', 'school-admin-claims', true)
on conflict (id) do nothing;
