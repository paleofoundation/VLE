# Kasandrinos storefront

Presentation content is independent of lot reports, commercial terms and extracted values. The public profile retains VLE’s Inter typography and teal, orange, yellow and lilac design tokens.

`server/storefront.js` defines default content and validates changes. Only the six documented Kasandrinos lots can be featured. Page sections may be reordered; the evidence section cannot be removed. Text is escaped on rendering. Images use local assets or validated PNG/JPEG/WebP uploads in the supplier’s R2 namespace.

`/workspace/storefront` is a working editor. Draft saves persist in D1 without changing the public profile. Publishing explicitly updates the public content. Revisions reject stale updates. Draft uploads require management access until they are referenced by a published profile. Subsequent removal from the published profile makes them private again.

The verified owner email in `server/owner.ts` may edit and publish or designate one manager email. Only a verified email matching that designation may manage this storefront; ordinary supplier enrollment does not grant this access. The manager cannot delegate access. No supplier manager has been designated in production by this build. The owner control authorizes the address but sends no email; the intended manager uses the normal email-link sign-in at `/workspace/storefront`.

This build does not implement lot uploads, structured COA-value confirmation, commercial-term editing or cross-account trading. These remain separate onboarding work and must not be implied by storefront publishing permissions.

Official presentation references reviewed 22 October 2026:
- https://www.amazon.com/stores/Kasandrinos/page/A4359D02-DC92-4088-9258-D66645FDAC24 — brand banner and olive-oil/citrus lifestyle image.
- https://www.kasandrinos.com/ — family portrait and harvest image.
- https://www.kasandrinos.com/pages/about — family story, paraphrased with an attribution link.

Original media URLs are recorded in the development audit at `server/kasandrinos-media.json`. Existing COA provenance and matching rules remain in `server/KASANDRINOS.md` and `server/kasandrinos-reports.json`.
