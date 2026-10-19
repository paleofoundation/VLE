# READY-6 validation

Branch created from main with earlier sprint prerequisites as separate commits.

- Lint, typecheck and production build pass. Vitest: 107 passed, three existing integration tests skipped.
- Actual local brand forms create DOCUMENT, SAMPLE, QUOTE and INVITE_SUPPLIER requests. Tampering a non-member invitation into a SAMPLE is rejected server-side.
- Supplier inbox excludes invitations. A real supplier reply is stored and marks its request RESPONDED.
- A second brand sees no requests or replies belonging to the first brand. Domain tests cover cross-brand reads, cross-supplier replies and non-member request restrictions.
- Supplier invitations route only to the operations inbox. No email provider is configured, so all notifications are in-app. No outbound message is sent.
- Brand dashboard prioritizes requests. Existing commercial workflow remains at `/buyer/commercial`. Direct quote requests have no requirement-match record, so replies stay in the request thread rather than creating an invalid matched supplier_quote.
- Request forms, buyer and supplier inboxes, operations queue and profile actions checked at 1440px and 390px. Screenshots committed under `docs/screenshots/vle-ready-6-brand-requests/`.
- The existing eligible-lot page now links to the same request form with its real physical lot ID. No qualifying lot was fabricated for screenshots; that happy path needs a genuine published lot.

Typecheck now generates Next route types before running TypeScript so new route names do not depend on a previous build.
