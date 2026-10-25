# Waiting on you: phone phase 1

Signed-in brand and supplier home pages show participant-owned sourcing tasks. The public discovery pages and proof strips keep their existing behavior. Personal email users can create or select an account through Account; no company-domain inference grants membership.

Each card has at most two buttons. Approve applies the existing cost-responsibility or soft-hold transition with one tap. Not now records a deferral until a new conversation update. Answer opens the private message and reply field; Send answer saves it on the second tap, after typing. An empty inbox says you are caught up. Viewers cannot make decisions. The phone bar contains role-specific Home, Find lots or My lots, Requests, Messages and Account, without a menu or public footer.

`GET /api/sourcing/waiting` returns the selected account's tasks only. `POST /api/sourcing/waiting/:roomId/approve`, `/not-now`, and `/answer` require a verified session, editable membership, same origin, bounded JSON, mutation budget, exact account ID, task key and room version. The transaction checks both room version and latest event before saving. A concurrent decision or message returns 409. No query parameter or caller-supplied role selects another account.

The schema-only migration adds `sourcing_decisions`: account, human actor, room, exact task, decision, previous room version and timestamp. Approval text is not used as authority. Private replies stay in participant events. Decision records contain metadata only. These routes send no email, push, result-bearing notification, evidence grant or production side effect during validation. A soft hold is not a contract; cost approval is not evidence qualification or certification. TECRID access remains in TECRID. Phase 4 remains gated.

Migration 0011 was generated independently off current main as ordered. The consumer draft #77 also starts its own 0011 sequence. Elon's chosen merge order will require ordinary schema/journal integration before the second draft is merged; neither migration has been applied to production.

## Verification

Build, all 28 test files, focused lint (zero errors; inherited warnings), schema drift and whitespace checks passed. The proof-chip suite now asserts task home for signed brand/supplier roles while preserving all public discovery/profile/lot proof assertions. New tests exercise anonymous and cross-account denial, origin and account changes, viewer membership, unavailable actions, duplicate/concurrent approval, permanent audit records, deferral and reappearance, expired holds, private answers, latest-message races, escaping and the two-button limit.

`docs/verification/phone-p1` includes synthetic brand and supplier screenshots at 390 and 1440 pixels, answer-form screenshots, browser geometry, tap counts and command logs. The fixture server uses process memory only; no real person was logged in or contacted. Browser checks confirmed no horizontal overflow, no signed phone menu, no phone footer and buttons at least 44 pixels high.

## Tap note for a 12-year-old

Brand: open Home. If the supplier's proposed responsibility is ready, tap Approve once. To reply, tap Answer, type, then tap Send answer. That is two button taps. Not now puts the card aside until a new update.

Supplier: open Home. If you can honor the displayed soft hold, tap Approve once. To reply to the buyer, tap Answer, type, then tap Send answer. That is two button taps. These actions do not approve a TECRID or certify a lot.
