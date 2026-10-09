# Admin-only demo account provisioning

Email/password authentication does not require Google OAuth. For a local demonstration without mailbox delivery, this tool provisions exactly five synthetic users with Supabase Auth's server-side `admin.createUser` and `email_confirm: true`; it does not send a confirmation link or change the project's Auth email settings. The normal **Auth → Providers → Email → Confirm email** setting must remain enabled.

The addresses are `fyb-demo-1@mail.dcu.ie` through `fyb-demo-5@mail.dcu.ie`. Although `mail.dcu.ie` is in the current allowlist, creating these users does **not** verify control of those mailboxes or establish that the users are DCU students. Use them only in an isolated non-production demo project; do not represent them as real or verified students. The app marks them as demo users, and profile age confirmation remains false until a user completes that step. No display name is prefilled.

## Prerequisites

1. Use an isolated Supabase project reserved for demos, never the production project.
2. Apply the available repository migrations in numeric order. Migration `0005` depends only on `0001`; include teammates' `0002`–`0004` when integrated. It makes the profile demo flag derive from trusted `app_metadata.fyb_demo` or the seeded demo university; ordinary `user_metadata` cannot set it.
3. Leave email confirmation enabled in Supabase Auth. `email_confirm: true` applies only to these five service-created demo identities.
4. Use Node.js 20.6 or newer. The service-role credential is server-only and must never be added to a `VITE_` variable, frontend code, or a public artifact.

## Provision

Copy `.env.demo.example` to the ignored `.env.demo`, then set the isolated project's exact HTTPS URL, its 20-character project ref, and its server-only `SUPABASE_SERVICE_ROLE_KEY`. The script checks that the URL host, configured ref, and command-line confirmation all match.

```bash
cp .env.demo.example .env.demo
chmod 600 .env.demo
# Fill the three values in .env.demo using the isolated demo project's dashboard.
npm run demo:accounts -- --confirm-project-ref <EXACT_20_CHARACTER_PROJECT_REF>
```

The command calls only Auth `listUsers` and `createUser`; it does not reset, update, or delete existing users. Any target-email collision without the expected trusted demo marker and the matching private local credential record is refused. On interrupted runs, pending credentials are retained and checked against the existing user's exact demo marker before reuse.

Passwords are never printed. The ignored `.local/fyb-demo-accounts.json` file contains the generated credentials, with directory mode `0700` and file mode `0600`; do not commit it or paste it into chat, issues, or pull requests. Share credentials only with authorized demo participants through an approved private channel. If a target address already exists without that local record, stop and resolve it manually in the isolated project rather than resetting or overwriting the account.

Run only one provisioning command at a time. Configure the app's `VITE_SUPABASE_URL` and public `VITE_SUPABASE_ANON_KEY` for this same shared demo project, then restart the app. Choose **Sign in**, not **Create account**, and use a generated credential. Each tester must still choose a display name and confirm the 18+ self-attestation; no profile or age answer is prefilled.

## Verification

```bash
npm test -- scripts/provision-demo-accounts.test.mjs
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/0005_demo_accounts.test.sql
```

The SQL test is transactional and rolls back its fixtures. Deactivating `demo.findyourbuddy.test` only disables that reserved domain, **not these DCU-labelled accounts**. Keep these accounts confined to the demo project. Before repurposing that project for production, remove them through Supabase Authentication; do not disable the real DCU domain or turn off global email confirmation.
