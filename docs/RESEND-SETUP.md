# Resend email setup

Password-registration update — 31 October 2026: the user explicitly approved public registration and deployment. Migration 006 and Supabase password/confirmation/recovery settings are applied and verified. The new app uses email/password login, signup confirmation codes and recovery codes; passwords require at least 12 characters. The password flow is deployed at `https://gamazon.store`. A live disposable-account browser run passed signup, email confirmation, consent/profile onboarding, password login, recovery, old-password/code-replay rejection and sign-out; both email events were delivered at Resend's documented test addresses. The synthetic account/profile/membership were removed afterward. `docs/email/auth-code.html` is the confirmation template and `docs/email/password-reset.html` is the recovery template. The earlier real-Gmail sign-in-code verification below records the previous production flow; it is separate from the disposable-address password checks.

Resend is the selected email provider. Supabase Auth generates and verifies sign-in codes, and delivers them through Resend SMTP. The app continues using its existing Supabase Auth calls; it does not need a Resend SDK or a public email-sending endpoint.

Status: activated and verified on 31 October 2026. Supabase custom SMTP and both branded code templates are configured and read back successfully. The `Gamazon Supabase Auth` key has Sending access restricted to `auth.gamazon.store`. Resend marks the domain and all four DNS records verified. A real sign-in email was delivered to the selected test recipient and its code was verified through the hosted app.

## Account connection

Following [Resend's setup guide](https://resend.com/setup.md), app email uses the existing Supabase sign-in flow. The configured sender is `Gamazon <login@auth.gamazon.store>`.

Checked on 30 October 2026: local setup credentials now provide Resend domain management and Supabase project access. The official CLI is installed only in the ignored `.npm-cache/resend-tools` directory; no application dependency was added.

Setup used these operator credentials from the ignored `.env.local` file:

- `RESEND_API_KEY`: a temporary Full access key named `Agent setup` from [Resend API Keys](https://resend.com/api-keys), needed to create and verify the domain and create its sending-only key.
- `SUPABASE_ACCESS_TOKEN`: an account token from [Supabase Access Tokens](https://supabase.com/dashboard/account/tokens), needed to configure Auth SMTP, code templates and the production Site URL. The existing service-role key cannot change these management settings.

Neither operator credential belongs in Vercel, client code or Git. Revoke the temporary setup credentials when configuration is complete. The domain-restricted sending key will be stored in Supabase SMTP settings. The user has selected a test recipient; do not create community membership or assign the owner role merely to test email.

## 1. Verify the sender domain

Add `auth.gamazon.store` in Resend → Domains for sending only. Retrieve its generated verification records and use GoDaddy's **Auto configure** flow from the Resend domain page where available. Verify the records and domain status before switching SMTP. Use `login@auth.gamazon.store` as the sender.

GoDaddy remains the DNS provider and Domain Connect is advertised. The root domain already has a DMARC policy (`p=quarantine`); preserve it, the website records and existing mail records. Do not add a duplicate root DMARC record.

Follow [Resend's domain verification guide](https://resend.com/docs/add-a-domain) for future changes. DNS record values must come from your Resend account. Both Google and Cloudflare resolved the required records, and exact-value assertions against Cloudflare passed on 31 October 2026.

The created domain is [auth.gamazon.store in Resend](https://resend.com/domains/32ece40c-907a-4d93-8467-d8c5ab040989), using `ap-northeast-1`, sending enabled, receiving disabled and TLS enforced. Open/click tracking are disabled. These four records were confirmed published on 31 October 2026 after manual GoDaddy setup. Keep them as a recovery reference:

| Type  | Name in GoDaddy          | Value                                        | Priority |
| ----- | ------------------------ | -------------------------------------------- | -------- |
| TXT   | `resend._domainkey.auth` | The complete DKIM value below                | —        |
| MX    | `send.auth`              | `feedback-smtp.ap-northeast-1.amazonses.com` | 10       |
| TXT   | `send.auth`              | `v=spf1 include:amazonses.com ~all`          | —        |
| CNAME | `rsend.auth`             | `send.forge.rmta.net`                        | —        |

DKIM TXT value (public verification record, not an API credential):

```text
p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDCJSgcR0LiHHBLooGORO6nXBlUp61YqUD066TyM8o5bh8F8Db5Aozr/iCoprzWswVHBynN20NwjYp1ajreNVjZxfz7RxnSjX1C+4GpDBwW3aIdNdtNcEdA4RoEy0xYDcn7r1VUk+o6ccvXBeFTYCKXNmkjRI4x9RWF7nfQgQvq6wIDAQAB
```

GoDaddy appends `.gamazon.store` to these names; do not append it again. Save the records, then trigger verification in Resend. Preserve the existing website A/CNAME records, nameservers, root DMARC and other mail records.

## 2. Create the SMTP credential

The `Gamazon Supabase Auth` key was created with Sending access restricted to the verified sending domain. Its permission and domain binding were checked against the creation request. The API key is stored as the password in Supabase's SMTP settings; it was not added to Git, Vercel or a `NEXT_PUBLIC_` variable. The Next.js runtime does not need this key.

See [Resend's API key guide](https://resend.com/docs/create-an-api-key).

## 3. Configure Supabase

Open your Supabase project → Authentication → Email (under Notifications) → SMTP Settings. Enable custom SMTP and enter:

The Auth Site URL is already `https://gamazon.store`. Its redirect allow list contains only the exact production `/community`, `/signin` and `/signup` URLs. A readback verified these settings on 30 October 2026. Existing email verification remains required.

| Setting      | Value                      |
| ------------ | -------------------------- |
| Host         | `smtp.resend.com`          |
| Port         | `465` (TLS)                |
| Username     | `resend`                   |
| Password     | Your Resend API key        |
| Sender name  | `Gamazon`                  |
| Sender email | `login@auth.gamazon.store` |

Source: [Resend's Supabase SMTP guide](https://resend.com/docs/send-with-supabase-smtp).

## 4. Use code emails

Supabase's Magic Link and Confirm signup templates use the HTML in `docs/email/auth-code.html`. Their configured subjects are `Your Gamazon code` and `Verify your email for Gamazon` respectively. The sign-in subject was confirmed in the delivered email after Supabase's template cache refreshed.

Keep `{{ .Token }}` unchanged. The app accepts an emailed code, so these templates do not need a confirmation-link button. This does not grant community membership or administrator access; the existing invitation and owner-bootstrap rules still apply.

The live Magic Link and Confirm signup templates are installed and match `docs/email/auth-code.html`. Supabase accepted the template edits after custom SMTP was configured; no plan upgrade was required. Codes have eight digits and expire after 10 minutes, with a 60-second per-address cooldown and a project email limit of 30 per hour.

Review OTP expiry and authentication rate limits before opening membership. Follow [Supabase's email OTP guide](https://supabase.com/docs/guides/auth/auth-email-passwordless).

## 5. Verify before inviting members

- Send a code to an explicitly selected test recipient and confirm it arrives through Resend.
- Verify the code in the app, then verify that a used or incorrect code is rejected.
- Check resend cooldown, invitation acceptance, session restoration and sign-out.
- Inspect delivery failures in Resend and Supabase without copying codes or credentials into logs.
- Complete the separate verified-owner and MFA tasks in `TODO.md`.

## Live verification — 31 October 2026

The hosted `/signin` page requested an actual email through Supabase and Resend. Resend reported `delivered`, the sender and subject matched, the eight-digit code rendered without unresolved variables, and the app accepted it. Incorrect and already-used codes were rejected. The resend button enforced its cooldown, the session survived a page reload, and sign-out returned private/session API requests to 401. A verified non-member remained unable to read community data. No invitation was redeemed, and no membership or admin role was granted.

The browser check used a 390px viewport. Sanitised results are in ignored `artifacts/resend-live-auth-checks.json`; codes, session tokens and SMTP credentials are absent from that report. Initial SMTP attempts failed while the domain was only partially verified; all records subsequently verified and the final live check passed. No broader application load test was rerun for this provider configuration change.

Owner onboarding/MFA and the live two-member community journey remain separate launch tasks. Temporary management credentials can be revoked after operator setup is finished; retain the restricted SMTP key in Supabase.
