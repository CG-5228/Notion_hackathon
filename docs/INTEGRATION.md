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

## Database (apply in order: 0001 → 0002 → 0003 → 0004 → 0005)
```bash
supabase link --project-ref <ref>
supabase db push                      # applies supabase/migrations/*
psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/0001_foundation.test.sql   # rolls back; prints ALL 0001 SECURITY TESTS PASSED
```
Supabase dashboard settings:
- Auth → Providers → Email: **Confirm email ON**.
- Auth → URL configuration: Site URL = Vercel URL; add `/onboarding` redirect.

## Student gate (how it works)
1. Signup with an email whose **exact** domain isn't in `public.university_domains` is rejected by a trigger on `auth.users` (gmail, unknown `.ie`, subdomains like `evil.tcd.ie`).
2. `profiles.student_verified` becomes true only once `email_confirmed_at` is set; users cannot edit it, `university_id` or `is_demo`.
3. `is_verified_student()` re-checks confirmation + current allowlist + 18+ attestation on every call, so removing a domain revokes access.
4. Seeded domains (TCD, UCD, DCU, UCC, Galway, UL, Maynooth, TU Dublin) **must be checked by an admin** before launch.

## Demo accounts (no global bypass)
For the five explicitly requested DCU test accounts, see [the admin-only provisioning runbook](./DEMO_ACCOUNTS.md). It uses password sign-in, not Google OAuth. Normal email signup still requires confirmation; Supabase confirmation emails do not depend on Google OAuth.

The DCU path requires migration `0005_demo_accounts.sql` (foundation-only dependency) and an explicitly confirmed, isolated demo project. Trusted admin metadata marks these synthetic users, and the app displays a persistent demo warning. Never put its service-role credential in a `VITE_` variable or commit/share the private credentials file.

Domain `demo.findyourbuddy.test` → "Demo University (not real)". Only an admin can create confirmed demo users: Dashboard → Authentication → Add user → *Auto confirm user*. They carry `is_demo = true`. Disable before production:
`update public.university_domains set active = false where domain = 'demo.findyourbuddy.test';`

## Integration order
events (M3) → matching (M4) → chat/consent (M5) → onboarding (M2). Replace the reserved stub in your `src/features/*/index.tsx`, keep export names. Report SQL errors to Member 1; don't edit others' migrations.

## Tests run so far
- `npm test`: email helpers, auth status derivation, routing + mandatory warning copy (6 passing).
- `0001_foundation.test.sql` against Postgres with an auth shim: personal/unknown/subdomain signups rejected, unconfirmed not verified, protected-column self-edit blocked, no cross-profile reads, domains table/`is_blocked_pair`/direct block insert denied, anon limited to domain check (all passing).
- Pending until M3–M5 land: 2-session pair, 3–5-session group, identity-before-reveal, third-account access, consent reset, blocked re-match, no-show not auto-penalised.
