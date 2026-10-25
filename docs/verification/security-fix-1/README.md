# SECURITY-FIX-1: VLE stack integration

PR #69 merges main c025f326d7b6566590af514c1f33af8e48e5705f into the existing explicit-membership history. The two conflicts in public/app.js and public/teams.js retain the explicit-invitation and separate report-approval copy. Main's mobile shell and approved copy changes are preserved. No authority is inferred from an email domain.

Validation: production build, all 21 tests/*.mjs files, focused lint (zero errors; existing app warnings), and whitespace pass. See pr69-checks.json for the individual commands' exit codes. Tests use disposable local fixtures and intercepted outbound providers. No production data, PR merge, retarget, deployment, or TECRID changes. Receiver remains OFF.

PR #70 merges the same main and updated #69, then charges the per-IP and per-principal budgets before the global budget. The effective global ceiling has a minimum of 25 per-IP allowances. Defaults remain 120/IP, 90/principal and 3000/global per minute. Distributed traffic can still reach the aggregate ceiling; this is not a general edge denial-of-service defense.

The unchanged limiter fails three new regressions, including a second client being denied sign-in after another client floods it. After the fix, all five budget checks pass: concurrent atomic counts, two-client flood isolation with rotating cookies, low-global-setting headroom, principal rejection across IPs, and the aggregate global ceiling. See budget-red.txt and budget-green.txt. The production build, all 22 test files, focused lint (zero errors), and whitespace pass on the integrated code. No schema or migration change.
