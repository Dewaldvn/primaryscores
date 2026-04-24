-- Add DONT_LIKE to feedback_issue for "I don't like" submissions.
do $$ begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on e.enumtypid = t.oid
    where t.typname = 'feedback_issue' and e.enumlabel = 'DONT_LIKE'
  ) then
    alter type public.feedback_issue add value 'DONT_LIKE';
  end if;
end $$;
