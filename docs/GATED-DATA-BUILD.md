# Gated data build review

Order: VLE-GATED-DATA-1, Q7 step 2. Draft implementation under Elon's 2026-10-15 15:38 PASS and binding decisions. The copied SPEC-GATED-DATA.md preserves the reviewed spec; its historical stop text is superseded only by that build order. No live intake or deployment is enabled.

## Implemented flow

`/supplier/gated` provides named-user code issue/redeem, version/action selection, explicit expiries, cancellation, grant revocation/narrowing, quarantine upload, inspection request, withdrawal and supplier history filters. The existing supplier desk links to it. The history displays organization and user display names, action/outcome/reason and version. No network address is collected. The shell is public but contains no document data; all data operations go through the authenticated API.

`/api/gated` GET supports management metadata, history, authorized document metadata, preview, content and download. POST supports the lifecycle plus reviewer eligibility and ADMIN management assignments. POST requires same-origin requests and validated request shapes. Codes occur in a body and the one-time issuer response only. HEAD denies without opening a stream. Range requests are reauthorized and return a complete file, with Accept-Ranges: none. Preview uses safe attachment delivery, not inline execution of untrusted uploads.

The separate gated policy resolves current membership and roles from repository state on every request. Existing OPS/ADMIN tenant bypass helpers are not used. Eligibility, supplier ownership, subject association, availability, exact immutable version, explicit action and redeemed grant are rechecked. Management requires a supplier-scoped ADMIN assignment. ADMIN cannot assign themselves. Owners must redeem an explicitly audited self-addressed invitation to read content. No wildcard, organization-wide grant or delegation exists.

`src/gated/service.ts` performs mutations and access decisions in repository transactions. Code generation uses Node's cryptographic random generator and keyed digest, with constant-time comparison. Redemption commits consumption, one grant and its audit together. Failed redemption commits a per-user/organization throttle and a restricted security event. Unknown guesses are not attributed to another supplier. Expired access is denied and recorded as unavailable-or-expired on observation; no expiry job is needed. Narrowing cannot extend or expand access. Reinstated eligibility does not revive revocation.

`src/gated/postgres.ts` is the durable adapter. A transaction-scoped advisory lock serializes policy mutations, decisions and audit appends across application instances. Membership and association tables are locked for the duration of the decision so concurrent removal cannot invalidate a partially checked snapshot. Grants have unique invitation provenance. A failed audit insert rolls back the whole operation. Eligibility and audit history are append-only; supplier reads are explicitly scoped. Audit hashes cover the prior event hash and server event fields in commit order. No existing qualification, publication, evidence, certification or listing state is advanced.

This first adapter loads the bounded gated state under a global lock. It favors a simple reviewable correctness boundary; it is not a claim of capacity validation. Any later supplier-partitioned optimization must preserve cross-organization eligibility, membership, code consumption and audit ordering semantics. There is no shared cache of access decisions.

## Storage and configuration boundary

`PrivateStorage` and `Scanner` are interfaces. Tests have a FAKE in-memory object adapter and FAKE content inspection. The application wires unavailable adapters and denies storage operations. No bucket or scanner is provisioned. `SignedStreamingStorage` is a provider-independent adapter seam: a trusted signer supplies an internal HTTPS capability for an immutable object; the server fetches it with no-store and redirects disabled, returning only a stream. No URL or upstream header escapes through that interface. A future real signer must bind opaque keys to a fixed private store, not arbitrary user URLs.

Uploads are private quarantine objects. Availability changes only after inspection returns clean for the expected type and checksum. Failed or unavailable inspection leaves quarantine intact. A failed transaction after object upload may leave an unreferenced quarantined object; it cannot become readable, and cleanup requires the separate retention/deletion decision.

Allowed decisions are committed before signing. Delivery-ready, response-complete and failed delivery are separate observations, not proof of human reading. Audit persistence failure denies metadata and byte release. Revocation blocks later decisions, while a previously authorized or started stream and delivered bytes cannot be recalled. This limitation is visible on the supplier screen.

Required configuration, with no production defaults:

- GATED_POLICY_REVISION and GATED_CODE_DIGEST_KEY.
- GATED_CODE_BYTES.
- GATED_ATTEMPTS_PER_WINDOW and GATED_ATTEMPT_WINDOW_MS.
- GATED_REDEMPTION_LIFETIME_MS and GATED_MAX_GRANT_LIFETIME_MS.
- GATED_SIGNED_URL_LIFETIME_MS.
- GATED_MAX_FILE_BYTES and GATED_ALLOWED_MEDIA_TYPES.

The body reader also enforces GATED_MAX_FILE_BYTES for control requests. Missing or invalid settings fail closed. All numeric sample settings live only in the TEST-ONLY fixture/test files. VLE_DEV_ACTOR is rejected by the gated identity resolver even in local mode. No environment values were pulled or changed. Retention and lawful deletion remain TODO configuration, with no deletion job or period. Real-world eligibility evidence review remains HOLD; all exercised decisions use FAKE placeholders.

## Projection boundary and draft migration

Legacy supplier desk, public supplier profile, lot document queries and OPS/ADMIN compliance packs now require visibility = PUBLIC before selecting document references. Unknown visibility is excluded. Gated versions and access history live in separate tables never queried by public projections. Existing public metadata and structured data use supplier profile data through the filtered service. The sitemap is a static public-route allowlist and contains no gated routes or document enumeration. A private file never creates public thumbnails or derivatives.

`docs/migrations/DRAFT-gated-data.sql` is outside the migration runner and journal, and has not been applied. It adds the visibility marker, typed-payload entity tables, unique grant provenance and append-only history triggers. It contains no real-record classification, inventory, backfill, URL rewriting or import. It does not make previously public external copies private. An eventual applied migration, least-privilege runtime DB role, storage adapter, scanner, approved configuration and real intake each require their separate authorization. Runtime queries depend on this draft schema and must not be deployed before that review.

## Verification

- Baseline: 74 tests passed, 3 database integration tests skipped. No baseline test failures.
- Current suite: 119 passed, 3 skipped across 16 test files, including 45 new gated policy, HTTP, storage and projection tests.
- `npm run build`: passed, including the gated API and supplier shell.
- `npx next typegen`, `npm run typecheck` and `npm run lint`: passed. Initial baseline typecheck lacked generated PageProps; normal route type generation resolved that without changing existing pages.
- Tests cover deny-by-default; wrong identity/organization; pending/revoked eligibility; exact expiry; replay/cancellation; concurrent redemption; issuer removal; immediate revocation; narrowing; quarantine and malformed uploads; audit rollback; signature suppression; request cache headers; same-origin mutations; cross-supplier log isolation; event hash ordering; public projection and privileged export exclusion.
- The query regression harness executes the actual projection services against FAKE mixed-visibility rows and checks their generated Drizzle predicates. It does not claim a live database run.
- Live database, private bucket anonymous-read controls and real scanner behavior were not exercised. No real database migration was applied. The pre-existing three integration tests remain skipped without a database, by design.

Implementation references: the installed Next.js 16.3.4 Route Handlers and route API guides were read before coding. See also the [official route reference](https://nextjs.org/docs/app/api-reference/file-conventions/route) and [PostgreSQL explicit locking](https://www.postgresql.org/docs/current/explicit-locking.html). The local installed framework guide governs this branch.
