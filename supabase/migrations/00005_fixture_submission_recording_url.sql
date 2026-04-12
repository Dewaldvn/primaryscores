-- Optional link to Super Sports Schools (or similar) match recording, shown on public match pages.
alter table fixtures add column if not exists recording_url text;

alter table submissions add column if not exists recording_url text;
