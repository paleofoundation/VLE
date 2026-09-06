# TECRID adapter

VLE depends on a typed, fail-closed adapter boundary. This document is a **candidate production contract and sandbox acceptance checklist**, not a claim that a TECRID production connection, endpoint, credential, certificate, or live evidence record exists.

## Responsibility split

TECRID authenticates a lab-evidence envelope, including the sample identifier declared in that envelope. VLE checks that identifier against its separate `Sample` record and separately owns the relationships among organization, `PhysicalLot`, inventory facts, `SamplingOrder`, `Sample`, frozen `ComplianceProfileVersion`, immutable `QualificationDecision`, `MarketplaceListing`, and audit history. Neither step proves how sampling occurred.

TECRID does not establish how the physical sample was collected, who owns inventory, how much inventory exists, where it is, whether the supplier may sell it, or whether a finished product is safe. A supplier PDF or COA alone is not TECRID-authenticated evidence.

## Candidate typed contract — requires TECRID sign-off

The source of truth is [`src/adapters/tecrid/types.ts`](../src/adapters/tecrid/types.ts). Its production-facing request binds the lookup to VLE's existing `Sample` before any evidence can enter VLE:

```ts
type TecridVerificationRequest = {
  tecridId: string;
  expectedSampleCode: string;
};

type TecridEvidenceEnvelope = {
  contractVersion: string;
  tecridId: string;
  sampleCode: string;
  issuer: string;
  status: "CURRENT";
  issuedAt: string;
  expiresAt: string;
  results: Array<{
    analyte: "lead" | "cadmium" | "arsenic" | "mercury";
    valuePpm: number;
    unit: "ppm";
  }>;
  payloadHash: string;
  authentication: {
    status: "VERIFIED";
    method: string;
    keyId: string | null;
    verifiedAt: string;
  };
};
```

The same boundary defines an authenticated current/revoked status response and an `EVIDENCE_REVOKED` notice shape. The notice is a contract type only: this PR does not expose a webhook or claim that TECRID sends one.

Open contract questions that TECRID must answer in writing:

- authoritative evidence and status URLs, request methods, version negotiation, and stable identifiers;
- client authentication, server authentication, response signing, canonical payload bytes, digest algorithm, and key rotation;
- whether `sampleCode` is TECRID-native or customer-supplied, and how TECRID proves that binding;
- timestamp format, clock-skew tolerance, evidence lifetime, result precision, units, detection-limit notation, amendments, and supersession;
- revocation delivery (signed webhook, authenticated polling, or both), retry window, ordering, replay protection, and idempotency key;
- sandbox issuer identity, sandbox keys, rate limits, timeout budgets, support/escalation contacts, and production cutover.

## Runtime boundary

`HttpTecridAdapter` is a contract stub. The caller must supply URL builders and an authentication callback through `TecridHttpContract`; VLE provides no default host, path, bearer token assumption, or production credential. External JSON is strictly validated at runtime. The adapter fails closed for malformed data, identifier mismatch, sample mismatch, non-current evidence, expired evidence, inconsistent revocation state, or non-success transport responses.

The production transport implementation must authenticate TECRID and verify any response signature before it reports `authentication.status: "VERIFIED"`. That receipt is structured metadata, not self-authenticating proof. The `payloadHash` algorithm and canonicalization remain contract questions; VLE must not infer them.

`getTecridAdapter()` deliberately refuses production use. A production implementation must not be added to the runtime factory until every launch-blocking checklist item below passes against a TECRID-provided sandbox.

## Revocation and re-evidence lifecycle

1. VLE periodically checks evidence status or consumes an authenticated, replay-protected revocation notice—the signed contract decides which.
2. A `REVOKED` status invokes VLE's existing evidence-revocation service. Existing publication gates immediately fail, active listings unlist, and linked active reservation intents invalidate.
3. Evidence revocation does **not** silently mutate the `PhysicalLot` into terminal `REVOKED`. An otherwise non-terminal lot returns to `EVIDENCE_RECEIVED`.
4. Re-evidence is a new authenticated envelope bound to the VLE sample (or a new sample if required by the signed contract). VLE stores a new TECRID evidence record and produces a new immutable qualification decision against the frozen profile.
5. A new listing may be created only if the full publication gate passes again. Prior evidence, decisions, listings, and audit events remain history.

No cached envelope, downloaded compliance pack, prior decision, quote, or reservation intent can keep revoked or expired evidence eligible.

## Sandbox acceptance checklist — definition of “connected”

“Connected” means all launch-blocking items below have objective evidence from a TECRID-provided sandbox. A successful HTTP 200 alone is not connected.

### Contract and identity

- [ ] TECRID has approved the versioned request, evidence, status, error, and revocation schemas.
- [ ] Sandbox and production hosts are supplied by TECRID; neither is guessed from `tecrid.com`.
- [ ] VLE authenticates to TECRID with least-privilege sandbox credentials stored outside source control.
- [ ] VLE verifies the TECRID service identity and evidence authenticity; key identifiers and rotation are exercised.
- [ ] Issuer allow-list, contract-version policy, clock skew, timeouts, retries, rate limits, and escalation contacts are recorded.

### Evidence and sample binding

- [ ] A TECRID-issued sandbox envelope for a known VLE `Sample` passes strict runtime validation.
- [ ] Wrong `tecridId`, wrong `sampleCode`, unknown issuer, invalid authentication, malformed JSON, unsupported analyte/unit, negative value, and expired evidence each fail closed.
- [ ] Payload canonicalization and digest verification use TECRID's documented algorithm and test vectors.
- [ ] Result precision, detection limits, amended reports, and superseded evidence behave exactly as the signed contract specifies.
- [ ] No sandbox response is copied into seed data or represented publicly as a live certification.

### Revocation, replay, and recovery

- [ ] Status polling and/or signed webhook delivery is tested with a TECRID-issued sandbox revocation.
- [ ] Duplicate and out-of-order notices are idempotent; forged, stale, or replayed notices fail closed.
- [ ] Revocation automatically unlists the listing and invalidates its active `RequirementMatch` and `ReservationIntent`.
- [ ] A transport outage or unverifiable status cannot be interpreted as current evidence.
- [ ] Replacement evidence creates a new TECRID record and immutable decision; the revoked record is never overwritten.
- [ ] Recovery/replay after downtime and reconciliation against TECRID's authoritative status are demonstrated and audit-recorded.

### Go/no-go evidence

- [ ] Contract tests pass against the TECRID sandbox in CI without production secrets.
- [ ] Ops has a dated test record with sandbox TECRID IDs, VLE sample IDs, expected results, negative cases, and revocation/re-evidence outcomes.
- [ ] TECRID and VLE owners sign off the contract version, runbook, key rotation, incident path, and production cutover/rollback plan.
- [ ] Production credentials and endpoints are configured only after sign-off; the local mock remains disabled in production.

Until every item is checked, status is **contract stub—not connected**.

## Local development

`MockTecridIssuer` is enabled only outside production. It emits deterministic-shaped envelopes labeled `VLE_LOCAL_MOCK_ISSUER`, uses `LOCAL_MOCK_ONLY` authentication metadata, and never calls TECRID or `tecrid.com`. Its values are demo fixtures, not lab results or live certifications.
