# VLE-REBUILD-ULTRA-1: Round 1

Base: main, 7f118b2b5a0352d7cc2d9ddcd39ea0adc51ca8b5. Branch: codex/vle-rebuild. Draft only. No production deployment or merge. PRs 42–58 are reference only.

New tokens and primitives, navigation, Home, directory with URL-path facets, and 16 supplier profiles. The original public UI was removed from a clean main checkout. Schema, API and auth code are retained. Remaining pages and flows are intentionally not implemented until the Round 1 design gate passes.

Sources: supplied 2026-10-19 CSV; Kasandrinos content from merged PR 41; original FAQ copied byte-for-byte (8 groups, 37 questions). Numbers appear only where the roster includes an exact observation. Missing units, methods and limits are not inferred. No supplier prices or memberships are invented.

Public rendering uses committed JSON only. No build-time database calls or Neon prebuild scripts. Local font asset eliminates build-time Google Fonts requests.

Local validation: lint and typecheck pass; 79 tests pass, 3 existing database integration tests skipped. Production build and preview status recorded in the next update.

Environment limits: original .git is read-only, so a clean isolated checkout is used. Direct network access and local listening ports are blocked. GitHub connector works; Vercel connector lacks team authorization. Preview must come from the existing Git integration. Task-management tools are unavailable, so VLE-SCRATCH-1 status could not be confirmed.

Design gate: pending browser screenshots and comparison. No WIN scores assigned without inspection.

After gate: product/lot pages; account and onboarding; pricing; supplier publishing and confirmed PDF results; requests, frozen reservations and inboxes; document search and compare; COA checks and sourced limits; outreach counter; leave/stay; reusable anonymous visitor poll (9C); sourcing demand, share/OG/badges, SEO landings, transactional queue and first-party funnel (9D); claims, takedowns and admin; FAQ and redirects; complete QA.
