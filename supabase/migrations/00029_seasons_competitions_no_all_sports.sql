update public.seasons
set sport = 'RUGBY'
where sport is null;

update public.competitions
set sport = 'RUGBY'
where sport is null;

alter table public.seasons
  alter column sport set default 'RUGBY',
  alter column sport set not null;

alter table public.competitions
  alter column sport set default 'RUGBY',
  alter column sport set not null;
