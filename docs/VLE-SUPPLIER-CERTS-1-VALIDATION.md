# Supplier certifications validation

Branch created from main with earlier sprint prerequisites as separate commits.

- Lint, typecheck and production build pass.
- Vitest covers expiry dates, issuing-body labels, missing-certification suggestions, URL validation and role restrictions.
- Real local browser saves a supplier certificate, preserves its stated expiry and leaves confirmation empty.
- Operations browser confirmation records the issuing body and date; flagging clears confirmation and records the review state.
- Kasandrinos seed adds only the five ordered certifications from the existing transparency source links. No certificate numbers or expiry dates are invented. Paleo and Keto carry the explicitly authorized Paleo Foundation confirmation dated 19 October 2026.
- Signup step, dashboard, admin pages and Kasandrinos public profile return HTTP 200 at 1440px and 390px, without horizontal overflow. Screenshots in `docs/screenshots/vle-supplier-certs-1/`.
- New supplier onboarding offers certifications as an optional next step. Suppliers can return to the same checklist later.

Apply migration 0007 and run `npm run db:seed:certifications` after the roster import. The seed is idempotent and never overwrites existing records. No certification creates lot qualification or a VLE verified badge.
