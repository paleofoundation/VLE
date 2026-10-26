# Lot proof exchange

Native stream follow-up: see [NATIVE-PROOF-STREAM.md](NATIVE-PROOF-STREAM.md). The provisional single-grant contract below is historical; native grant storage, payload withdrawal and stream watermarks supersede it. Receiver remains OFF.

Order: VLE-PROOF-EXCHANGE-1. PR only. No merge or deployment.

The Step 0 audit was posted to `~/ops/bridge/ELON_CHATGPT.md` under CHATGPT to ELON before application edits. This branch is stacked on VLE #63, which is stacked on the live-source sync #62. The application source comes from live Sites version 27, not the older Next.js/Clerk/Postgres implementation on GitHub main.

## Organization and lot identity

Existing authenticated team accounts own public proof organizations. Organization roles are additive and separate from account permissions. Kasandrinos has supplier, brand and private_label_manufacturer roles. Owners and administrators manage proof at `/proof`; viewers and unrelated accounts cannot mutate it. Account creation and verified-email membership continue to use the existing service. This change sends no invitations or messages.

Each lot has an originating organization and an exact supplier lot ID. New registrations require an ingredient code or product SKU. The six existing Kasandrinos lot IDs and supplier lot IDs are preserved. Their ingredient codes are unknown, so migration 0010 leaves those fields empty rather than inventing identifiers. The authorized supplier can complete them until production evidence binds the identity. Existing records can receive an exact signed lot link in the meantime. The receiver prefers signed ingredientCode and falls back to signed productSku. A code matching multiple lots is rejected unless another signed lot field disambiguates it. All supplied identity fields must agree. No matching by brand display name or category occurs.

A supplier asserts a release to a named registered brand. That brand's owner or administrator confirms it from its own active account. Until then, the release is pending and carries no proof. Either participant can withdraw it. All mutations are audited. Confirmed releases inherit lot TECRID status only when the current delivery grant explicitly includes that brand. A release never extends a certification's product or lot scope.

## Public proof wall

`/organizations/{slug}`, the existing Kasandrinos storefront, and every registered lot page show a proof wall. The homepage feature below the unchanged hero links directly to Kasandrinos's wall and derives counts from the public projection. Active production TECRIDs are counted separately from certification records. Sandbox TEST cards remain in their existing, clearly labeled section and never enter production proof counts.

TECRIDs show status, program, lab, issued date, retest due, freshness and their exact public verification URL. Freshness is current beyond 30 days, due within 30 days and lapsed after the due date. Missing due dates are shown as not stated. No retest date is inferred from an issuance date. Revoked and superseded records remain visible within an active public-status grant and do not count as active. Expired or revoked grants remove the public projection on the next request. Private responses are not cached.

Every public wall is status only. The receiver stores an explicit metadata allowlist and discards result snapshots, even if a delivery has full_record access. Result values and source PDFs remain with the existing TECRID and VLE report authorization services. Marketplace receipt does not grant public permission: the delivery must explicitly allow publicStatus. This implementation does not display controlled result values, including to users with broader grants.

The migration seeds only the existing five Kasandrinos certification documents. Their documented scopes, historical expiry and source notes are retained. The spices record is not applied to olive-oil lots. There are no seeded production TECRIDs, current certification assertions or private-label releases.

## Marketplace delivery contract: provisional mock

Endpoint: `POST /api/integrations/tecrid/deliveries`.

TECRID #18 documents a metadata notification body containing eventId, event, sku and url. It does not define the step 4 marketplace evidence snapshot. This endpoint therefore uses a separate provisional `vle-evidence/1` contract and returns 503 unless `VLE_TECRID_RECEIVER_ENABLED=true`. An alignment ASK is posted in the bridge. Do not enable the receiver before the TECRID step 4 payload and the security attestations below are agreed and reviewed.

Use the same HMAC convention as TECRID #18: `X-TECRID-Signature: t=<unix-seconds>,v1=<hex-HMAC-SHA256>`, calculated over timestamp, a dot, and the exact UTF-8 body bytes. `X-TECRID-Event-Id` must match body eventId. Verification uses Web Crypto's HMAC verifier, a five-minute clock tolerance, and a 64 KiB streamed body limit. Configure `VLE_TECRID_WEBHOOK_SECRET` with at least 32 characters and `VLE_TECRID_RECIPIENT_ID` with VLE's actual TECRID organization ID. No secret values are committed.

Required fields:

| Object | Fields |
| --- | --- |
| Envelope | schemaVersion=`vle-evidence/1`, environment=`production`, deliveryId, eventId, sequence, event, occurredAt |
| recipient | type=`marketplace`, organizationId matching configured VLE recipient |
| credential | tecrid, version, status, program, issuingLab, issuedAt, retestDue or null, verificationUrl, fingerprint |
| credential.verification | signatureVerified=true, fingerprintVerified=true, currentVersion=true |
| credential.identity | originatingSupplierId and at least one of lotId, supplierLotId, ingredientCode or productSku |
| grant | id, recipientOrganizationId, status, accessLevel, publicStatus, expiresAt or null, brandOrganizationIds |

`verification` is an attestation from the trusted TECRID sender that it checked the laboratory signature, fingerprint and current version. VLE authenticates that attestation with the dedicated HMAC secret; it does not independently verify the laboratory signature. Identity fields must come from the signed credential, not caller-supplied routing hints. The TECRID runner must explicitly confirm these semantics. Production/sandbox separation is mandatory. A notification-only step 1 payload is rejected.

Supported events are credential.issued, credential.corrected, credential.revoked and grant.revoked. Sequence is monotonically increasing for the TECRID's marketplace grant stream. Credential version cannot regress; the fingerprint cannot change within a version. A TECRID cannot move between lots or grant identities. The public verification URL must be exactly on `https://tecrid.com/records/{tecrid}`. The sender must keep corrections, supersessions, revocations and grant changes flowing through this stream. If delivery stops, VLE cannot infer an unreceived revocation. Grant expiry still applies at read time. A replacement grant identity requires contract alignment rather than silent transfer of old proof.

Acceptance atomically writes a unique delivery/event receipt and the ordered current metadata in a D1 batch. An identical retry returns 200 and its original received-at time. A new receipt returns 202. Reusing an ID with different content returns 409. Unmatched or ambiguous lots return 422 without attaching evidence or consuming the ID, allowing an authorized mapping correction before retry. A late event is receipted without overwriting newer state. HTTP success acknowledges durable receipt, not a human view. Originating suppliers can see their own delivery log at `/proof`; anonymous and unrelated accounts cannot.

## Certification registry contract: alignment required

Supplier assertions cannot set verification. Paleo Foundation and ICS lookups use operator-configured `VLE_PALEO_REGISTRY_URL` and `VLE_ICS_REGISTRY_URL` on the exact HTTPS origins `paleofoundation.com` and `contaminantstandards.com`. Other origins and redirects fail closed. Each request queries an exact certificateId and organization slug. The response must be JSON with:

```json
{
  "record": {
    "id": "SYNTHETIC-CERTIFICATE-ID",
    "organizationSlug": "synthetic-organization",
    "program": "SYNTHETIC program",
    "scope": "SYNTHETIC scope",
    "lotId": null,
    "status": "suspended",
    "expiresAt": null,
    "environment": "production"
  }
}
```

This is a mock schema, not a claim that either registry exposes this endpoint. Exact identity, program, scope and lot must match. Supported statuses are active, suspended, expired and revoked. A past printed expiry stays expired even if an unmatched current registry listing exists. Demo records are rejected. A missing or failing registry shows self-reported, not verified; registry verification unavailable. Other issuers show self-reported, not verified. Expired and suspended records are retained.

The inspected ICS name-search endpoint is scaffold data and lacks a certificate and scope status contract. The [Paleo Foundation Kasandrinos page](https://paleofoundation.com/brands/kasandrinos) lists products, but does not supply a machine-readable live term for the archived 2021-2024 letter. The bridge ASK requests production status endpoints. Live registry activation remains a review dependency, not a simulated success.

## Migration and verification

0010 adds eight tables and seeds the source-backed Kasandrinos identity, roles, lots and existing certification metadata. It reuses the same existing Kasandrinos team initialization and never overwrites team owners or permissions. The missing baseline 0009 schema snapshot is included so future Drizzle generation does not recreate its existing evidence_notification_reads table. `drizzle-kit generate` reports no changes after 0010.

All migration execution for this order is local. Test databases are isolated Miniflare instances. Synthetic credentials, private labels and signing secrets are used only in tests and never seeded into the application preview. `tests/proof-exchange.mjs` covers account ownership, release confirmation, provenance, signature failures, replay, concurrency, ambiguity, SKU fallback, version ordering, grants, revocation, expiry, registry mismatch and XSS. `tests/proof-worker.mjs` exercises the actual built Cloudflare Worker routes and bootstrap, with zero outbound calls. Existing VLE suites guard report grants, source integrity, teams, storefront, notifications, sourcing and the hero. Browser evidence is saved in `docs/verification/proof-exchange-1/`.

No buyer search, retailer requirements or events feature is added. The buyer-search design note belongs in the PR description only.
