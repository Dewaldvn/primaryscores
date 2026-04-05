-- Optional crest / logo per school (storage path within bucket school-logos).
alter table public.schools add column if not exists logo_path text;

insert into storage.buckets (id, name, public)
values ('school-logos', 'school-logos', true)
on conflict (id) do nothing;
