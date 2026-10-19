# READY-2 validation

Created from main at 7f118b2, carrying READY-1 prerequisite commit d2a97c8. This order's own commit adds the directory and generic profile.

- Lint, typecheck, production build pass.
- Tests: 85 passed, three existing integration tests skipped.
- Browser and real disposable local PostgreSQL: 16 cards; Rice filter shows two suppliers; missing searches show the exact empty state.
- Partial dates, Labdoor attribution and no-image rule verified. Internal provenance notes are absent.
- Hidden supplier disappears from directory and its profile returns HTTP 404.
- Directory, generic Transparent Labs profile, and Kasandrinos override return HTTP 200 at 1440px and 390px without horizontal overflow.
- Desktop/mobile screenshots committed under `docs/screenshots/vle-ready-2-supplier-directory/`.
- Kasandrinos content remains an override. It now honors the database visibility check. The sitemap contains only visible profiles.

Request actions remain explicitly unavailable until READY-6. Claims and takedowns are linked for READY-7. Documents are never gated.
