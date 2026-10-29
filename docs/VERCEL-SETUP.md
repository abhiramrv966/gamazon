# Vercel and domain setup

Verified on 29 October 2026. The existing Vercel project is `gamazon/gamazon`, linked to `abhiramrv966/gamazon` on the `main` branch. Its production alias is `https://gamazon-one.vercel.app`. No second project was created.

The purchased domain is `gamazon.store`, registered through GoDaddy. Both `gamazon.store` and `www.gamazon.store` are attached to the existing Vercel project. The `www` address has a permanent 308 redirect to the apex domain. Custom-domain routing and HTTPS must be verified after the GoDaddy records are saved and propagated.

## GoDaddy DNS records

Open My Products → Domains → gamazon.store → Manage DNS. Vercel recommended these records on 29 October 2026:

| Type  | Name  | Value                                 | TTL     |
| ----- | ----- | ------------------------------------- | ------- |
| A     | `@`   | `216.198.79.1`                        | Default |
| A     | `@`   | `64.29.17.1`                          | Default |
| CNAME | `www` | `c7bdf2d8d3bbde2e.vercel-dns-017.com` | Default |

Replace the parked `@` addresses `3.33.130.190` and `15.197.148.33` with the two A records above. Replace the existing `www` CNAME target with the hostname above, without `https://`. Leave GoDaddy nameservers and existing MX/TXT records unchanged. Use the project's Vercel Domains settings for current recommendations if they change later.

## Application settings

Production uses the supplied Supabase public URL/key, server key and cron secret, with `GAMAZON_DEMO=false` and `NEXT_PUBLIC_SITE_URL=https://gamazon.store`. Server credentials are Secret variables. The public URL/key and origin are Config variables. These values are scoped to Production; Preview builds do not receive the production database credentials. Configure a separate Supabase project before testing real membership in Preview.

The operator-only `SUPABASE_SESSION_POOLER` connection stays local and is not needed by the deployed app. The local development origin remains `http://127.0.0.1:3000`. `.vercel/`, environment files, temporary tooling and test artifacts are ignored by Git.

Environment changes require a new production deployment. Verify the landing/sign-in pages, private API denial without a session, disabled demo switching, and cron authorization after rebuilding. Verify apex HTTPS and the `www` redirect after DNS propagation.

Before activating email, set Supabase Authentication → URL Configuration → Site URL to `https://gamazon.store` and review allowed redirect URLs. The verified Resend sender and sole-owner account/MFA are still separate pending tasks in `TODO.md`.
