# Launch TODO

Supabase connected on 29 October 2026. Migrations 001–005 are applied, row-level security is enabled, the image bucket is private, and messages/notifications are included in the realtime publication. The local cron secret has been generated. Credentials remain in the ignored `.env.local` file.

## Hosting and domain

- [x] Buy `gamazon.store` through GoDaddy.
- [x] Host the existing GitHub repository on Vercel as `gamazon/gamazon` (`https://gamazon-one.vercel.app`).
- [x] Attach apex and `www` to that project and configure the `www` → apex redirect.
- [x] Configure Production with `https://gamazon.store`, demo mode off and the required Supabase/cron credentials. Keep production credentials out of Preview and the operator-only database password local.
- [ ] Save and verify the GoDaddy DNS records and apex HTTPS/`www` redirect using `VERCEL-SETUP.md`.
- [x] Verify the production rebuild with the updated environment: public pages, desktop/phone sign-in screens, private API denial, canonical-origin checks, disabled demo access and authenticated maintenance passed.
- [ ] Set Supabase's Site URL/allowed redirect configuration for the final domain before activating email.

## Email and owner setup

- [x] Choose Resend for sign-in email delivery through Supabase SMTP. Setup instructions and the code-email template are in `RESEND-SETUP.md` and `email/auth-code.html`.
- [ ] Verify the sending domain in Resend, create a domain-restricted sending key, and configure Supabase custom SMTP using `RESEND-SETUP.md`. Install the code-email template and verify delivery with the selected test recipient.
- [ ] Choose the owner's sign-in email, display name and neighbourhood; verify the email before assigning the sole admin role. Record the adult/rules consent during onboarding. No owner, member or admin identity has been created or assigned yet.
- [ ] Complete the owner's profile and the community name/city configuration.
- [ ] Enrol and verify the owner's authenticator, and confirm that invitations and moderation require MFA. Keep account recovery access outside the app.
- [ ] Configure the hosted maintenance schedule with `CRON_SECRET`; confirm successful runs and alerts.
- [ ] Complete a live two-member invitation/listing/message/photo journey, realtime reconnection and blocking checks, and a third-account privacy check.
- [ ] Complete the remaining pilot prerequisites in `OPERATIONS.md`, including operator/contact details, policy review, provider backups and a restore drill.

The local app can use Supabase while DNS and email setup are pending. Email delivery and verified owner setup remain prerequisites for opening membership.
