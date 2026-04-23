-- School characteristic used for default team seeding on school creation.
do $$ begin
  create type school_type as enum ('PRIMARY', 'SECONDARY', 'COMBINED');
exception
  when duplicate_object then null;
end $$;

alter table public.schools
  add column if not exists school_type school_type not null default 'PRIMARY';
