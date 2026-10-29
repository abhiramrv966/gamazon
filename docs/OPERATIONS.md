# Live pilot operations

## Release prerequisites

- Complete the city-specific permitted-use review and retain the written decision. Account access and paid rental solicitation remain disallowed. Publish the operator's identity and privacy/grievance contact.
- Create staging and production with separate databases, keys, email settings, storage, and domains. Confirm provider region, plan suitability, backup availability, and costs. Use HTTPS in hosted environments.
- Apply migrations in order. Bootstrap only the organiser; never seed fictional users into a live community.
- Configure Resend SMTP using `RESEND-SETUP.md`, OTP templates, short verification expiry, auth rate limits, and MFA. Confirm the first invitation from issue through email verification and redemption using two real staging test accounts.
- Verify storage signing and actual Supabase realtime with two separate browser sessions; RLS tests in WASM do not validate the hosted websocket transport.
- Enable database backups and choose an expiry of no more than 30 days. Encrypt exported dumps and restrict access. Rehearse restore and deletion replay before launch.
- Schedule `/api/cron` with `Authorization: Bearer <CRON_SECRET>`; Vercel cron sets that header when `CRON_SECRET` is configured. Use platform alerts for non-2xx responses, failed runs, or no successful run within 26 hours. Do not log the bearer secret.
- Configure platform error/availability alerts and a restricted operational log destination. Logs must not include form bodies, chat content, OTPs, invitation tokens, private signed URLs, or email addresses. API responses intentionally avoid raw database details.

## Required staging exercises

1. Anonymous, non-member, suspended, and deleted accounts cannot read through HTTP, direct database API, realtime subscription, or new photo signing requests.
2. Third user cannot read a private conversation, including an AAL2 administrator. Reported message evidence is available to moderators without exposing its surrounding thread.
3. A non-friend can send one initial request; only its recipient can accept; declined requests cannot be bypassed by starting another conversation.
4. Block a participant while both sessions are active. Verify denied sends and hidden content. Previously issued photo links can survive only for their remaining 60-second TTL.
5. Replay a message UUID; there is one stored message. Interrupt realtime and reconnect; message history recovers from PostgreSQL.
6. Fail outbox delivery after committing a comment. Rerun the worker and confirm exactly one notification. Confirm signed photo upload sanitisation with EXIF GPS test data; inspect the downloaded output.
7. Report content, edit/delete the original, and confirm the evidence snapshot survives. Resolve the case and confirm an audit entry. An admin at AAL1 must not moderate or create invites.
8. Delete a non-admin member. Confirm immediate loss of community access, database cascades, object-deletion queue, and eventual Auth identity deletion. Confirm retention cleanup after advancing fixture timestamps.
9. Test keyboard focus, modal escape/focus return, 390px phone layout, and 1280px desktop layout. Review colour contrast before public expansion.

## Backup and restore drill

In staging, take a database backup using the provider's supported procedure. Retain a restricted export of `app_private.deletions` outside the backup being restored. Create a test post and message, delete a separate member, then restore into an isolated staging project. Check row counts, relationships, RLS grants, function grants, storage references, outbox deduplication, and realtime publication membership. Replay all post-backup deletion requests **before enabling traffic**; remove corresponding memberships, Auth users, and stored objects. Run the security test scenarios with staging credentials. Record recovery time, recovery point, reviewer, and outcome. Never claim this drill passed until it runs against the chosen provider.

## 100-user staging load test

Use `scripts/load-test.mjs` against staging with a dedicated active test member's session cookie; never paste the token into the source. Run a separate two-user write/realtime exercise because read load alone does not exercise messaging locks. Target 100 concurrent authenticated requests and p95 under 1 second for ordinary API reads. Record error count, p50/p95, dataset size, region, deployment plan, and test date. Do not accept a local in-memory run as proof of production capacity. The bootstrap endpoint currently returns the pilot community snapshot; monitor payload growth and use the cursor APIs before expanding.

## Ongoing work

Daily: inspect reports and respond within 24 hours, verify cron success, check error alerts. Weekly: review open-case retention, spam patterns, support effort, pilot thresholds, and cost. Metadata heuristics do not catch all prohibited content; human reporting and moderation remain essential.

## Sole administrator and recovery

The owner is the only administrator. Migration `005_single_admin.sql` enforces this with a unique index, including suspended admin accounts. Members have no Admin navigation or admin authenticator settings. Direct `/admin` requests are checked on the server; moderation, invitations, metrics and activity RPCs independently require an active admin and AAL2. Authentication or membership lookup failures never render the admin workspace. No member-facing command can change roles.

Bootstrap your verified Supabase Auth UUID privately using the README procedure. Do not identify the owner through a client-supplied email, signup metadata or the first public signup. Keep recovery access for your email, authenticator, hosting and Supabase accounts. The owner cannot self-delete through the app. Recover the same Auth identity through the provider first. If replacing it is unavoidable, a database operator must transfer ownership in one locked transaction (demote the old identity before promoting the new one), revoke the old sessions, and record the operation; never temporarily create a second admin.

### Optional admin subdomain

The current private entry point is `/admin` on the main host. A subdomain is optional navigation/deployment separation; it does not replace role checks or MFA. No domain or DNS has been provisioned.

To introduce `admin.<your-domain>` later, use a trusted deployment host mapping to `/admin`, retain the server/database checks and require HTTPS. Configure sign-in for that exact origin with host-only session cookies and expect a separate login there. Update the server's same-origin write allowlist for the two exact trusted origins before enabling admin mutations; the current configuration accepts only `NEXT_PUBLIC_SITE_URL`. Do not allow wildcard origins or widen cookie scope to every subdomain. Verify signed-in owner, ordinary member, suspended owner, logout, MFA and forged API requests on both deployed origins before switching over.

Rollback: deploy the prior compatible application version; never blindly roll back destructive schema changes. Migrations here are initial-schema files and should be applied exactly once. Preserve database backups before future migrations. Close invitations and pause onboarding while investigating an incident.
