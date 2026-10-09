# Member 1 UI handoff

## Ownership and integration

Member 1 owns the app shell, public discovery page, account/profile screens, shared components, global styles, and branding. Feature exports, route paths, database migrations, and RPC signatures are unchanged by the visual redesign. Continue integrating the other members' screens through the existing entrypoints rather than creating parallel apps or providers.

- The public discovery page filters a small, labelled set of **activity ideas**. These are not events, bookings, RSVPs, registered members, or popularity signals. Idea links lead to account creation, not invented event IDs.
- Ready students still receive Member 3's `EventsFeed`. Unintegrated feature exports use the honest shared `ReservedSlot` component.
- Pair attendance warnings, the group disclaimer, university-email verification limits, and public-meeting guidance remain visible. Do not replace these with safety or attendance promises.

## Shared visual language

`src/index.css` defines the design tokens: warm `paper`, white `surface`, charcoal `ink`, orange `brand`, and supporting `sage`, `forest`, `mint`, and `lilac` colors. Existing color-token names remain available to teammates. Headings use Bricolage Grotesque; body text uses Figtree, with system-font fallbacks.

Reuse `Button`, `ButtonLink`, `Card`, `Notice`, `Spinner`, `Logo`, and `Icon` from `@/components`. `Icon` accepts a typed `name` and is decorative by default: controls must retain an accessible text label. Keep visible keyboard focus, reduced-motion support, and comfortable touch targets.

The shell uses a desktop sidebar and a phone/tablet bottom navigation. Activity filters are buttons with `aria-pressed`, not incomplete ARIA tabs. Form controls have explicit labels, field-level errors, and pending states. Password visibility controls do not change password values.

Photography is locally served and illustrative. Source URLs and usage notes are in [`public/images/README.md`](../public/images/README.md).

## Verification and limits

Run `bun run typecheck`, `bun run build`, and `bun run test`. Review the discovery and account routes at desktop and phone widths, exercise the category filters and account-mode controls, and check that protected routes fail closed.

The preview works without Supabase credentials, but sign-in, confirmation-email delivery, database policies, and genuine multi-student flows require the team's configured backend. Component tests with mocked services are not a substitute for those live integration checks. There is no demo login or verification bypass.
