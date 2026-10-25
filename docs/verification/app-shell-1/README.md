# VLE-APP-SHELL-1

Draft PR only. Base main `14339387` (after Elon merged #64 during verification). No merge or deployment.

Phones below 768 px and standalone windows use VLE's green and orange version of TECRID's cream tab bar and grouped Explore sheet. Desktop keeps the existing chrome. Tabs use the active server-provided `state.role` plus `session.signedIn`; email and team membership rank do not select a phone role.

| Session | Tabs |
| --- | --- |
| Signed out | Home, Find lots, Verify, Sign in, More |
| Brand | Home, Find lots, Requests, Alerts, More |
| Supplier | Home, My lots, Requests, Alerts, More |
| Member, retailer, other, unknown | Home, Find lots, Alerts, More |

All visible tabs open real destinations. More opens a native modal dialog with internal scrolling, native focus containment, Close, Escape and backdrop dismissal, plus focus restoration to More. It closes on internal navigation or resizing into desktop browser mode. Signed-in menus contain only their active role's workspace. Account uses the existing combined profile, organization and team screen.

Requests opens the existing account-scoped sourcing screens. Alerts opens the existing sourcing and evidence inboxes. Current main has no VLE access approval/decline cards or dedicated brand question inbox. The phone empty-state panel explains that access decisions happen in TECRID and links to existing conversations for replies. No approval behavior or fake pending item was added. VLE-PHONE-2030-1 steps 1+ can add these cards later.

Lot cards and lot details show the available supplier-reported certification label and source documents. TEST TECRIDs are grouped in a disclosure and retain the sandbox and pending laboratory confirmation warnings. The merged status-only proof projection is reused for scoped lot certification and TECRID status, program, issuer and freshness. Main currently seeds no production TECRIDs; the receiver remains OFF. Confirmed-release and scope rules are retained unchanged. Supplier documents are explicitly distinguished from lot and brand certification. No key-management page or permission exists on main, so API keys do not appear in More.

The raw HTML shell serves `/vle.webmanifest`, `viewport-fit=cover`, iOS standalone metadata and a 180 px Apple icon. Manifest icons are 192 and 512 px PNG conversions of the existing VLE SVG. No new dependency or service worker. No authentication, authorization, gating, API, schema or migration file changed. `/faq` and `/boundaries` are presentation routes using existing product boundaries.

## Verification

- Production build passes. [Build log](build.txt).
- All 15 existing test files plus `tests/mobile-shell.mjs` pass: 16/16. [Test log](tests.txt). Integration suites initialize only disposable Miniflare databases and stub external services. Expected invalid-origin and delivery-failure messages in the auth test are negative-path assertions. No application or production database was migrated or queried. Both merged proof suites pass, including the actual built Worker and synthetic HMAC/idempotency checks with zero outbound calls.
- The new suite covers exact role tabs, signed-out precedence, unknown-role fallback, active destinations, role-only More groups, open/close, native close, backdrop, route change, desktop resize, focus return, metadata and honest proof labels.
- [Built Worker HTTP checks](built-worker.json): Home, Find lots, FAQ, boundaries, manifest, icons, JS and CSS all return 200 with correct types. Production bootstrap was not used for signed-in browser QA.
- CUA browser measurements at 390x844 show one compact header, no horizontal overflow and tab targets approximately 71.6 x 58 px. All tab targets exceed 44 px in both dimensions even at 320 px. Also checked 430, 767, 768 and 1280 widths. Desktop has the original three chrome regions and no visible phone navigation. [Measurements](browser.json).
- A short 390x600 sheet has 471 px internal viewport for 725 px of content, with the background locked. The heading and Close remain outside the scrolling body.
- Existing desktop homepage browser regression passes at 1280x900: lookup above the fold, the supplier and two role cards below it, sourcing boundary paragraphs expanded and visible. [Snapshot](desktop-home.json).
- New shell/controller/fixture/route files pass targeted ESLint with zero warnings. Existing `public/app.js` has nine baseline warnings; no errors were introduced. JavaScript syntax and whitespace checks pass.
- No new dependency. Reused an installed dependency tree with an identical lockfile for local validation.

Screenshots use actual committed HTML/CSS/browser modules served by the read-only local fixture `scripts/preview-app-shell.mjs`. Its `/api/bootstrap`, `/api/sourcing` and evidence inbox are isolated fixtures with no database or outbound requests. Public proof metadata comes from a committed snapshot of the merged seed projection generated in disposable Miniflare with outbound calls forbidden; it preserves five source-backed supplier certification records, six lots and no production TECRIDs. Signed-in images are synthetic EXAMPLE viewer accounts with `fixture@example.invalid`; they do not prove production sign-in or live pending approvals. Before is the unmodified pre-shell homepage at the same dimensions. Main's intervening #64 merge changed below-fold proof content; the hero and navigation captured in Before are unchanged by that merge. Real iPhone installation and home-indicator behavior still require a device check after Elon's later merge/deploy gate; CSS includes safe-area padding and the install metadata is served by the built Worker.

## Screenshots

| View | Evidence |
| --- | --- |
| Home before, 390x844 | [Before](home-before-390.png) |
| Home after, 390x844 | [After](vle-home-after-390.png) |
| Find lots, 390x844 | [Find lots](vle-find-lots-390.png) |
| Explore VLE, 390x844 | [More](vle-more-390.png) |
| Brand Requests, synthetic, 390x844 | [Requests](vle-brand-requests-390.png) |
| Brand Explore, synthetic, 390x844 | [Brand More](vle-brand-more-390.png) |
| Supplier My lots, synthetic, 390x844 | [My lots](vle-supplier-my-lots-390.png) |
| Supplier Alerts, synthetic, 390x844 | [Alerts](vle-supplier-alerts-390.png) |
| Scoped proof strip, 390x844 | [Lot card](proof-card-390.png) |
| Supplier proof wall, 390x844 | [Supplier proof](supplier-proof-390.png) |
| Lot detail, 390x844 | [Lot detail](lot-detail-390.png) |
| Short Explore sheet, 390x600 | [Internal scrolling](more-short-390.png) |
| Home, 430x932 | [430 px](vle-home-430.png) |
| Home desktop, 1280x900 | [Desktop](vle-home-desktop-1280.png) |

## Reproduce

```sh
node tests/mobile-shell.mjs
node tests/homepage-regressions.mjs docs/verification/app-shell-1/desktop-home.json
npm run build
node scripts/preview-app-shell.mjs
```

The fixture listens only on `127.0.0.1:5187`, rejects write methods and never serves application API actions. `/__qa/role?role=brand`, `supplier`, `member` or `out` selects a local synthetic screenshot session. Never use this helper as a deployment entrypoint. For the original before screenshot, run the fixture with the shell and public files from main.
