-- Remove U13A teams from all secondary schools.
delete from public.teams t
using public.schools s
where s.id = t.school_id
  and s.school_type = 'SECONDARY'
  and upper(trim(t.age_group)) = 'U13'
  and upper(trim(t.team_label)) = 'A';
