# Launch TODO

Supabase connected on 29 October 2026. Migrations 001–005 are applied, row-level security is enabled, the image bucket is private, and messages/notifications are included in the realtime publication. The local cron secret has been generated. Credentials remain in the ignored `.env.local` file.

## Hosting and domain

- [x] Buy `gamazon.store` through GoDaddy.
- [x] Host the existing GitHub repository on Vercel as `gamazon/gamazon` (`https://gamazon-one.vercel.app`).
- [x] Attach apex and `www` to that project and configure the `www` → apex redirect.
- [x] Configure Production with `https://gamazon.store`, demo mode off and the required Supabase/cron credentials. Keep production credentials out of Preview and the operator-only database password local.
- [x] Save and verify the GoDaddy DNS records and apex HTTPS/`www` redirect using `VERCEL-SETUP.md`. Completed 30 October 2026; Vercel certificate issued and both redirects verified.
- [x] Verify the production rebuild with the updated environment: public pages, desktop/phone sign-in screens, private API denial, canonical-origin checks, disabled demo access and authenticated maintenance passed.
- [x] Set Supabase's Site URL/allowed redirect configuration for the final domain before activating email. Verified 30 October 2026: `https://gamazon.store` and exact production sign-in/sign-up/community redirect URLs.

## Email and owner setup

- [x] Choose Resend for sign-in email delivery through Supabase SMTP. Setup instructions and the code-email template are in `RESEND-SETUP.md` and `email/auth-code.html`.
- [x] Verify the sending domain in Resend, create a domain-restricted sending key, and configure Supabase custom SMTP using `RESEND-SETUP.md`. Install the code-email template and verify delivery with the selected test recipient. Completed 31 October 2026: delivered email, code validation/replay rejection, cooldown, session restoration, sign-out and non-member privacy passed on the hosted app.
- [ ] Choose the owner's sign-in email, display name and neighbourhood; verify the email before assigning the sole admin role. Record the adult/rules consent during onboarding. Testing verified an existing Auth identity; it did not grant membership or assign an owner/admin role.
- [ ] Complete the owner's profile and the community name/city configuration.
- [ ] Enrol and verify the owner's authenticator, and confirm that moderation requires MFA. Keep account recovery access outside the app.
- [ ] Configure the hosted maintenance schedule with `CRON_SECRET`; confirm successful runs and alerts.
- [ ] Complete a live two-member signup/listing/message/photo journey, realtime reconnection and blocking checks, and a third-account privacy check.
- [ ] Complete the remaining pilot prerequisites in `OPERATIONS.md`, including operator/contact details, policy review, provider backups and a restore drill.

Website DNS, HTTPS and email delivery are verified. The user approved opening registration on 31 October 2026. Owner onboarding, MFA and the remaining pilot checks remain operational tasks.

## Password registration change

- [x] Implement email/password sign-in, invitation-free signup and password recovery, preserving email verification and sole-admin controls.
- [x] Obtain explicit approval to open production registration and apply migration 006 plus Supabase password/email settings. Approved and applied 31 October 2026; required email verification, 12-character password minimum and recovery templates were read back successfully.
- [x] Deploy the password flow and run live disposable-account signup, login, recovery and cleanup checks. Verified 31 October 2026 on `https://gamazon.store`: confirmation/recovery emails delivered, password login/recovery and old-password/code-replay rejection passed, new members were denied admin access, and temporary Auth/profile/membership data was deleted.
