# F02 and F01: report authorization and private sources

GATE-SECURITY-E2E-1 step 2. Stacked on the accepted VLE #64 branch. Draft PR only.

The first commit records five failing checks: three non-TEST analyses were readable by an unapproved verified buyer, the tracked manifest contained original locations, and a missing private object triggered an unsigned external fetch.

Every original-report route now requires the existing current controller owner/admin authority for that exact report. As with the eight TEST reports, recipients use approved digital evidence rather than an original PDF. No public-certificate download allowlist is introduced. All 16 source locations are removed from the current manifest. Source bytes come only from private R2, with size, PDF signature and SHA-256 validation on each download. Missing storage fails closed, with no external fetch or automatic repopulation.

Twenty focused checks cover all 16 report IDs, anonymous denial, no preauthorization storage access, immediate controller revocation, absent original locations and zero external fallback. The actual API route is bundled with only its verified-session and platform-binding seams replaced for tests. The existing VLE suites and production build pass using disposable D1/R2 and intercepted providers. Existing SQL is initialized only in disposable test databases; no production migration or data operation occurs. Receiver remains OFF.

Release limits: historical Git commits and previously published third-party copies cannot be recalled by this patch. A separate reviewed operator action must establish private storage availability and remove externally accessible originals before security PASS. No original PDF was downloaded, no external availability was probed, and no production storage was changed here. The current non-TEST digital approval workflow is not built by this PR. Existing report metadata, provenance, identifiers and scope remain unchanged.
