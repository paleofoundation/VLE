# Supplier applications

`/suppliers/new` accepts company name, country, ingredient categories and contact email. The anonymous application enters `PENDING_REVIEW`; it cannot publish. The existing Better Auth one-time email link verifies mailbox control. The server binds verification to the signed-in, verified email, never to client-supplied verification flags.

`/admin/suppliers` and its APIs require the existing site owner or an administrator explicitly listed in `ICS_ADMIN_EMAILS`. Approval requires verified mailbox ownership and a review note; applicants cannot review their own company. Approval creates the supplier's private workspace in the same database batch. Production supplier organization/lot/release operations, report uploads, storefront publication, and workspace setup check server-side approval. Existing explicit Kasandrinos management remains separate from public applications.

Queues use indexed cursor pagination (25 records per page). Email and normalized-company unique constraints catch duplicate races. Atomic persistent budgets limit IP/email submissions. JSON bodies are bounded before parsing.

## Release blocker

The current repository has two hosting builds: the Cloudflare Vinext backend and a Next.js Vercel build. `server/cloudflare-workers-stub.ts` explicitly returns `undefined` for `DB` and `BUCKET` on Vercel. The onboarding API therefore requires the existing Cloudflare backend or a connected durable backend before it can work on the public Vercel deployment. Releasing a form alone does not complete onboarding.

The available Sites source endpoint could not be resolved in the execution environment. The Vercel connection also returned 403 for the project's team scope. These changes were not published or tested against production.

## Release and verification

Apply migrations through `0013_clever_aaron_stack`, then `0014_supplier_applications.sql`, before releasing to the connected backend. Preserve the existing Better Auth secret, email transport, origin configuration and database; never copy their values into reports.

Run `npm run test:onboarding`. Its SQLite integration tests cover migration application, verification and admin gates, duplicate races, persistent rate limits, indexed pagination across 1,001 applications, pending submission, and deletion. Both `npm run build` (Vinext) and `VERCEL=1 next build --webpack` compile; a compiled Vercel build still requires a working backend binding.

After deployment, check `/suppliers/new` returns 200. Submit a clearly identified test supplier, confirm `PENDING_REVIEW` in the admin queue, and remove it through the authorized DELETE endpoint. Test the real email link with a controlled mailbox; ensure approval is unavailable before verification and listing writes are rejected before approval. No production test application was created during implementation.
