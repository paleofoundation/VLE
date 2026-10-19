# READY-3 validation

Created from main, carrying READY-1 and READY-2 prerequisites as separate commits.

- Public document index and shared navigation: HTTP 200 at 1440px and 390px, no horizontal overflow.
- Database/browser checks: 22 document cards, two Rice results, one Light Labs result, four complete dates on or after 2026-09-01.
- Marking one local test document unavailable retains its card, shows the removal label and removes the outgoing link. Restored after testing.
- Labdoor attribution, report date text and source URLs remain unchanged.
- Domain tests cover combined filters and exclusion of partial dates from date/freshness ranges. The index is explicitly on the public Clerk bypass allowlist.
- Screenshots committed under `docs/screenshots/vle-ready-3-documents-index/`.

No document-login gate is introduced. PRs 36 and 37 are not dependencies.
