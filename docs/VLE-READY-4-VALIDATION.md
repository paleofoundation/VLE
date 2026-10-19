# READY-4 validation

Created from main with unmerged READY-1 through READY-3 prerequisite commits.

- Clerk signup and signin widgets render real forms at 1440px and 390px, HTTP 200, no horizontal overflow.
- Onboarding and updated Join, For suppliers and For buyers pages checked at both sizes. Screenshots committed under `docs/screenshots/vle-ready-4-sign-up-onboarding/`.
- Real browser form submission with a disposable local identity creates one supplier organization, one SUPPLIER membership, company role, hidden member draft and one audit event. Repeat onboarding redirects without adding a second role.
- Unit/service tests cover verified identity requirement, restricted roles, transaction writes, idempotency, HTTPS URLs, safe redirects and exact-domain matching.
- New signup does not grant operations privileges or publish a profile. Suppliers publish through READY-5.
- Existing development Clerk credentials were used to render auth widgets. No real Clerk account was created during testing. Authentication handoff through a real email inbox remains a manual preview check.

The migration adds only nullable company_role to memberships. Existing account mappings are retained. Users without membership now go to onboarding.
