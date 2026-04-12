-- Optional profile picture (storage path within bucket user-avatars).
alter table public.profiles add column if not exists avatar_path text;

insert into storage.buckets (id, name, public)
values ('user-avatars', 'user-avatars', true)
on conflict (id) do nothing;
