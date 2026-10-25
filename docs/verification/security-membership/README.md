# F07: explicit account authority

The first commit records four failures: company mailboxes became buyers, legacy domain rows supplied roles, allowed-domain users could join private teams, and bootstrap exposed buyer capability without explicit membership. The fix removes those authority paths. Account owners and exact-email invitations supply roles; revoked and legacy domain memberships supply none. Saved domain policies remain onboarding suggestions only and do not create or widen membership.

The team UI explains that suggestions grant no access and labels inactive legacy domain rows. Signed-in people can use the existing account picker to create their own workspace or open an invited one. Existing personal records stay personal, and read queries retain their ownership checks. Report authorization remains the independent controller gate from F02. No layout or database change is introduced. Three touched team-role labels are normalized to colons to preserve the no-dash copy rule.

Five focused domain/role tests and twenty report regressions pass, including a real bundled bootstrap route, explicit invitation and immediate revocation. The existing team test deliberately changes its domain-join positive to a denial, then checks the same viewer workflow through an explicit invitation. All VLE test files and build pass with disposable D1/R2 and intercepted providers. Focused lint: zero errors, nine preexisting warnings in public/app.js. Whitespace and added-line em/en dash scan pass.

No production data, policy, schema, migration, real email, notification, merge or deploy. Legacy domain members need a deliberate exact-email invitation before regaining shared-account access. Receiver remains OFF. Stacked on F08 receiver PR #68.
