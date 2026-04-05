-- Allow moderators to publish fixtures without season/competition when unknown.
alter table public.fixtures alter column season_id drop not null;
alter table public.fixtures alter column competition_id drop not null;
