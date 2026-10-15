# Matching build review

This draft implements the 2026-10-15 16:25 contamination-first decisions in `SPEC-MATCH.md`. It introduces no schema, migration, database writes or production policy values.

## Evaluation and display

The matching domain takes a buyer requirement, viewer, eligible offered lots, reviewed public evidence metadata, a reviewed configuration and an evaluation time. It preserves the existing commercial eligibility gate. The complete fixed analyte panel must be comparable and verified before the least favorable grade utility becomes Q. Higher Q sorts first. Only equal Q uses the sum of TECRID and ICS contributions, followed by stable identifiers. Equal Q and bonus totals share a rank; stable identifiers only order their display.

A supplier is represented by its best matching physical lot, with its other lots retained for explanation. Repeated evidence cannot multiply a bonus. Verification is shared only within one evaluation for the same TECRID, sample, report version and evidence hash, so duplicate listings use one current-status snapshot; a new evaluation always performs a fresh check. Conflicting current evidence or inconsistent listings for the same physical lot remain unrankable.

The request-local receipt records the requirement, viewer scope, policy, time, exact offer and lot, source versions and hashes, original measured values and units, grade utilities, verification contributions and reasons. The explanation component consumes that receipt rather than recomputing a score. The public methodology page is `/matching/methodology`.

## Closed defaults and review boundaries

- Missing or invalid policy returns `No approved grade mapping`. No approved production panel, source edition, grade band, utility scale, bonus weight, numeric policy or freshness duration is supplied here. Fixtures are explicitly TEST-ONLY and FAKE.
- TECRID must use its existing adapter contract. Production transport is not approved on main; the shipped application entry remains unavailable. Local mock receipts cannot establish production ranking evidence.
- The existing TECRID contract authenticates measured analyte values and units. Additional species, matrix, basis, method and sample-to-lot metadata require a reviewed source binding. The engine does not infer these fields from an attachment or the transport response.
- The sole shipped ICS adapter returns unavailable, with no bonus. Future verification must bind the organization, category, exact program and standard version in MATCH_ICS_CERTIFICATION_SCOPE, and current validity before any contribution is allowed.
- The approved freshness maximum age is applied conservatively to collection, report and issue dates as well as verification and status checks. No duration is supplied by default.
- Censored, non-detect and detection-limit-only results are unrankable. A measured value below a supplied decimal LOD or LOQ is also unrankable; unsupported non-null limit text is preserved and makes the offer unrankable without interpretation. No unit conversion, species inference or rounding is used to improve rank.
- Only public evidence participates. The default gated authorization adapter denies access; even a future grant cannot turn gated evidence into a public score. Q7 remains a separate unmerged draft.
- The engine is not a browser-facing mutation or an alternate listing gate. Live data projection and production policy approval remain separate work. Existing match and reservation invalidation stays authoritative.
- Evaluation snapshots are request-local. Callers must refresh live eligibility, verification and authorization on each comparison and use no-store responses, with no shared result cache. Previously delivered results cannot be recalled.

## Review surfaces

The methodology page explains fixed-panel utility, tie contributions, missing data, current eligibility and public evidence boundaries. The explanation component shows the exact lot, unrankable reasons or the evaluated grade and contribution breakdown, and source provenance from the same snapshot. It does not create a safety guarantee or a certification decision.

## Validation

Final validation on 2026-10-15: lint, standalone typecheck and optimized Next.js build passed. The suite passed 217 tests with 3 existing database integration tests skipped and zero failures; the unchanged baseline was 74 passed and 3 skipped. The 143 matching tests cover policy validation, ordering, eligibility, authentication, freshness, certificate scope, limits, duplication, privacy, immutable receipts and rendering. The methodology page also rendered locally without production environment settings. No pre-existing check failure was observed. Existing database integration tests require an explicitly configured test database and are not run against production. No migration or seed command is part of validation.
