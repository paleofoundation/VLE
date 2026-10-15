# TECRID preparation reminders

Draft implementation of VLE-TECRID-NUDGE-1 (Q9), using the 15 October 2026 tie-only decision.

## Screen descriptions

- `/join`: an optional preparation step follows the role choices. The supplier can identify an offered lot and controlled sample, prepare a laboratory report reference, and acknowledge reviewing TECRID instructions.
- `/for-suppliers`: the same onboarding preparation step accompanies the supplier path.
- `/supplier`: the existing authenticated supplier desk includes the shared profile reminder. Authentication and access handling are unchanged.
- `/suppliers`: a generic visitor reminder accompanies the profile index. It does not assert any organization's verification status.
- `/suppliers/[slug]`: the shared profile reminder accompanies the existing organization profile. Its checklist belongs to the visitor, not the displayed organization.

The panel uses a two-column copy/checklist layout with responsive stacking, labeled native checkboxes and progress, and a persistent dismissal/reopen button. Progress reads `0 of 3 preparation items checked by you`; completion explicitly does not establish verification. `Dismiss for this visit` collapses the content into `Show reminder`, retaining keyboard focus. Navigating to a different page or reloading starts a fresh checklist and reminder. There is no persistence, timer, request submission or verification lookup.

## Copy and dependency

Approved explanation: TECRID verification can break ties between offers with the same contamination grade. It cannot lift a worse contamination grade above a better one. Existing commercial eligibility gates remain in force.

`MATCH_METHODOLOGY_PATH` is the named `/matching/methodology` link. It resolves after Q8 draft PR [VLE#39](https://github.com/paleofoundation/VLE/pull/39) merges. Until then, that route is absent on this main-based branch. The small `src/matching/copy.ts` constants file is byte-identical to Q8's version, so both draft PRs share the same route definition without importing its engine. Merge sequencing must preserve the Q8 dependency.

Matching wording in the supplier index, supplier metadata, structured data and existing article now uses the same tie-only statement. No numeric ranking effects or verification status are inferred from the checklist. No schema, authentication, eligibility or production configuration changes.

## Validation

- Lint, standalone typecheck and optimized production build passed.
- Existing suite: 74 passed, 3 existing database integration tests skipped, 0 failed. No database configured or modified.
- Local browser at `/join`: all three preparation items checked; completion remained explicitly unverified. Dismissal hid the checklist and retained focus on `Show reminder`.
- Client navigation to `/suppliers` showed the generic profile reminder with zero checked items. Browser Back to `/join` restored the reminder with zero checked items, confirming recurrence through page navigation.
- Desktop layout visually reviewed. All five callsites inspected. Authenticated and database-dependent profile screens were not opened with real accounts or data.
- Independent accessibility/copy/state review passed. Added-line wording scan and whitespace checks passed.

Draft only. No merge or deployment.
