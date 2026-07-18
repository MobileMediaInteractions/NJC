# Custom-domain launch runbook

The web/API project already runs at `https://njc-web.vercel.app`. Do not change its project, database, Blob stores, Redis resource, or Git connection when a domain is purchased. Attach the domain to this existing Vercel project so the same deployment can be verified before DNS traffic moves.

No paid Vercel feature is required for this handoff. Domain registration itself is an external purchase and is intentionally outside this repository.

## 1. Choose the canonical hostname

Choose one public origin, for example `https://njcourier.com` or `https://www.njcourier.com`. Add both the apex and `www` host to the Vercel project, make the chosen hostname primary, and configure the other hostname to redirect permanently to it. Do not create a second web project.

Leave `NEXT_PUBLIC_SITE_URL` unset in Preview. After Vercel validates the production hostname, set it in the **Production** environment only to the exact canonical HTTPS origin with no path:

```dotenv
NEXT_PUBLIC_SITE_URL=https://njcourier.com
```

Redeploy production. Canonical links, Open Graph URLs, structured data, RSS, robots and both sitemaps will move together.

## 2. Move Clerk to production identity

The current `*.vercel.app` deployment uses a Clerk development instance for prelaunch testing. A real domain is the point to create/activate Clerk's production instance and follow Clerk's DNS instructions for that domain.

1. Configure the final application domain in Clerk.
2. Add every Clerk DNS record exactly as shown and wait for verification.
3. Replace the Vercel project's `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` with the production-instance values for Production only, or reconnect the Marketplace resource if it provisions those values.
4. Keep the catch-all `/sign-in`, `/sign-up`, and `/studio/sign-in` routes unchanged.
5. Sign in on the custom hostname and explicitly assign/reconfirm the first administrator's `publicMetadata.role = "admin"`. Do not assume development-instance users or metadata have transferred.
6. Verify an unassigned account receives the staff-approval screen and cannot access Studio APIs.

Never place a Clerk secret in a public/native environment variable or in Git.

## 3. Keep assets same-origin initially

Leave `NEXT_PUBLIC_ASSET_ORIGIN` unset for the first domain launch. Brand assets will automatically use `https://<canonical-host>/assets/...`, avoiding a second DNS and deployment change.

If an independent asset project is useful later, deploy `apps/cdn`, attach `cdn.<domain>`, verify `/assets/manifest.json`, then set `NEXT_PUBLIC_ASSET_ORIGIN=https://cdn.<domain>` and redeploy. This remains optional.

## 4. Verify before enabling indexing

Run the repository verifier against the canonical hostname after its deployment is ready:

```bash
pnpm domain:verify -- https://njcourier.com
```

It checks the homepage canonical and Open Graph origins, robots, general/news sitemaps, RSS, public API, Studio OAuth callback, and employee association files. Also confirm:

- the non-primary hostname redirects once to the canonical hostname;
- `/studio` recognizes the administrator and the Team page shows an active database-backed role;
- production Vercel logs contain no new errors;
- a portable encrypted database/media export completes;
- Vercel, Neon, Clerk, Blob and Redis remain within their free-tier limits.

Keep `NEXT_PUBLIC_SEO_INDEXING_ENABLED=false` until verified reporting, authors, contact details, legal review and search-console ownership are ready. Domain attachment alone is not approval to index the prelaunch site.

## 5. Native and employee-link follow-up

No native rebuild is required merely to attach the web domain. Before the mobile, TV or employee apps ship, update their API origins to the final hostname and rebuild them:

- `EXPO_PUBLIC_API_URL`
- `EXPO_PUBLIC_TV_API_URL`
- `EXPO_PUBLIC_EMPLOYEE_API_URL`
- `EXPO_PUBLIC_EMPLOYEE_LINK_HOST` (hostname only)

For employee Universal Links/App Links, also configure `EMPLOYEE_IOS_APP_ID` and `EMPLOYEE_ANDROID_SHA256_CERT_FINGERPRINTS`, then verify both `/.well-known` responses on physical devices. Do not invent App Store, Play Store, signing or association values.

## Rollback

If canonical verification fails, keep or restore `njc-web.vercel.app` as the working production alias, remove `NEXT_PUBLIC_SITE_URL` from Production, and redeploy the last known-good commit. DNS can remain unpointed while the custom hostname is corrected. Do not modify or recreate the database and storage resources during a domain rollback.
