# Gamazon

A private local community for physical console games: profiles, game shelves, offers and wanted posts, listing comments, connections, and direct messages. Built with Next.js, TypeScript, Tailwind CSS, and Supabase.

## Run the local demo

Requires Node.js 22 or newer.

The full validation toolchain uses Node.js 24 (also selected in CI).

```powershell
npm install
npm run dev
```

Open http://127.0.0.1:3000 for the public landing page. **Explore the demo** opens the community at `/community`. With no Supabase configuration, `next dev` uses a **local-only, in-memory demo**. Its people, posts, and messages are fictional. Nothing is sent to real members. Restarting the server resets the data. In **Your profile → Settings**, switch demo members to test both sides of requests and conversations. The fictional city is Bengaluru; production is configured separately.

Do not copy `.env.example` just to run the demo: it explicitly disables demo mode. For a production-build local preview, set `GAMAZON_DEMO=true` before `npm run build` / `npm start`. Never enable that variable on a hosted deployment. The server binds to loopback and demo routes also reject non-loopback requests.

## What is implemented

- Cinematic public landing page with six game galleries, scroll transitions, pointer parallax, screenshot viewer, keyboard controls, and reduced-motion support. Official image sources are recorded in `public/images/games/sources.json` and linked in the page credits; images are illustrative, not listing availability. Reference fonts are served locally.
- Dedicated `/signin`, `/signup` and `/reset-password` pages wired to Supabase passwords, email verification and recovery codes. When authentication is unconfigured, the forms clearly show preview status and link to the demo.
- Responsive community feed with console, status, neighbourhood, offer/wanted, and connections filters.
- Profiles, owned/wishlist shelves, mutual connections, blocking, and one-level listing discussions.
- One-page offer/wanted composer with sell/swap/lend choices, profile defaults, optional notes, compatibility details, photos, owner editing and availability. Retrying a publish request or failed photo does not duplicate the listing.
- Persistent live-mode conversations, one initial non-friend request, recipient approval, idempotent messages, unread markers, and database-authorised realtime updates with polling recovery.
- Open registration, verified email, adult/rules declarations, and active-membership access control.
- Reports with captured evidence, MFA-gated moderation, audit history, account deletion, and retryable cleanup.
- A protected `/admin` entry point, with admin navigation hidden from members. The database allows one administrator; members cannot grant themselves that role.
- Transactional notification outbox and private, optional exchange feedback; mutually confirmed exchanges are distinguished in the admin metrics RPC.
- SQL migrations, database-level authorization tests, browser tests, and pilot/release runbooks.

There is no payment handling, account trading, escrow, managed rental, shipping, identity verification badge, or exchange guarantee.

## Configure a live Supabase project

Create **separate staging and production projects** in an appropriate region after confirming provider terms and costs. No external project or deployment has been provisioned by this implementation.

1. Apply `supabase/migrations/001_community.sql`, `002_media_operations.sql`, `003_api.sql`, `004_listing_arrangements.sql`, `005_single_admin.sql`, and `006_open_membership.sql` in order using the Supabase SQL editor or your normal migration runner. Existing installations apply only migrations they have not yet applied. Migration 005 rejects existing data with multiple admins rather than silently demoting anyone. They create a single-community deployment. Do not apply the tests' mocked `auth` or `storage` schemas to Supabase.
2. Copy `.env.example` to `.env.local`. Set the project URL, public anon key, server-only service role key, your site URL, and a random `CRON_SECRET`. Keep `GAMAZON_DEMO=false`. Never prefix the service role key with `NEXT_PUBLIC_`.
3. Enable email authentication and configure SMTP. Require email confirmation and a minimum password length of 12. Set **Confirm signup** and **Reset password** templates to show `{{ .Token }}` using `docs/email/auth-code.html` and `docs/email/password-reset.html`; these flows accept a numeric code. Set appropriate OTP expiry and authentication rate limits. Leave anonymous auth disabled. Set Supabase's Site URL and allowed origins to your actual deployment.
4. Create an account, verify the organiser's email and finish the profile/adult/rules form. Find that verified member's UUID in Supabase Authentication and run the bootstrap SQL below with real values. Public registrations always receive the member role.
5. In Settings, enrol a TOTP authenticator and verify it. Existing sessions can enter a current code using “Verify admin session.” Moderation requires AAL2 at the database, including direct RPC calls.
6. Configure the community's city/name and replace the operator placeholders on `/guidelines` with a real legal identity, privacy/grievance contact, and retention terms before opening membership.
7. Configure the scheduled `/api/cron` worker. The checked-in Vercel schedule runs daily; the authenticated state/command requests also drain notification outbox events promptly. Worker failures return non-2xx for alerting and retry next run. Run more frequently on a scheduler supporting it if deletion latency requires it.
8. Follow `docs/OPERATIONS.md` before opening the pilot. Do not use a preview deployment with production secrets.

Bootstrap, as the project database administrator, **after recording the organiser's adult/rules consent**:

```sql
begin;
update public.community set name = 'Your city gaming circle', city = 'Your city';
update public.memberships set role = 'admin'
where id = 'ORGANISER_AUTH_UUID' and status = 'active'
  and exists (select 1 from auth.users where id = 'ORGANISER_AUTH_UUID' and email_confirmed_at is not null);
-- Confirm exactly one row was updated. The existing profile is retained.
commit;
```

Substitute a valid UUID; the example intentionally cannot run unchanged. Auth users must have a verified email. Migration 006 adds idempotent, invitation-free onboarding for verified adults. Suspended and deleting accounts cannot rejoin. Legacy invitation records/RPCs remain for compatibility, but there are no invitation controls in the app.

There is one owner account. Assign its role to your verified Auth UUID during the private bootstrap; sign-ups always create ordinary members. `/admin` checks the verified identity and active database membership before rendering, and the data/command RPCs independently require the admin role plus MFA. Knowing the URL does not grant access. See `docs/OPERATIONS.md` for recovery and the optional admin subdomain.

## Architecture and API

`src/components/community-app.tsx` implements the pilot interface. `src/lib/schema.ts` defines validated command types. The demo uses `src/lib/domain.ts` with `src/lib/seed.ts`. Live mode uses the **same commands** through PostgreSQL's `app_command(jsonb)` RPC; SQL enforces authorization even if the web server is bypassed.

| Endpoint               | Purpose                                                                                                              |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `GET /api/v1/state`    | Authenticated community bootstrap and current member's private data; private photos receive 60-second URLs.          |
| `GET /api/v1/session`  | Verified identity and current identity's membership status, including suspended/no-membership access screens.        |
| `POST /api/v1/command` | Typed mutations for profiles, posts, comments, connections, messaging, reports, outcomes, invitations, and deletion. |
| `GET /api/v1/posts`    | Cursor-paginated listing API (`q`, `platform`, `kind`, `status`, `limit`, `cursor`).                                 |
| `GET /api/v1/messages` | Cursor-paginated history (`conversation_id`, `limit`, `cursor`).                                                     |
| `POST /api/v1/images`  | Owned-post multipart upload; <=5 MB, JPEG/PNG/WebP input, max four images.                                           |
| `POST /api/v1/join`    | Join as a verified email identity after profile and adult/rules acceptance.                                          |
| `GET /api/cron`        | Bearer-secret-protected outbox and retention/deletion worker.                                                        |
| `POST /api/v1/demo`    | Loopback-only demo member switch; absent in live mode.                                                               |

State is a pilot-sized bootstrap, currently polling every eight seconds while the page is visible. The UI renders incremental feed pages from that snapshot; separate cursor APIs are ready for moving discovery/history to incremental server fetching as the dataset grows. Do not claim the aggregate endpoint supports an unbounded nationwide community. PostgreSQL indexes cover feed order, filters, message history, and full text search; the current API uses title substring matching.

Messages are stored before realtime delivery. Reconnection fetches persisted state; UUID retries cannot create duplicate messages. Outbox events commit with the underlying mutation; delivery is a separate idempotent transaction. No chat content is included in notifications or operational logs. Realtime uses Postgres Changes, not public broadcast channels; the same row-level policies gate subscription data.

Private media: browser storage writes are denied. The server authenticates an owner, re-encodes to WebP with Sharp (discarding metadata), uploads through its private service client, then attaches the object through a service-only RPC which rechecks ownership and the four-photo limit. Orphaned uploads are removed after 24 hours. Existing signed links may remain valid for up to 60 seconds after access changes.

## Tests

```powershell
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm run test:auth
npm run test:scale
```

`npm test` executes the actual migrations in PGlite (PostgreSQL in WASM), with mocked Supabase auth/storage envelopes and real database roles/RLS. It also tests the demo domain. These tests do not replace live Supabase email, storage signing, or websocket integration tests.

Browser tests run against a local demo on port 3000. They create disposable demo posts/comments and change the fictional profile. Restart the demo server to reset it. When installing browsers to a project-local directory, use the same `PLAYWRIGHT_BROWSERS_PATH` for installation and test execution.

The auth suite starts a separate Next.js test app on port 3001 and a loopback-only Supabase Auth contract fixture on port 54329, then stops both. It uses fictional `.test` email addresses and exercises the real browser SDK/cookies, server authentication, password signup/login/recovery and profile onboarding. It does not send email or prove live Supabase transport. The real migration/RLS suite independently tests database authorization, open-membership guards and legacy invitation behavior. No fake auth endpoint or bypass is included in the application.

Run concurrency tests against a production preview: build and start with `GAMAZON_DEMO=true` locally, then run `npm run test:scale` (100 independent browser contexts, eight concurrent workers by default) and `node scripts/load-test.mjs --local` (500 mixed reads, 100 concurrent clients). `GAMAZON_BROWSER_WORKERS` adjusts browser concurrency; CI defaults to four workers. Set `GAMAZON_E2E_PRODUCTION=true` to let Playwright start a production preview instead of a development server. Local fixture results are not hosted-database or nationwide-capacity claims. Hosted load tests require `GAMAZON_BASE_URL` and a dedicated fixture's `GAMAZON_SESSION_COOKIE`; never use a real member's session.

Listing commands now accept `exchange_modes` (`sale`, `swap`, `loan`), with an empty default for legacy posts. Old posts are not silently classified. `post.update` accepts the listing fields plus its ID, requires ownership and preserves related content. `post.create` accepts an optional `request_id` UUID for retry-safe creation. The UI uses that key automatically. The feed cursor API accepts `exchange=sale|swap|loan` for offers matching that arrangement.

## Launch status

This repository contains a runnable implementation, not proof of market demand or legal clearance. Real interviews, inventory commitments, independent policy review, live provider setup, staging load results, restore drill, and operator contact details remain launch prerequisites. See `docs/PILOT.md` and `docs/OPERATIONS.md` for concrete steps and acceptance criteria.

The current setup progress and deferred domain, email and sole-owner onboarding tasks are tracked in `docs/TODO.md`. Verified local and live-provider results are recorded separately in `docs/VALIDATION.md`.
