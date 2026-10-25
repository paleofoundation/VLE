# SECURITY-FIX-1: VLE stack integration

PR #69 merges main c025f326d7b6566590af514c1f33af8e48e5705f into the existing explicit-membership history. The two conflicts in public/app.js and public/teams.js retain the explicit-invitation and separate report-approval copy. Main's mobile shell and approved copy changes are preserved. No authority is inferred from an email domain.

Validation: production build, all 21 tests/*.mjs files, focused lint (zero errors; existing app warnings), and whitespace pass. See pr69-checks.json for the individual commands' exit codes. Tests use disposable local fixtures and intercepted outbound providers. No production data, PR merge, retarget, deployment, or TECRID changes. Receiver remains OFF.
