# Primary Rugby Scores SA

MVP web app for **historical U13 primary school rugby results** in South Africa: public browsing, contributor submissions with optional evidence, moderator review, and admin metadata CRUD.

**Phased implementation log:** see [docs/PHASES.md](docs/PHASES.md) for a phase-by-phase summary, file lists, and assumptions.

## Stack

- **Next.js 14** (App Router) + TypeScript  
- **Tailwind CSS** + **shadcn/ui** (Base UI primitives)  
- **Supabase** (Auth, Postgres, Storage)  
- **Drizzle ORM** + `postgres` driver (`DATABASE_URL`)  
- **Zod** validation, **TanStack Table** (moderation queue)  
- **Cloudflare Turnstile** hooks (placeholder keys skip verification locally)

## Prerequisites

- Node 20+ (LTS recommended)  
- A [Supabase](https://supabase.com) project  

## 1. Supabase setup

1. Create a project and note **Project URL** and **anon key** (Settings → API).  
2. In **SQL Editor**, run the migration file:  
   `supabase/migrations/00001_initial_schema.sql`  
   This creates tables, enums, the `profiles` trigger on `auth.users`, RLS policies, and the **`evidence`** storage bucket.  
3. **Auth → URL configuration**: set **Site URL** to your local or Vercel URL (e.g. `http://localhost:3000`). Add the same to **Redirect URLs** if you use email confirmation.  
4. **Database → Connection string**: copy the **Transaction pooler** URI (port **6543**) for server-side Drizzle. Use the `postgres.[ref]` user and password.

## 2. Local environment

Copy `.env.example` to `.env.local` and fill in:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key (browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional for future admin tools; not required for this MVP’s server paths |
| `DATABASE_URL` | Postgres connection string (pooler, `sslmode=require`) |
| `NEXT_PUBLIC_SITE_URL` | e.g. `http://localhost:3000` (auth redirects) |
| `TURNSTILE_SECRET_KEY` / `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Use `placeholder` locally to bypass Turnstile |

Install and run:

```bash
npm install
npm run dev
```

Use **`npm run dev`** (with a space). If the terminal says **“trying 3001”**, open **`http://localhost:3001`** — not 3000, which may be another process.

**Why it can feel slow:** every page hit talks to **Supabase Auth** (middleware + header) and **Postgres** (often in another region). Paused free-tier projects, strict `statement_timeout`, or a weak network add latency. The app uses a small connection pool and `react` `cache()` for repeated reads in one request; keep the DB in the same region as you when possible.

## 3. Seed demo data

With `DATABASE_URL` set:

```bash
npm run db:seed
```

This loads SA provinces, sample schools, U13 teams, seasons, competitions, and **20+ verified results** (and a few 2023 fixtures).

### Moderator and admin accounts

Supabase Auth does not allow inserting users from the seed script safely. After signup (or after creating users in the dashboard):

1. Create users, e.g.  
   - `moderator@primaryrugby.local`  
   - `admin@primaryrugby.local`  
2. In the SQL editor:

```sql
update public.profiles set role = 'MODERATOR' where email = 'moderator@primaryrugby.local';
update public.profiles set role = 'ADMIN' where email = 'admin@primaryrugby.local';
```

Roles: `PUBLIC`, `CONTRIBUTOR`, `MODERATOR`, `ADMIN` (enforced in server actions and admin/moderator layouts).

## 4. Drizzle (optional)

Schema lives in `src/db/schema.ts`. SQL remains the source of truth for Supabase; Drizzle mirrors it for type-safe queries.

```bash
npm run db:generate   # if you use drizzle-kit migrations locally
npm run db:studio     # optional GUI (uses DATABASE_URL from .env.local via drizzle.config.ts)
```

## 5. Deploy to Vercel

1. Push the repo and import it in [Vercel](https://vercel.com).  
2. Add the same env vars as in `.env.example` (production `NEXT_PUBLIC_SITE_URL` should be your Vercel URL, e.g. `https://your-app.vercel.app`).  
3. **Supabase**: allow your Vercel domain in Auth URL configuration.  
4. Redeploy after changing env vars.

Production tips:

- Use the **transaction pooler** `DATABASE_URL` for serverless.  
- Ensure RLS and storage policies match your threat model; this MVP relies on **server-side Drizzle** (database role) for reads/writes in Next routes, with RLS as an extra guard for direct client access.

## Project layout (high level)

- `src/app/` — routes (public, submit, moderator, admin)  
- `src/components/` — UI + feature components  
- `src/lib/` — Supabase clients, auth helpers, data access, validators  
- `src/db/schema.ts` — Drizzle schema  
- `src/actions/` — server actions (submissions, moderation, admin)  
- `supabase/migrations/` — SQL for Postgres + policies + storage  
- `scripts/seed.ts` — demo content  

## Features (MVP)

- Public: results archive with filters, school pages, match detail, seasons & competitions.  
- Contributors: sign up / sign in, submit scores (optional Turnstile + Storage evidence).  
- Moderators: queue with approve / reject / flag; creates or updates `fixtures` + `results`; logs to `moderation_logs`.  
- Admins: schools, teams, seasons & competitions, users (role dropdown), CSV export for schools, merge placeholder page.

## License

Private / your org — adjust as needed.
