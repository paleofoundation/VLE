# VLE — Verified Lot Exchange

After each task, read/write `ops/bridge/ELON_CODEX.md` (Elon Mission Lead pen-pal). Obey the newest ELON → CODEX ORDER.

VLE is where a buyer goes when an ingredient lot must pass a defined compliance profile.

> Do not buy the ingredient and discover whether it passes afterward. Buy the lot that already passed.

Phase A is a cocoa-powder pilot. It implements the auditable path from a named physical lot through managed sampling, TECRID-linked evidence, deterministic qualification, gated publication, and automatic unlisting. It is deliberately not a broad ingredient marketplace.

Phase A.5 adds a production-ready **readiness surface** for the public shelf, lot detail, managed operations board, and buyer-requirement intake. It adds no catalog depth or commercial workflow: rich taxonomy, supplier storefronts, matching, quotes, reservations, payments, freight, messaging, and multi-ingredient support remain deferred.

## Stack

- Next.js 16 App Router + TypeScript
- Clerk authentication, provisioned through Vercel Marketplace
- Neon Postgres + Drizzle, provisioned through Vercel Marketplace
- Vitest for domain, authorization, tenancy, and state-machine tests
- Vercel-ready on the default Node.js / Fluid Compute runtime

The Vercel CLI used during bootstrap was 59.11.2; 59.11.7 or later is recommended: `npm i -g vercel@latest`.

## Run locally

Requirements: Node.js 24 recommended (22.12+ works for the current dependencies), npm, and a Postgres connection.

```bash
npm install
cp .env.example .env.local
npm run db:setup
npm run dev
```

This repository is already linked to the Vercel `vle` project. For the provisioned development database and Clerk keys, use `vercel env pull .env.local --yes` instead of filling them manually.

The seed creates:

- VLE operations, demo supplier, and demo buyer organizations
- buyer, supplier, ops, and admin memberships
- one cocoa product type
- frozen **Cocoa Profile v1.0** with conspicuous **EXAMPLE LIMITS ONLY** notes
- one QUALIFIED lot with a public listing
- one NOT_QUALIFIED lot with no listing (private to operations)
- one NOMINATED lot for walking through the managed demo

For local workflow testing without creating Clerk users, set `VLE_DEV_ACTOR=ops@vle.exchange`. This bypass is ignored in production. Then open `/ops`, choose `COCOA-DEMO-NOMINATED`, and execute:

1. verify inventory facts;
2. create and advance the sampling order through completion;
3. issue and verify local mock TECRID evidence;
4. run deterministic qualification;
5. publish the passed lot;
6. revoke evidence or hold the lot and observe automatic unlisting.

Use a real Clerk identity in deployed environments. Map its Clerk user ID to a row in `users`, then grant organization-scoped rows in `memberships`; every server action repeats authorization checks.

## Commands

```bash
npm run check        # lint + TypeScript + unit tests
npm run build        # production build
npm run db:generate  # generate migrations after schema changes
npm run db:migrate   # migrate using .env.local
npm run db:seed      # idempotent demo seed
```

## Boundaries

- [Product invariants](docs/VLE_PRODUCT_INVARIANTS.md)
- [TECRID adapter contract](docs/TECRID_ADAPTER.md)
- [Execution plan and Phase B handoff](docs/VLE_EXEC_PLAN.md)

VLE is separate from `tecrid.com`. The primary VLE domain is `vle.exchange`. HMI informs, TECRID authenticates evidence, VLE sources passed lots, and HMTc certifies finished products.
