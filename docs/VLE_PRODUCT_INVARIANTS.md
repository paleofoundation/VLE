# VLE product invariants

These rules are product and data-model constraints, not marketing preferences.

## Entities never collapse

`Product`, `PhysicalLot`, `Sample`, `TECRID`, `ComplianceProfile`, immutable `ComplianceProfileVersion`, immutable `QualificationDecision`, `MarketplaceListing`, `BuyerRequirement`, `RequirementMatch`, `SupplierQuote`, `ReservationIntent`, `Order`, and an HMTc certificate are separate records with separate lifecycles.

Phase B extends the Phase A truth spine through `ReservationIntent`. `Order` and HMTc certificates are deferred; they must remain separate when introduced.

## Commercial intent boundary

- A `RequirementMatch` may be created only for cocoa powder, the requirement's exact frozen profile version, and a currently eligible public `LISTED` lot with enough recorded quantity.
- A `SupplierQuote` is tenant-bound, expiring, and governed by an allow-listed state machine. An expired or ineligible quote cannot be accepted.
- A `ReservationIntent` requires an accepted quote and a currently eligible listing. It is not an inventory allocation, contract, or Order.
- When a listing unlists, active matches and reservation intents are invalidated by the database. Commercial intent can never override the publication gate.

## Evidence boundary

TECRID authenticates an evidence envelope and its sample binding. It does not prove that:

- the sampling event happened as represented;
- the sample represents the physical lot;
- the supplier owns the lot;
- inventory quantity or location is current;
- the supplier has authority to sell;
- a future finished product will be safe or compliant.

A supplier PDF is not sufficient evidence. Production TECRID endpoints are not guessed. Local development uses an explicitly named mock issuer.

Revoking a TECRID evidence record immediately unlists every listing that depends on it. It does not by itself revoke the physical lot: an otherwise non-terminal lot returns to `EVIDENCE_RECEIVED`, allowing new authenticated evidence and a new immutable qualification decision. Explicit physical-lot revocation remains a separate terminal action.

## Publication gate

A listing may be `LISTED` only when all are true:

1. physical lot identity is confirmed;
2. quantity, location, and authority to sell are verified;
3. a sample record is bound to that physical lot through a sampling order;
4. TECRID-linked evidence is authenticated, current, unrevoked, and bound to that sample;
5. a deterministic, immutable decision is `QUALIFIED` against a frozen profile version;
6. the lot is not held, revoked, transformed, or depleted.

The gate exists both in the service layer and as a Postgres trigger. Public reads independently re-check eligibility. Revocation or hold triggers immediate database-level unlisting; expiration reconciliation runs before public reads.

`NOT_QUALIFIED` and `INSUFFICIENT_EVIDENCE` are operational states and never public listings.

## Immutability and audit

- A profile version may move from `DRAFT` to `FROZEN`; once frozen it cannot be updated or deleted. A change requires a new version.
- A qualification decision is append-only. New evidence or a new profile produces a new decision.
- Audit events are append-only and hash-chain to the previous event. Compliance-critical service operations append events; Postgres blocks audit updates and deletes.
- Sampling and physical-lot transitions are allow-listed. Terminal lot states cannot be reopened.

## Claim language

Allowed: **“Passed Cocoa Profile v1.0.”** or **“Passed Avocado Profile v1.0.”** only when the identified lot has cleared the full publication gate against that frozen version.

Disallowed: safe, clean, zero, toxin-free, guaranteed, or any implication that the finished product is certified. HMTc—not VLE—owns finished-product certification.

## Scope exclusions

No blockchain, owned laboratory, warehouse, inventory, insurance, financing, AI-as-assay, rich taxonomy, payments, freight booking, messaging, ratings, warranties, Orders, avocado oil marketplace, or Knowde-grade storefronts. Phase B matching remains cocoa-only until explicitly expanded.
