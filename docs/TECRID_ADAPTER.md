# TECRID adapter

VLE depends on an adapter boundary and does not assume a real TECRID production endpoint until TECRID provides a contract.

## Responsibility split

TECRID authenticates evidence. VLE owns the relationships among organization, physical lot, sampling order, sample, inventory facts, frozen profile version, qualification decision, listing, and audit history.

## Assumed contract (requires TECRID confirmation)

Given a TECRID identifier, the adapter returns an authenticated envelope:

```ts
type TecridEvidenceEnvelope = {
  tecridId: string;
  sampleCode: string;
  issuer: string;
  issuedAt: string;
  expiresAt: string;
  results: Array<{
    analyte: "lead" | "cadmium" | "arsenic" | "mercury";
    valuePpm: number;
    unit: "ppm";
  }>;
  payloadHash: string;
  verifiedAt: string;
};
```

VLE rejects an envelope when `sampleCode` does not match the VLE sample. The adapter must fail closed for a missing, unverifiable, malformed, or revoked TECRID.

## Revocation expectation

The future production contract must define either a signed webhook or a polling endpoint for revocation and status refresh, with replay protection and idempotency. Phase A exposes the internal revocation operation and automatically unlists every active listing backed by the revoked evidence.

## Local development

`MockTecridIssuer` is enabled only outside production. It creates deterministic-shaped evidence envelopes, labels the issuer `VLE_LOCAL_MOCK_ISSUER`, and never calls `tecrid.com`.

If both `TECRID_BASE_URL` and `TECRID_API_TOKEN` are supplied, `HttpTecridAdapter` calls `{baseUrl}/evidence/{tecridId}`. This path is a documented interface assumption, not a claimed TECRID production route. There is intentionally no default URL.

## Production checklist

- Replace the assumed HTTP shape only after a signed-off TECRID contract.
- Verify response signatures or mutually authenticated transport.
- Define issuer/key rotation, timeout, retry, idempotency, and revocation semantics.
- Store the authenticated payload hash; avoid treating an uploaded PDF as verification.
- Add contract tests against a TECRID-provided sandbox.
