# READY-5 validation

Created from main, carrying READY-1 through READY-4 and supplier-certification prerequisites as separate commits.

- Lint, typecheck and production build pass. Vitest: 104 passed, three existing integration tests skipped.
- Real local browser flow saves profile/product/lot/document, publishes a member profile and checks the supplier-reported label.
- An unknown quantity stays null. A TECRID request queues operations without a physical lot or invented inventory. Completing the inventory and requesting again creates exactly one REQUESTED sampling order. Repeating the request creates no duplicate. Inventory verification stamps remain null.
- A tampered product ID is rejected server-side; another supplier's temporary local record is unchanged and removed after the test.
- All writes require a SUPPLIER membership and derive profile ownership from the server-side organization. Published profile URLs are retained.
- Certifications link to the existing checklist. The previous commercial desk remains available at `/supplier/commercial`.
- Member product, document and real lot status displays are database-backed. A claimed Kasandrinos member profile uses the generic member view; the public-document override remains for non-members.
- Dashboard, commercial desk, public profile, documents, supplier directory and Kasandrinos return HTTP 200 at 1440px and 390px without overflow. Screenshots committed under `docs/screenshots/vle-ready-5-supplier-self-listing/`.

Migration 0008 is applied only to disposable local PostgreSQL and the explicitly approved isolated sprint preview schema. No existing application tables are migrated during this sprint.

Document intake uses original HTTPS links. Externally hosted files require the supplier page that publishes the file. No new file-storage or email provider is introduced.
