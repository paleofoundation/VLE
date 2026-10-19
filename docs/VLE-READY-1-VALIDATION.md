# READY-1 validation

Branch created from main at 7f118b2. No deployed database was changed.

- Lint, typecheck and production build pass.
- Vitest: 83 passed, three existing database integration tests skipped.
- All six migrations applied to a disposable local PostgreSQL instance.
- Roster imported twice: 16 profiles and 22 documents after both imports.
- `/ops/listings-preview`: HTTP 200 at 1440px and 390px, no horizontal overflow.
- Screenshots in `docs/screenshots/vle-ready-1-public-listings/` show the authenticated local operations preview using a local-only actor fixture.
- The component preview checks absence of a badge without current evidence. No verification or lot progress is inferred from public documents.

Deploy prerequisite: run the new migration and `npm run db:seed:public` against the intended database after review. The seed never creates memberships or overwrites claimed profiles. No runtime fallback data is used.

The optional local PostgreSQL websocket transport requires `VLE_LOCAL_DB_PROXY=1`, a loopback database URL and non-production mode. The existing development actor bypass also requires loopback at the proxy. Neither bypass runs in production.
