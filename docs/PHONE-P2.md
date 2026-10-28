# Phone P2: requests and answers

Stacked on #77 (includes #78); retarget to main after both land. The base is consumer head 73bdf65, following normal prerequisite merge 915cd9f. This phase adds schema 0013 only.

Brands choose a requested item, select one supplier, an explicit list, or every currently verified supplier for an ingredient, and send. Recipient selection is stored once. A retry cannot add new suppliers. Direct requests require a known public supplier and matching ingredient; only the all-verified broadcast requires current operator-reviewed verification. Listings never establish verification by themselves.

Suppliers answer from the request with a quick reply or explicitly share matching digitized records already on file. Reviewed supplier sources retain their actual product, lot, reported rows and source fingerprint. They are labeled supplier-provided, not authenticated laboratory credentials or certifications. An operator must review an existing source and exact source hash before a digitized record can appear. No initial catalog or document records are seeded by the migration.

Native TECRID metadata and results retain separate consent scopes. Private results require the exact brand in the native grant and a confirmed, unwithdrawn lot release. Receiver OFF excludes native records entirely. Certificates must currently verify against the configured registry; self-reported status does not qualify. A price response references an existing quote already scoped to that brand, preserving its original values. Sample requests use quick replies; no sample inventory is invented.

Answers store asset references, never copied result payloads. Each read and answer resolves current source ownership, version, status, registry verification, consent and release scope. Withdrawal or revocation removes access. Missing or no-longer-authorized records say not provided. Separate grants never combine to widen scope. Concurrent updates use versions and mutation nonces. A stale answer cannot overwrite another response or increment the unread count twice. Not now is private; marking an answer read cannot erase a newer unread update.

## API and data

`/api/requests` provides account-scoped list/create; `/catalog` provides public ingredient/supplier metadata; `/waiting` provides metadata-only tasks; `/:id` and `/:id/on-file` return participant-owned detail/current records. Actions include answer, withdraw-answer, not-now, read and withdraw. Operator catalog/document review and supplier source withdrawal have separate scoped routes. Actual Worker dispatch uses the existing verified-email session, selected account and editable membership. Mutation origin, body size, rate budget, account and current-version guards fail closed. Viewers cannot mutate.

Migration `0013_clever_aaron_stack.sql` follows exact phone 0011 and native consumer 0012. It creates four empty tables: supplier verification catalog, requests, recipient decisions and reviewed digitized documents. Schema only; no operational backfill or production apply. In-app notifications contain only request metadata and are never queued for email delivery. No result values are logged or placed in notifications.

## Validation and limits

Build PASS. All 32 test files PASS, including existing auth, security, proof, sourcing and native-stream regressions, plus the three new P2 suites. Focused lint has zero errors or warnings. Drizzle reports no schema changes after generating 0013. Tests use disposable Miniflare D1/R2 and intercepted transports. Compiled Worker tests serve direct request detail links as private noindex pages, reject invalid paths with404, and reject anonymous reads/mutations on every request route, private responses are no-store, receiver OFF, zero outbound calls.

The browser preview invokes the actual scoped request and sourcing APIs, real disposable D1/R2 and production frontend modules. Only the verified identity is replaced by a labeled synthetic role fixture. This verifies browser to API to persisted data to response; it does not claim live email sign-in, production integration, real registry access or live receiver activation. Existing auth/security suites cover email/session boundaries separately.

Brand and supplier journeys at 390 and 1440 have no horizontal overflow, no menu, at most two primary actions per card and zero page errors. Browser checks confirm Request in three taps and Answer in two, one persisted write per action and no email outbox entries. Additional phone journeys cover named one, explicit listed suppliers, custom subset and quick reply. Creating a new custom subset requires one selection per supplier plus confirmation; with one selected supplier that path takes five taps. Named, currently listed and all-verified choices use the three-tap path. Browser evidence is under `verification/phone-p2/`.

## Tap notes

Brand: 1. Tap COA. 2. Tap the named supplier, These listed suppliers, or Every verified supplier. 3. Tap Send request. Check the names in the final review before sending. Selecting a different ingredient or building a custom subset adds selection taps.

Supplier: 1. Tap Answer on the home card. 2. Tap Share these records, or a quick reply. Record details can be expanded before sharing; no PDF needs to be opened. A successful answer remains attached to its request with the actor and time. Approve stays the P1 one-tap action.

## Release boundary

Draft only, receiver OFF. No merge, deployment, production migration, credential or real outbound message. P4 standing passes still require the live mint/security gate. Final publication must preserve a phase-only P2 diff and ordered 0011/0012/0013 migrations. Retarget to main after prerequisites land, using normal integration without force pushes or history rewrite.
