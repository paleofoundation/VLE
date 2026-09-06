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

## Phase A.5 — readiness surface implemented

- production-feeling public promise, network framing, passed-lot cards, and lot qualification detail
- intentional empty and sparse states that explain the publication gate without weakening it
- managed cocoa-pilot operations board with status, next action, and named blockers
- clearer six-step walkthrough for the seeded nominated lot
- buyer-requirement intake polished while retaining the Phase A record-only behavior
- cohesive responsive visual system, focus treatment, semantic headings, and claim-boundary copy
- supplier visual walkthrough from lot nomination through gated commercial intent, with a printable one-page treatment
- thin buyer walkthrough from frozen-profile requirement through eligibility-bound reservation intent
- no new domain records, catalog depth, or commercial workflows

## Phase B — implemented

- cocoa-only `RequirementMatch` creation against currently eligible public `LISTED` lots on the requirement's exact frozen profile version
- supplier quotes with explicit expiry and allow-listed `DRAFT → SENT → ACCEPTED` / expiry / withdrawal transitions
- tenant-bound buyer and supplier parties on every quote
- reservation intents with explicit expiry and allow-listed active / cancelled / expired / invalidated states
- database-triggered match and reservation invalidation whenever the bound listing unlists
- expiry reconciliation before commercial reads and actions
- managed commercial ops board plus thin buyer and supplier desks
- immutable audit events for commercial creation, transitions, expiry, and service-driven listing invalidation
- seed path from buyer requirement through active reservation intent
- tests for match eligibility, tenant visibility, expiry, prohibited transitions, and unlist propagation

`RequirementMatch`, `SupplierQuote`, and `ReservationIntent` remain distinct from `BuyerRequirement`, `MarketplaceListing`, and the future `Order`. A reservation intent records commercial intent only; it cannot keep an ineligible listing alive.

## Avocado fruit pilot lane — readiness implemented

- separate `AVOCADO_FRUIT` product type; no avocado oil product or marketplace
- frozen Avocado Profile v1.0 with conspicuous EXAMPLE metals/Cd limits
- one nominated avocado fruit demo lot, with no fabricated passing decision or public listing
- separate public and operations readiness lanes using the existing Phase A truth spine
- product-scoped profile selection in operations and cocoa buyer intake
- Phase B matching remains explicitly cocoa-only
- no category tree, faceting, supplier storefront, or other catalog depth

## Phase C — deferred

Order formation, binding commercial terms, payment adapter selection, and freight handoff. No financing or insurance.

## Phase D — deferred

Production TECRID contract/webhooks, broader operational automation, any ingredient types beyond the approved cocoa powder and avocado fruit lanes, and an explicit adapter to HMTc for finished-product certification.
