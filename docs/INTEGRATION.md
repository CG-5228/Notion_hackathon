# Integration & setup (Member 1)

## Stack
React 18 + TypeScript + Vite + Tailwind v4 + React Router, one shared Supabase project. Deploy: Vercel (`vercel.json` included, SPA rewrites).

## Local setup
```bash
npm install
cp .env.example .env      # shared project URL + anon key only
npm run dev               # http://localhost:5173
npm run typecheck && npm test && npm run build
```

## Database deployment

Frontend deployment does **not** apply Supabase migrations. The deployed frontend and
Supabase project must use the same migration set. Login can work with only the
foundation installed while discovery, activity creation, matching and chat fail.

### Repair a foundation-only or unconfigured backend

From the current checkout:

```bash
npm run db:bundle
```

Open `.hoplite/artifacts/backend-repair.sql` and run the **whole file** in the SQL
Editor of the Supabase project configured in Vercel. Alternatively, configure
`SUPABASE_DB_URL` as a secure, server-only environment variable and run:

```bash
npm run db:apply
```

`db:apply` requires the PostgreSQL `psql` client. `DATABASE_URL` and `DB_URL` are also
accepted. Never put database passwords or service-role keys in `VITE_` variables,
commit them, or paste them into chat.

The repair is generated directly from the repository migrations. It applies
missing migration groups in order in one transaction, skips groups whose tables
and RPC signatures already exist, and refreshes the PostgREST schema cache. It
does not reset the database, seed users, disable RLS, or overwrite installed
migration groups. It refuses a partially installed group instead of guessing or
dropping data. In that case, inspect the named migration and the deployed schema
before repairing that partial installation.

The bundle does not edit the Supabase CLI migration-history table. If SQL Editor
was used to install migrations, reconcile the installed versions with your CLI
history before switching deployment methods; do not blindly `db push` them again.
For an already CLI-managed project, use the usual tracked deployment:

```bash
supabase link --project-ref <ref>
supabase migration list
supabase db push --dry-run
supabase db push
```

Do not blindly replay an already installed migration or reset a shared database.
When all migrations are installed but an RPC is still missing from the API cache,
run `NOTIFY pgrst, 'reload schema';` in SQL Editor, then retry the app.

Supabase dashboard settings:
- Auth → Providers → Email: **Confirm email ON**.
- Auth → URL configuration: Site URL = Vercel URL; add `/onboarding` redirect.

## Student gate (how it works)
1. Signup with an email whose **exact** domain isn't in `public.university_domains` is rejected by a trigger on `auth.users` (gmail, unknown `.ie`, subdomains like `evil.tcd.ie`).
2. `profiles.student_verified` becomes true only once `email_confirmed_at` is set; users cannot edit it, `university_id` or `is_demo`.
3. `is_verified_student()` re-checks confirmation + current allowlist + 18+ attestation on every call, so removing a domain revokes access.
4. Seeded domains (TCD, UCD, DCU, UCC, Galway, UL, Maynooth, TU Dublin) **must be checked by an admin** before launch.

## Demo accounts (no global bypass)
Domain `demo.findyourbuddy.test` → "Demo University (not real)". Only an admin can create confirmed demo users: Dashboard → Authentication → Add user → *Auto confirm user*. They carry `is_demo = true`. Disable before production:
`update public.university_domains set active = false where domain = 'demo.findyourbuddy.test';`

## Integrated features and verification

Migrations **0001 → 0006** cover student accounts, interests, events, RSVP, matching,
chat, mutual consent, safety reports, the My Plans overview, and atomic interest
replacement. Keep applied migrations immutable; add a new numbered migration
when changing their behavior.

```bash
npm run typecheck
npm test
npm run build
```

Run the SQL suites in `supabase/tests/000*.test.sql` after applying the migrations
to a disposable database. They roll back their fixtures and cover access control,
RSVP, matching, consent/reveal, reports, caller-only plans, and atomic interest
saving. `supabase/tests/0003_matching.concurrency.sh` checks matching under
simultaneous requests. The auth shim is for local PostgreSQL tests only; never
apply `m5_local_shim.sql` to a hosted Supabase project.

Browser checks with fixtures verify the UI only. Real email delivery, deployed
API connectivity, Realtime and multi-student flows still require the configured
Supabase project; a frontend build or Vercel deployment does not prove those.
