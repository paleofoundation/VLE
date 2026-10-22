# Gated supplier contaminant data

Order: VLE-GATED-DATA-1, Q7, step 1.
Status: Draft specification. WAITING_ON: ELON SPEC PASS.

## Purpose and approval boundary

Supplier contaminant documents may be viewed or downloaded only after login and successful authorization-code redemption, with current eligibility and a supplier-controlled grant checked on every request. Eligible recipients are verified suppliers or approved brands. Eligibility alone never grants access to another supplier's documents.

Kasandrinos is the intended first real seed target only. This specification does not assert its enrollment, verification, consent, documents or results. Any later authorized build must seed clearly labeled placeholder organizations, identities, documents and access events only. Real supplier data requires separate explicit authorization from Elon.

This step delivers this document in a draft PR only. It authorizes no application code, migration, seed, storage provisioning, production configuration or data movement. After filing the PR and STATUS, stop for Elon SPEC PASS. Subsequent implementation requires an authorized build order. Q8 to Q10 and Q11 step 2 remain outside this work.

Document access is separate from document authenticity, TECRID evidence, lot qualification, certification, ranking and publication. A document or access approval does not establish safety or compliance. The program claim remains a standard per product category with scheduled retesting. This feature sets no contaminant limits or numeric results.

## Existing repository baseline

Reviewed against `origin/main` at `40e95cca5b4b035f4651b10ac3c2360441ab7110`. The README identifies the primary domain as `vle.exchange`.

- [Membership mapping](CLERK_MEMBERSHIP_MAPPING.md) and [current actor resolution](../src/lib/current-actor.ts) separate Clerk login from database organization membership. Existing roles are BUYER, SUPPLIER, OPS and ADMIN. Neither a SUPPLIER role nor a BUYER role currently establishes the eligibility decisions required here.
- [Document schema](../src/db/schema.ts) records supplier ownership, a lot or profile association, filename and `referenceUrl`. [Document services](../src/services/contaminants.ts) return those references, including through a public supplier profile. They do not implement the private storage and grants proposed here.
- [Public supplier pages](../src/app/suppliers/[slug]/page.tsx), supplier desks, operations lot pages and [compliance exports](../src/services/compliance-pack.ts) are disclosure surfaces to review before enabling any gated document.
- [Authorization helpers](../src/domain/authz.ts) allow OPS and ADMIN to bypass ordinary tenant checks. Gated documents must use a distinct ownership and grant policy with no inherited role bypass.
- [Audit service](../src/services/audit.ts) provides a hash-chained event mechanism. Gated access needs additional event semantics, supplier-scoped reads and concurrency verification before reuse.

These are code observations, not a production-data audit. No existing external URL becomes private merely by marking its database row gated. No Q5 or Q6 branch changes are imported into this specification.

## Roles and authority

| Actor | Permitted scope | Boundary |
| --- | --- | --- |
| Signed-out or unmapped person | Login or access-request guidance | No gated metadata, content, code redemption or access history |
| Verified supplier recipient | Redeem an invitation addressed to their active identity and organization; use its explicit document permissions | Verification and SUPPLIER membership do not grant general document access |
| Approved brand recipient | Same recipient flow, with current brand approval and active BUYER membership | BUYER membership alone is insufficient |
| Supplier access manager | Manage documents owned by their supplier organization, select recipients and document versions, issue or cancel invitations, narrow or revoke grants, inspect their supplier's access log | Requires explicit supplier-scoped management authority and current supplier verification; cannot manage another supplier |
| OPS or ADMIN reviewer | Record, suspend or revoke eligibility after reviewed evidence; inspect minimal operational security metadata | Cannot self-approve supplier control, issue invitations on a supplier's behalf or read file contents by platform role alone |

Eligibility is a separately recorded, reviewable decision: subject organization, type, status, reviewer, decision time, reason and evidence reference. Use pending, approved, suspended, expired and revoked states as applicable. Approved supplier eligibility means verified supplier status. Approval must not be inferred from an email domain, signup, public listing, TECRID badge or a supplied code. The approval evidence and decision process require Elon review before implementation.

Supplier management authority is a separate, auditable assignment to a named active member of the owning supplier organization. Its assignment and removal require reviewed supplier authorization. Membership loss or suspension prevents new management actions. It does not silently transfer control to another user.

Supplier managers also need login and a redeemed, supplier-authorized code-backed grant to view or download content, including their own files. Management permission is not a content-read bypass. A manager may explicitly issue a self-addressed owner grant, which is visibly audited. Platform reviewers with no eligible supplier or brand context cannot use that mechanism. No emergency content override is proposed.

## Supplier-controlled permissions

Default deny. A supplier selects a named recipient user within a named organization, exact document versions, permitted actions and explicit expiry. No organization-wide bearer code, automatic access for new members, wildcard document selection or onward delegation is allowed in the initial design.

The supplier can allow view, download, or both. View allows delivery for rendering and is not a copy-prevention guarantee. Download controls the application download action; content that a viewer has already received can still be saved or captured.

Conceptual records for a later design review, not migrations:

| Record | Required information |
| --- | --- |
| Eligibility decision | Organization, eligibility type, status, reviewer, reason, evidence reference, validity and revocation history |
| Supplier management assignment | Owning organization, named member, authorized scope, assigning authority, status and history |
| Private document version | Supplier owner, existing lot or profile association, opaque object key, immutable version identity, original filename, media type, checksum, quarantine and availability state |
| Access invitation | Supplier issuer, recipient user and organization, exact document versions and actions, code digest, code expiry, grant expiry, issue/redemption/cancellation state |
| Access grant | Invitation provenance, recipient and supplier bindings, explicit document-version permissions, validity, current policy revision and revocation history |
| Access event | Actor and organization context, owning supplier, document version when known, invitation/grant references, action, outcome, reason and server timestamp |

For every metadata, preview, content, download and document-log request, the server must establish the current authenticated user, active organization membership, relevant role and current recipient eligibility. Content additionally requires a successfully redeemed invitation, an active unexpired grant, an allowed action, exact supplier ownership and version membership, and an available non-quarantined document. The owning supplier's eligibility must remain current. Missing or ambiguous records deny access.

Supplier managers may inspect the management metadata and access log for their own organization without a content grant. Recipients receive only the metadata required for their currently authorized documents. No public listing or count reveals private document existence, filenames, notes, object keys, recipient identities or history.

Revocation or narrowing applies to subsequent requests as soon as the policy change commits, without depending on background expiry jobs or session refresh. Removing recipient membership, suspending eligibility or withdrawing a document blocks further access. Reinstating eligibility does not revive a revoked grant. Removing an issuer does not automatically revoke all previously valid supplier grants; supplier revocation and incident review remain explicit and audited. Any expansion, new recipient, new document version or extension requires a new invitation and redemption. Existing grants do not automatically cover replacements or future uploads.

## Authorization code lifecycle

**Issue.** An authenticated supplier access manager selects an existing eligible recipient, exact owned document versions, actions, code expiry and grant expiry. Both expiries are required, and the redemption window cannot extend beyond the grant's expiry. Recheck authority and ownership on the server at commit time. Generate an unpredictable secret using a cryptographically secure generator; store only a keyed digest and non-secret invitation identifier. Display the secret once to the issuer. Never store the raw code in application logs, analytics, audit payloads or a URL.

The design leaves code delivery to a supplier-controlled approved channel. No automated email, message sending or new communications integration is included. Possession is insufficient without the bound identity and organization. If a code is lost, cancel it and issue a replacement; do not recover the original secret.

**Redeem.** After login, accept the code in a protected request body. Apply server-side abuse controls and constant-time secret comparison. Recheck recipient identity, active membership, eligibility, issuer validity, ownership, document availability, current invitation state and both expiries. In a single atomic operation, consume the invitation, create its bound grant and append the audit event. Concurrent or repeated redemption cannot create additional grants. Failed validation creates no grant and returns a generic response that does not reveal whether another supplier's invitation exists.

**Use.** The redeemed grant is durable authorization provenance for its stated lifetime. The raw code is not retained in the browser and need not be re-entered for every file request. Login and current server-side grant checks remain mandatory for every request. If Elon requires a fresh code for each session instead, that is an explicit policy change before implementation.

**Expire or revoke.** Compare server time on every redemption and use, treating the expiry instant as expired. Issued codes can become redeemed, expired or cancelled; terminal invitations cannot be reused. Active grants can become expired or revoked. Cancelling an unredeemed invitation creates no grant; revoking a redeemed invitation must revoke its resulting grant. Supplier controls must clearly distinguish these actions. Reissuing cannot silently preserve an older usable code. Log transitions without recording secrets.

Code entropy, abuse-control budgets, redemption lifetime and maximum grant lifetime are named policy settings with values TODO for Elon review. Unconfigured required settings must fail closed; this spec invents no durations or numeric limits.

## Private storage and signed URL delivery

Store gated bytes in a private bucket or equivalent private object store, with public listing and anonymous reads disabled. Keep object keys opaque and outside public content fields. Database records store private keys and versions, not reusable external download URLs. Storage credentials and signing authority remain server-only and limited to the intended bucket and operations. Provider selection and provisioning are deferred to the authorized build, with no service created in this step.

Use signed URLs as internal, narrowly scoped storage capabilities. The browser calls an authenticated VLE file endpoint; the server checks the full policy, records the allowed access decision, obtains a signed URL for the exact immutable object version, then streams the object through the authenticated endpoint. Do not redirect the browser to the storage URL or expose it in HTML, JSON, headers, logs or error messages. This design avoids treating a copied storage URL as an alternative to login and grant checks.

The signed URL expiry must be bounded by the remaining grant and object validity and an approved short storage-signature lifetime. Missing configuration denies signing. Each preview, range or resumed request passes the same authorization boundary. Storage and response caching must not permit another user or a revoked user to retrieve a previously authorized response. Use private, no-store delivery and prevent framework, CDN, service-worker and shared cache reuse of protected metadata and bytes. No public derivative, thumbnail or search index is allowed.

Revocation prevents new authorized requests after its commit. It cannot recall bytes already received or guarantee cancellation of an in-flight stream. An authorization decision that committed before a revocation may already have started delivery; serialize policy mutations and access decisions so this ordering is testable. Present this limitation to suppliers. Provider-specific stream cancellation, object quarantine and emergency shutdown behavior require implementation validation, not an unsupported instant-recall promise.

For future uploads, verify supplier authority, use private quarantine, enforce approved file-type and size policy, inspect actual file content, and scan before availability. Failed or incomplete inspection keeps the file inaccessible. Treat original filenames and rendered content as untrusted. Separate upload authority from read authority. Never fetch an arbitrary supplier URL on the server as an implicit import.

The existing `referenceUrl` flow requires a separate, approved transition plan. Before any private data is enabled, exclude gated records from public supplier projections, lot views, compliance packs, metadata, structured data, sitemaps, exports and any indirect reference fields. Privileged exports cannot bypass the new policy. Existing public external copies cannot be made confidential by a UI change. Inventory and migration of real records require Elon authorization; no backfill, URL rewriting or real-document download occurs in this step.

## Access log visible to the supplier

Provide a protected supplier access-history view scoped by server-resolved ownership. Authorized supplier managers can filter by document, recipient, action, time and outcome. Show issue, redemption, expiry observation, cancellation, grant change/revocation, eligibility-related denial, document withdrawal, allowed view/download requests and failed delivery outcomes when observed. Show relevant management actions as well as content access. Recipients and other suppliers cannot browse this log.

Record the server timestamp, stable event identifier, supplier owner, actor user and organization when known, document version, invitation/grant identifiers, action, allow/deny outcome, reason category, policy revision and request correlation reference. Record only attributable denials in a supplier's view. Invalid codes and unknown document identifiers must not let an attacker inject another tenant's identity into that view; keep unattributable abuse in a restricted security log.

An allowed access decision means a request was authorized. A response-start or response-completion event means the server observed that delivery stage. None proves that a human opened, read or retained the document. Do not label code redemption or signed URL generation as a completed download.

Access decisions must be durably audit-recorded before releasing content. If authorization or audit persistence is unavailable, fail closed. Supplier-visible history must be append-only, with corrections as new events and no user-editable deletion. Verify hash-chain ordering and concurrent event insertion before extending the existing audit service. Do not include raw codes, signing secrets, signed URLs or document contents. Retention, identity display, network-address collection, lawful deletion handling and access-log export policy remain explicit review items; no retention period is invented.

## Threat notes and required responses

| Threat | Required response and residual boundary |
| --- | --- |
| Guessed document or tenant identifiers | Resolve actor and ownership server-side, scope all joins and filters, use generic denied responses; opacity alone is not authorization |
| Stolen or forwarded code | Bind it to the named user and organization, store a keyed digest, enforce expiry and atomic consumption, throttle attempts; code possession never replaces login |
| Replay and concurrent redemption | Transactional single consumption with one grant provenance; duplicate requests cannot create additional authority |
| Stale membership, eligibility or grant | Recheck current database policy on every request; explicit revocation and expiry take precedence over stale session claims |
| OPS or ADMIN privilege escalation | No inherited tenant bypass for gated data; approval and management authority are separate and audit-visible |
| Signed URL leakage | Keep storage URLs server-side, tightly scope signatures, redact secrets, avoid redirects and third-party previews; leaked storage capability remains usable until its own expiry unless the store invalidates it |
| Public projection or export leak | Exclude gated content and metadata from existing supplier, lot, compliance-pack, search and cached projections; test direct endpoints and serializers |
| Cross-site request forgery or script injection | Protect state-changing actions, validate origin and request shape, escape filenames and notes, use a safe rendering boundary and secure session controls |
| Malicious upload or remote reference | Private quarantine and inspection, no arbitrary server-side URL fetch, no executable inline content, explicit availability state |
| Download and revocation race | Serialize policy decisions, deny later requests, disclose that delivered bytes and started streams cannot be recalled |
| Log tampering, outage or metadata leakage | Append-only durable events, supplier-scoped projections, minimal identity data, concurrency checks and fail-closed delivery |
| Recipient redistribution or screenshots | Explicitly disclose that view permission delivers copyable bytes; this design does not promise digital-rights enforcement |
| Development identity bypass | Placeholder-only local testing; deployed private-data paths require real authenticated identities, with bypass configuration rejected before enablement |

## Acceptance criteria for a later authorized build

- Signed-out, unmapped, unverified and unapproved identities cannot enumerate gated records, redeem codes or obtain content. An eligible user without a redeemed grant is denied.
- Verified suppliers and approved brands can each redeem a correctly bound invitation and use only its selected document versions and actions. Owner content access also requires a code-backed grant.
- Wrong recipient, wrong organization, another supplier's object, unrelated profile or lot association, missing policy, suspended eligibility and revoked membership are denied server-side.
- Supplier managers can select who, which document versions, permitted actions and expiry; cancel invitations; revoke or narrow grants; and inspect only their supplier's access log. Access expansion requires a new redemption.
- Expired, cancelled, reused and concurrently redeemed codes cannot create unauthorized grants. Code expiry and grant expiry are independently tested at their boundaries.
- Revocation and expiry block subsequent metadata, preview, range and download requests using already-open sessions. Restored eligibility does not revive revoked grants; document replacement does not inherit access.
- The private bucket rejects anonymous access. Browsers never receive a storage-signed URL. Cache tests cover successive users, organization changes, sign-out and revocation.
- Gated metadata, file references and bytes do not appear in public supplier pages, lot projections, exports, rendered HTML, structured data, logs, search or static assets. OPS and ADMIN cannot bypass content policy through a compliance export.
- Audit failures deny release; delivery failures are recorded distinctly from allowed decisions. Supplier logs remain tenant-isolated and omit secrets, content and unrelated identities.
- Uploads remain quarantined until approved inspection succeeds. Malformed files, malicious names, remote URL import attempts and inaccessible storage fail closed.
- Placeholder fixtures exercise the policy without real supplier data or measured contaminant results. Existing qualification, evidence, listing and certification states do not advance as a side effect of access operations.

These are proposed acceptance cases, not tests run in this spec step. Before code is written, read the installed Next.js guides required by AGENTS.md and verify implementation APIs against the installed versions.

## Decisions for Elon before implementation

- Confirm the recipient eligibility evidence and review process, supplier management assignment authority, owner code-backed read flow, and named-user grant scope.
- Approve code and grant policy settings, abuse controls, signed URL lifetime, upload policy and the internal signed URL streaming approach, including revocation limitations.
- Approve log retention and identity visibility, operational incident handling and the treatment of previously public references before any gated-data enablement.
- Authorize the next build explicitly after SPEC PASS. Real supplier intake, storage provisioning, migration, production configuration and deployment remain separately gated.

Run deliverable: one spec-only draft PR into main, STATUS with PR URL and checks, then WAITING_ON: ELON SPEC PASS and STOP. No other queue item is started by this document.
