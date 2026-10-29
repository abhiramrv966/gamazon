# Launch TODO

Supabase connected on 29 October 2026. Migrations 001–005 are applied, row-level security is enabled, the image bucket is private, and messages/notifications are included in the realtime publication. The local cron secret has been generated. Credentials remain in the ignored `.env.local` file.

## Deferred until the domain and email are ready

- [ ] Buy/configure the domain and HTTPS hosting, then set the app and Supabase site/redirect URLs to the final origin.
- [x] Choose Resend for sign-in email delivery through Supabase SMTP. Setup instructions and the code-email template are in `RESEND-SETUP.md` and `email/auth-code.html`.
- [ ] Verify the sending domain in Resend, create a domain-restricted sending key, and configure Supabase custom SMTP using `RESEND-SETUP.md`. Install the code-email template and verify delivery with the selected test recipient.
- [ ] Choose the owner's sign-in email, display name and neighbourhood; verify the email before assigning the sole admin role. Record the adult/rules consent during onboarding. No owner, member or admin identity has been created or assigned yet.
- [ ] Complete the owner's profile and the community name/city configuration.
- [ ] Enrol and verify the owner's authenticator, and confirm that invitations and moderation require MFA. Keep account recovery access outside the app.
- [ ] Configure the hosted maintenance schedule with `CRON_SECRET`; confirm successful runs and alerts.
- [ ] Complete a live two-member invitation/listing/message/photo journey, realtime reconnection and blocking checks, and a third-account privacy check.
- [ ] Complete the remaining pilot prerequisites in `OPERATIONS.md`, including operator/contact details, policy review, provider backups and a restore drill.

The local app can use Supabase before the domain is purchased. The domain, email delivery and owner setup are not prerequisites for creating the schema, but they remain prerequisites for opening membership.
