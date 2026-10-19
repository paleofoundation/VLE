# READY-7 validation

Created from main with earlier sprint prerequisites as separate commits.

- Lint, typecheck and production build pass. Vitest: 110 passed, three existing integration tests skipped.
- Real local matched-domain and proof-note claim forms enter CLAIM_PENDING without assigning ownership.
- Operations approval links the organization, preserves PUBLIC_DOCUMENTS status and merges unpublished onboarding work. Draft products, documents and certificates remain private until explicit member publication. Existing published profiles require manual consolidation rather than automatic replacement.
- Operations rejection resets the remaining unclaimed profile. Confirmation cannot be performed by a supplier.
- Public takedown form accepts requests without invoking account authentication; honeypot rejection and a persistent five-per-hour quota are exercised against local PostgreSQL. The sixth valid submission is rejected.
- Operations profile hides are authoritative. Supplier publish cannot override moderation_hidden. Hidden profiles render the not-found boundary without supplier data. Next.js may return HTTP 200 for a streamed not-found response; this is documented framework behavior, not a visible listing.
- Document removal removes outgoing links, including roster-linked files in the Kasandrinos static override. The document index retains the removal label.
- Claim search, claim form, takedown form, operations queue and updated profile links are checked at 1440px and 390px. Screenshots in `docs/screenshots/vle-ready-7-claim-takedown/`.

Takedown copy consistently names marcus@vle.exchange and the five-business-day commitment. Queue deadlines use weekdays; no country-specific holiday calendar is assumed. No email or external outreach is sent.

Migrations 0010 and 0011 are applied only to local disposable PostgreSQL and the approved isolated sprint preview schema.
