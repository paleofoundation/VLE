# Elon ↔ Codex bridge (pen pals)

Shared drop-box. Not a live chat. Append only inside your section. Never delete the other party's entries.

## Protocol

1. Codex writes under `## CODEX → ELON` (STATUS / ASK / PR links / blockers).
2. Elon writes under `## ELON → CODEX` (ORDERS / KILL-GATE / NEXT PROMPT / NO).
3. Newest entry at the **top** of your section (reverse chrono).
4. Each entry starts with `### YYYY-MM-DD HH:MM TZ` and a one-line tag: `STATUS` | `ASK` | `ORDER` | `KILL-GATE` | `PROMPT` | `BLOCKER`.
5. Scope locks: no Knowde catalog depth; do not weaken Phase A gates; Phase C+ only on explicit Elon GO in this file.
6. After every meaningful task, update this file before stopping.

## ELON → CODEX

### 2026-09-05 20:30 Asia/Nicosia — ORDER

1. Merge PR #6 if open and PASS (DB triggers + evidence-revoke). On bridge merge conflicts, keep both sides’ newest entries.
2. Next PR: Supplier visual walkthrough — public /for-suppliers (or /how-it-works). 4–6 steps: Rescue→Spot→Reserve; lot ≠ PDF/COA; independent sample + TECRID; claim = “Passed Profile X” only (no safe/clean/zero); supplier must give stocked lot code + qty/location + authorizer.
3. Not a catalog. No Phase C, Orders, payments, Knowde depth, avocado matching expansion.
4. Optional same PR: printable one-pager of the same story for Marcus email attach.
5. Append STATUS + PR URL under ## CODEX → ELON; stop for kill-gate.

Scope locks stand: Phase A gates intact; PDFs are background artifacts only, never QUALIFIED/LISTED on PDF alone.

### 2026-09-05 20:24 Asia/Nicosia — KILL-GATE

PR #6 PASS / merge authorized.

### 2026-09-05 20:24 Asia/Nicosia — ORDER

After merge: STATUS confirming merge. If weekend critical path is done (Phase B + bridge + avocado lane + DB tests/re-evidence), post FINISH under CODEX → ELON. Elon will FINISH back and pause the 15-min poll. Still locked without GO: Phase C, Knowde, Orders/payments, avocado matching expansion.

### 2026-09-05 20:23 Asia/Nicosia — KILL-GATE

PR #5 PASS / merged.

### 2026-09-05 Asia/Nicosia — KILL-GATE

PR #5 PASS. Merged/merge when ready.

### 2026-09-05 Asia/Nicosia — ORDER

Next PR only:

1. DB trigger integration tests (publication gate + unlist → match/reservation invalidation)
2. Soft-fix evidence revoke so lot isn’t forced REVOKED if re-evidence should remain possible — or document why terminal is intentional
3. Do NOT expand Phase B matching to avocado yet
4. No Phase C / no catalog / no oil

Open PR, append STATUS + URL under CODEX → ELON, stop for kill-gate.

### 2026-09-05 Asia/Nicosia — ORDER

Bridge online.

1. Confirm PR #3 (Phase B) is merged to main; if not, say so under CODEX → ELON. Do not start Phase C.
2. Next build: Avocado fruit product type + Avocado Profile v1.0 EXAMPLE seed (metals/Cd) + dual-lane ops/public readiness. No oil marketplace. No catalog taxonomy. Matching may stay cocoa-only until Elon expands it.
3. When that PR is open, append STATUS + PR URL under CODEX → ELON and stop for kill-gate.

## CODEX → ELON

### 2026-09-05 20:24 Asia/Nicosia — FINISH

FINISH. Weekend critical path is complete on `main`: Phase B, the pen-pal bridge, the avocado fruit pilot lane, Postgres trigger integration tests, and the re-evidence lifecycle. PRs #3, #4, #5, and #6 are merged. Phase C, Knowde catalog depth, Orders/payments, and avocado matching expansion remain locked without GO. Elon may FINISH back and pause the 15-minute poll.

### 2026-09-05 20:24 Asia/Nicosia — STATUS

PR #6 merged: https://github.com/paleofoundation/VLE/pull/6 — merge commit `30e4f4de9c43e30011d6a3da3c5c50e97e1e0a22`. Database publication-gate coverage, unlist-driven `RequirementMatch` / `ReservationIntent` invalidation tests, and the non-terminal TECRID re-evidence path are now on `main`.

### 2026-09-05 20:21 Asia/Nicosia — STATUS

Database gate + re-evidence PR: https://github.com/paleofoundation/VLE/pull/6

Added rollback-isolated Postgres integration tests for publication rejection/acceptance and unlist-driven `RequirementMatch` / `ReservationIntent` invalidation. TECRID evidence revocation now unlists immediately but returns an otherwise non-terminal physical lot to `EVIDENCE_RECEIVED`; replacement evidence and a new immutable qualification decision are required before relisting. `npm run check`, `npm run test:integration`, and `npm run build` pass. Cocoa-only matching is unchanged. No avocado matching, Phase C, catalog, or oil work. Stopping for kill-gate.

### 2026-09-05 19:53 Asia/Nicosia — STATUS

Avocado fruit pilot PR: https://github.com/paleofoundation/VLE/pull/5

PR #3 and PR #4 are merged. Implemented `AVOCADO_FRUIT`, frozen Avocado Profile v1.0 with EXAMPLE metals/Cd limits, one private nominated fruit lot, and separate public/ops readiness lanes. Phase B matching remains cocoa-only. No avocado oil marketplace, catalog taxonomy, or Phase C work. `npm run check`, `npm run build`, seed, and desktop/mobile browser verification pass. Stopping for kill-gate.

### 2026-09-05 19:39 Asia/Nicosia — STATUS

Bridge PR: https://github.com/paleofoundation/VLE/pull/4

PR #3 (Phase B) remains OPEN: https://github.com/paleofoundation/VLE/pull/3

Per ORDER, only the bridge and README reminder were implemented. The avocado fruit lane and Phase C were not started. Waiting for PR #3 to merge before executing the avocado prompt.

### (put newest entries above this line)
