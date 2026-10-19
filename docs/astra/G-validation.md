# ASTRA G

Based on main 7f118b2, carrying Astra A through F in order. Reuses the ownership, quota, takedown and audit logic from superseded #54 and certification services from #46 via D. The READY branches are not continued or merged.

New claim/takedown forms and admin review queue use the Astra design system. Clerk primary email verification is checked explicitly. Company-domain matching uses exact domains; other claims require proof and an operations decision. An approval preserves the public-document source until supplier publication, and preserves unpublished work. Core lot, sample, TECRID, qualification and reservation table definitions are unchanged.

Moderation is authoritative across Home, search, profiles, product documents, source lots and comparison. The monthly protected endpoint checks original links with pinned public DNS and revalidates redirects. Only 404/410 marks a file unavailable; timeouts, blocks and rate limits do not. Removed documents retain a visible record and no outgoing link. Automatic checks never undo an operations removal.

Certification review and manual suggestions are available in the admin queue. Suppliers can see their manual suggestions alongside the category rules.

Validation: lint, generated-route typecheck, production webpack build pass. 114 tests pass; 3 existing database integration tests are skipped. Live database migrations have not been applied. The new claim migration and monthly schedule are reviewable source changes only. CRON_SECRET must be configured in the intended environment.

Local server startup fails with `listen EPERM 127.0.0.1:3217`. Browser screenshots and step counts are reserved for ASTRA ALL as instructed. No local screenshot or Lighthouse score is claimed. No messages are sent. No merge or production deployment is performed.
