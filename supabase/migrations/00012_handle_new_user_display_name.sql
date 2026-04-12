-- Prefer explicit signup name from user metadata (full_name or name), then email local-part.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
      nullif(trim(new.raw_user_meta_data->>'name'), ''),
      split_part(new.email, '@', 1)
    ),
    'CONTRIBUTOR'
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;
