-- Migrate PUBLIC profiles to CONTRIBUTOR. New signups already use CONTRIBUTOR (handle_new_user).
-- PostgreSQL cannot drop individual enum labels safely without recreating the type; the unused
-- 'PUBLIC' label may remain on enum profile_role until a future maintenance window.

update profiles
set role = 'CONTRIBUTOR'::profile_role,
    updated_at = now()
where role = 'PUBLIC'::profile_role;
