# Implementation phases — Primary Rugby Scores SA

This document maps delivery to **six phases**. Each section summarises what was built, lists the main files, records assumptions, and notes how the app stays runnable after that phase.

**Run after any phase:** `npm install` → copy `.env.example` to `.env.local` (Phase 1+) → run SQL migration in Supabase → `npm run dev`. With `DATABASE_URL` set, `npm run db:seed` loads demo data.

---

## Phase 1 — Database schema, scaffold, Supabase, auth helpers, seed

### Summary

- **Schema:** PostgreSQL enums and tables for provinces, profiles, schools, teams, seasons, competitions, fixtures, results, submissions, attachments, moderation logs; `profiles` linked to `auth.users` with a creation trigger; RLS on selected tables; `evidence` storage bucket.
- **App scaffold:** Next.js 14 App Router, TypeScript, Tailwind, shadcn-style UI (Base UI), Drizzle schema mirroring SQL, lazy `DATABASE_URL` client for Drizzle.
- **Supabase:** Browser and server clients (`@supabase/ssr`), middleware session refresh, auth callback route for OAuth/email link.
- **Auth / roles:** `getSessionUser`, `getProfile`, `requireUser`, `requireRole` in `src/lib/auth.ts`; layouts gate `/my-submissions`, `/moderator`, `/admin`.
- **Seed:** `scripts/seed.ts` — provinces, schools, U13 teams, seasons, competitions, 20+ verified results; moderator/admin accounts documented as manual SQL after signup.

### Files created or changed

| Area | Files |
|------|--------|
| SQL | `supabase/migrations/00001_initial_schema.sql` |
| Drizzle | `src/db/schema.ts`, `drizzle.config.ts` |
| DB client | `src/lib/db.ts`, `src/lib/db-safe.ts` |
| Supabase | `src/lib/supabase/client.ts`, `server.ts`, `middleware.ts`, `middleware.ts` (root), `src/app/auth/callback/route.ts` |
| Auth | `src/lib/auth.ts` |
| Utils | `src/lib/slug.ts` |
| Seed | `scripts/seed.ts` |
| Config | `.env.example`, `package.json` scripts (`db:seed`, etc.) |
| App shell | `src/app/layout.tsx`, `src/app/globals.css`, `tailwind.config.ts`, `src/components/providers.tsx`, `src/components/ui/*` (initial shadcn adds) |

### Assumptions

- **Single source of truth for DDL** is the SQL migration; Drizzle is for typed queries in Node, not the only migration path.
- **`DATABASE_URL`** uses Supabase’s **transaction pooler** (port 6543, `prepare: false` in driver).
- **New auth users** get `CONTRIBUTOR` via trigger; `MODERATOR` / `ADMIN` set in SQL or Admin UI.
- **`getProfile`** returns `null` if `DATABASE_URL` is unset so the shell can render without DB.

### Runnable?

Yes: install deps, apply migration, set env vars; UI loads (data pages empty until seed).

---

## Phase 2 — Public pages

### Summary

- **Home:** Intro, search form (GET to `/results`), province quick links, recent verified results, CTA to submit.
- **Results:** Filter form (province, school, season, competition, date range, search), paginated verified results.
- **School:** Detail, U13 teams, seasonal summary, match history (verified only).
- **Match:** Fixture + score + verification badge (only if result is verified and published).
- **Seasons / competitions:** Lists and detail pages filtered to verified results.

### Files created or changed

| Page / data | Files |
|-------------|--------|
| Data layer | `src/lib/data/results.ts`, `schools.ts`, `reference.ts` |
| Routes | `src/app/page.tsx`, `results/page.tsx`, `schools/[slug]/page.tsx`, `matches/[id]/page.tsx`, `seasons/page.tsx`, `seasons/[id]/page.tsx`, `competitions/page.tsx`, `competitions/[id]/page.tsx` |
| UI | `src/components/site-header.tsx`, `link-button.tsx`, `results-filter-form.tsx`, `verification-badge.tsx` |
| API | `src/app/api/schools/search/route.ts` |

### Assumptions

- **Public data** = `results.is_verified` and `published_at` set; unverified or unpublished fixtures are hidden from browse/match pages (`notFound` on match if not public).
- **School URLs** use **`slug`**, not numeric id.
- **Search** is `ILIKE`-based; structure allows a future move to full-text search.

### Runnable?

Yes: public routes work with seeded DB; without DB, pages show empty-state copy where applicable.

---

## Phase 3 — Contributor flow

### Summary

- **Submit:** Public explanation; signed-in users get `SubmitScoreForm` (Zod-validated server action), optional school autocomplete via `/api/schools/search`, Turnstile placeholder, optional file upload to Storage + `registerAttachmentAction`.
- **My submissions:** Layout requires login; lists submissions with moderation badges.

### Files created or changed

| Area | Files |
|------|--------|
| Actions | `src/actions/submissions.ts`, `src/actions/attachments.ts` |
| Data | `src/lib/data/submissions.ts` |
| Validation | `src/lib/validators/submission.ts`, `src/lib/turnstile.ts` |
| UI | `src/components/submit-score-form.tsx`, `turnstile-placeholder.tsx`, `src/components/auth-form.tsx` |
| Routes | `src/app/submit/page.tsx`, `src/app/login/page.tsx`, `src/app/signup/page.tsx`, `src/app/my-submissions/page.tsx`, `src/app/my-submissions/layout.tsx` |

### Assumptions

- **RLS** allows authenticated submission/attachment patterns; **server actions** also enforce ownership via Drizzle.
- **Storage path:** `submissions/{submissionId}/…` under bucket `evidence`.
- **Contributors** are not required to resolve team UUIDs; moderators map to real teams on approve.

### Runnable?

Yes: sign up → submit → see rows in **My submissions**; upload works if bucket and policies exist.

---

## Phase 4 — Moderator dashboard and actions

### Summary

- **Dashboard:** Summary cards (pending, needs review, today), TanStack Table queue, review dialog: approve (creates/updates fixture + result), reject with reason, flag needs review.
- **Logging:** `moderation_logs` rows on approve/reject/flag.

### Files created or changed

| Area | Files |
|------|--------|
| Actions | `src/actions/moderation.ts` |
| Data | `src/lib/data/moderation.ts`, `src/lib/data/admin.ts` (`listAllTeamsForModeration`) |
| UI | `src/components/moderator-dashboard.tsx` |
| Routes | `src/app/moderator/page.tsx`, `src/app/moderator/layout.tsx` |
| Validation | `moderationApproveSchema`, `moderationRejectSchema` in `src/lib/validators/submission.ts` |

### Assumptions

- **Approve** always requires moderator-selected home/away **team** IDs, season, and competition (not only free-text names).
- **One result per fixture**; approve upserts result and sets verification level.
- **Moderator/Admin** roles checked in server actions and layout.

### Runnable?

Yes: promote a user to `MODERATOR`, open `/moderator`, process queue.

---

## Phase 5 — Admin CRUD

### Summary

- **Schools / teams / seasons / competitions:** List + create forms (server actions with Zod).
- **Users:** Table with role dropdown (`updateUserRoleAction`).
- **Merge:** Placeholder page for future duplicate merge.
- **Export:** CSV download for schools (`/api/admin/export/schools`).

### Files created or changed

| Area | Files |
|------|--------|
| Actions | `src/actions/admin-crud.ts`, `src/actions/admin-users.ts` |
| Validation | `src/lib/validators/admin.ts` |
| Data | `adminListSchools`, `adminListTeams`, … in `src/lib/data/admin.ts` |
| UI | `admin-school-form.tsx`, `admin-team-form.tsx`, `admin-season-forms.tsx`, `admin-users-table.tsx` |
| Routes | `src/app/admin/layout.tsx`, `admin/page.tsx`, `admin/schools/page.tsx`, `admin/teams/page.tsx`, `admin/seasons/page.tsx`, `admin/users/page.tsx`, `admin/merge/page.tsx`, `src/app/api/admin/export/schools/route.ts` |

### Assumptions

- **Admin-only** via `requireRole(['ADMIN'])` on actions and layout.
- **School slug** auto-derived from display name if omitted.
- **Edit-in-place** for admin entities is minimal MVP (create + directory listing); deep edit screens can be added later.

### Runnable?

Yes: promote user to `ADMIN`, use `/admin/*` and CSV link.

---

## Phase 6 — Polish: empty/loading states, errors, README

### Summary

- **Empty states:** Card messages on home, results, school, seasons, competitions, my-submissions, moderator queue when lists are empty; submit flow explains sign-in.
- **Loading:** Root `loading.tsx`, plus route-level `loading.tsx` for results, submit, moderator; shared `PageLoading` skeleton.
- **Errors:** Root `error.tsx` with retry and hint for `DATABASE_URL`.
- **README:** Setup, env, seed, deploy, stack; this file documents phases.
- **Rendering:** `dynamic = "force-dynamic"` on root layout avoids static prerender issues with Supabase cookies.

### Files created or changed

| Area | Files |
|------|--------|
| Loading | `src/components/page-loading.tsx`, `src/app/loading.tsx`, `src/app/results/loading.tsx`, `src/app/submit/loading.tsx`, `src/app/moderator/loading.tsx` |
| Errors | `src/app/error.tsx` |
| Docs | `docs/PHASES.md`, `README.md` (reference to phases) |
| Layout | `src/app/layout.tsx` (`dynamic`); earlier: `user-menu`, `LinkButton`, Tailwind tokens |

### Assumptions

- **Skeleton UIs** are generic; fine-tuned per-route skeletons can replace them later.
- **Global error boundary** is sufficient for MVP; finer `error.tsx` per segment optional.

### Runnable?

Yes: `npm run build` succeeds; `npm run dev` for local use.

---

## Quick file index (by path)

```
drizzle.config.ts
.env.example
middleware.ts
package.json
scripts/seed.ts
supabase/migrations/00001_initial_schema.sql
docs/PHASES.md
src/db/schema.ts
src/lib/auth.ts
src/lib/db.ts
src/lib/db-safe.ts
src/lib/slug.ts
src/lib/turnstile.ts
src/lib/supabase/client.ts
src/lib/supabase/server.ts
src/lib/supabase/middleware.ts
src/lib/validators/admin.ts
src/lib/validators/submission.ts
src/lib/data/admin.ts
src/lib/data/moderation.ts
src/lib/data/reference.ts
src/lib/data/results.ts
src/lib/data/schools.ts
src/lib/data/submissions.ts
src/actions/admin-crud.ts
src/actions/admin-users.ts
src/actions/attachments.ts
src/actions/moderation.ts
src/actions/submissions.ts
src/components/*  (UI + feature components)
src/app/**        (routes, loading, error)
```

---

*Last updated: aligned with the MVP codebase in this repository.*
