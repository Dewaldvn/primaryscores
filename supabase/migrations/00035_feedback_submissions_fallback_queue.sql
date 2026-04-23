-- Queue feedback when email delivery is unavailable.

do $$ begin
  create type feedback_issue as enum ('BUG', 'LOGIC', 'SUGGESTION');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type feedback_delivery_status as enum ('QUEUED', 'SENT', 'FAILED');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.feedback_submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cell_no text not null,
  email text not null,
  issue feedback_issue not null,
  detail text not null,
  screenshot_file_name text,
  screenshot_mime_type text,
  screenshot_size_bytes integer,
  screenshot_base64 text,
  email_delivery_status feedback_delivery_status not null default 'QUEUED',
  email_error text,
  created_at timestamptz not null default now()
);

create index if not exists feedback_submissions_created_idx
  on public.feedback_submissions (created_at);

create index if not exists feedback_submissions_email_delivery_idx
  on public.feedback_submissions (email_delivery_status);
