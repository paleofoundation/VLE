# VLE execution plan

## Phase A — implemented

- Clerk authentication and VLE-owned organization tenancy
- server-side buyer / supplier / ops / admin authorization
- distinct physical-lot identity and inventory verification fields
- compliance profiles with immutable frozen versions
- ops-driven sampling order and custody state machine
- TECRID adapter boundary plus local/dev mock issuer
- deterministic three-outcome qualification and append-only decisions
- redundant service/database/public-read publication gates
- listing unpublish on evidence revocation, expiry reconciliation, and lot hold/invalidation
- append-only, hash-chained audit history for compliance-critical events
- cocoa demo seed with public passing, private failing, and fresh nominated paths
- unit, tenancy/authz, state-machine/prohibited-transition, and automatic-unlist policy tests

## Phase B — next prompt

Build only the buyer-to-supplier commercial intent layer on top of Phase A:

> Expand `BuyerRequirement` into Find-me-a-passing-lot matching for cocoa only. Match exclusively against currently eligible public listings and a frozen profile version. Add supplier quote and buyer reservation-intent records, each with explicit expiry and state machines. Do not add payments, freight booking, chat, warranties, ratings, or Orders yet. Preserve all Phase A entity boundaries and automatic unlisting behavior; a reservation intent must become invalid if its listing unlists. Add tests for tenant visibility, expired quotes, prohibited transitions, and listing-invalidation propagation.

Expected Phase B records: `RequirementMatch`, `SupplierQuote`, and `ReservationIntent`. They remain distinct from `MarketplaceListing` and the future `Order`.

## Phase C — deferred

Order formation, accepted commercial terms, payment adapter selection, and freight handoff. No financing or insurance.

## Phase D — deferred

Production TECRID contract/webhooks, broader operational automation, additional ingredient types only after the cocoa pilot proves the workflow, and an explicit adapter to HMTc for finished-product certification.
