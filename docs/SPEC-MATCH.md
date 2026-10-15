# Brand-to-supplier matching

Order: VLE-MATCH-1, Q8, step 1.
Status: Draft specification. WAITING_ON: ELON SPEC PASS.
Baseline: origin/main at 40e95cca5b4b035f4651b10ac3c2360441ab7110.

## Purpose and scope

Rank comparable supplier offers in response to a brand's ingredient requirement, rewarding lower contamination grades supported by current verified lot data. Show the grade inputs, verification and certification contributions, missing evidence and tie-break for every result. Unverified data never counts as verified.

This PR contains only this specification. It authorizes no Q8 build, migration, fixture ingestion, production configuration, external service, merge or deploy. Q7's separate build draft does not become a dependency through branch ancestry; the future integration must use approved interfaces. Q9, Q10 and Q11 step 2 remain outside scope.

The program claim remains a standard per product category with scheduled retesting. A match is a sourcing aid for an identified offer, not a safety guarantee, certificate, purchase order or promise about all inventory from a supplier.

## Existing behavior that must remain intact

- [Match eligibility](../src/domain/commercial.ts) and [matching service](../src/services/commercial.ts) bind a requirement to the same product, frozen profile version, quantity unit and sufficient available quantity. Current Phase B matching is cocoa powder only. Q8 does not silently expand categories or relax publication gates.
- [Qualification](../src/domain/qualification.ts) produces QUALIFIED, NOT_QUALIFIED or INSUFFICIENT_EVIDENCE. Those outcomes are not an existing contamination-grade scale. The seed's example limits are explicitly not regulatory standards and cannot become ranking thresholds.
- [TECRID contract](TECRID_ADAPTER.md) separates evidence authenticity from sample collection, lot identity, inventory and authority to sell. The production connection remains a contract stub. Mock receipts cannot count as live verification.
- [Product invariants](VLE_PRODUCT_INVARIANTS.md) distinguish a supplier file reference from measured evidence, a qualification decision and certification. A PDF attachment or Q7 access grant contributes no verification by itself.
- The existing publication/match gate already requires current TECRID evidence. Therefore the proposed TECRID boost is the same for all currently eligible listings that pass authentic production verification. Do not claim it differentiates today's offers or weaken the gate to create a visible effect. Supporting a separate non-TECRID verified evidence path would require an explicit future policy and contract decision.

## Inputs and provenance

| Input | Required binding and review | Missing, conflicting or stale behavior |
| --- | --- | --- |
| Brand requirement | Server-resolved buyer membership, product category, intended use, destination jurisdiction, frozen profile version, required analyte panel, quantity/unit and declared filters | Reject ambiguous scope; do not guess units, jurisdiction or intended use |
| Candidate offer | Supplier organization, identified physical lot, current listing and qualification decision, available quantity, lot identity/location/authority facts | Exclude ineligible listings; preserve existing invalidation behavior |
| Measured evidence | Sample and lot identifiers, analyte/species, original value and unit, matrix/basis, method, laboratory/issuer, report version, collection/report/verification dates, detection/quantification limits and qualifiers where reported | Unknown, superseded, revoked, incompatible or incomplete records supply no verified grade |
| Evidence verification receipt | Authenticated source, verified subject/sample binding, immutable evidence hash/version, review result, validity and current status | Supplier assertion, uploaded file, public URL, code redemption and mock receipt are not verification |
| Grade rule | Published or separately approved category rule, exact version, jurisdiction/use, analyte/species, basis/unit, method and censoring policy, source locator and reviewer | No grade until the rule and evidence are applicable and approved |
| TECRID status | Authenticated current receipt bound to the scored sample/evidence; production contract approved | No boost for unverified, expired, revoked, unavailable or mock status; distinguish those states in explanation |
| ICS certification documentation | Verified certificate authority and status, holder organization, program, category/product/facility scope, standard version, validity and evidence reference | An uploaded certificate image is unverified; scope mismatch or stale status receives no certification boost |
| Rank policy | Versioned configuration, approved weights, grade utility mapping, required panel and source mappings, effective time and decision owner | Missing policy disables scoring; no silent fallback values |
| Viewing authority | Current actor and organization plus Q7 document/action grants for private inputs | Private evidence is not used in that viewer's rank or explanation without explicit authorization |

The canonical scored unit is an eligible physical-lot offer, not a supplier-wide average. Deduplicate identical evidence by authenticated report/sample/version identity. Resolve corrections and supersession by the authoritative evidence history, never by selecting the most favorable result or newest filename. Unresolved conflicting current evidence makes the offer unrankable.

## Standards and grade definitions

Reference the applicable published standard before creating any category-to-grade mapping. Record source title, authority, exact edition or consolidated version, effective date, retrieval date, section/table locator, category/intended-use scope, analyte/species, units/basis and review status. A legal maximum or guideline is not automatically a multi-level grade scale or a cross-analyte risk equivalence.

Source entry points reviewed on 2026-10-15:

| Published source | What this spec relies on | What remains TODO |
| --- | --- | --- |
| [European Commission contaminant legislation overview](https://food.ec.europa.eu/food-safety/chemical-safety/contaminants/legislation_en), linking [Commission Regulation (EU) 2023/915](https://eur-lex.europa.eu/eli/reg/2023/915/oj/eng) | The Commission identifies this regulation as the framework for maximum levels of certain contaminants in food | Verify the current consolidated annex and exact applicable product/use before mapping. Direct EUR-Lex retrieval returned a verification page in this run; no annex value or current amendment claim is imported |
| [Codex official standards listing, CXS 193-1995, General Standard for Contaminants and Toxins in Food and Feed](https://www.fao.org/fao-who-codexalimentarius/codex-texts/list-standards/en/?ids=91) | Official published standard identity as a source entry point | Retrieve and review the applicable edition and category provision. The official PDF fetch was unavailable in this run; no table value is imported |
| [European Commission contaminants overview](https://food.ec.europa.eu/food-safety/chemical-safety/contaminants_en) | The regulator distinguishes contaminant groups and directs readers to legislation and analytical provisions | No inference that every analyte has a limit for the requested category |

These are source references, not approved ranking thresholds. No concentration, CAS number, DOI, grade cutoff or numeric weight is introduced here. Where there is no verified applicable grade definition, display "No approved grade mapping" and withhold the contamination score. Where an applicable regulatory limit has not been established, display "No regulatory limit mapped"; do not borrow a neighboring product's limit. A reference-source outage must not be represented as scientific absence of a standard.

Published graded categories may be used only with their exact definitions and scope. If the applicable publication supplies maximum levels but no grades, any proposed utility mapping is a separate decision for Elon and must be labelled as a VLE ranking policy, never attributed to the regulator. Seed values and frozen example profiles cannot fill this gap. PFAS or microplastics coverage must not be inferred from metals evidence.

Censored results remain censored. Do not replace a non-detect with zero, infer a precise rank from incomparable detection limits, convert wet/dry basis without an approved source, or substitute total element for a specified species. Unsupported method/unit/basis or censoring combinations are unrankable. The current numeric-only evidence contract will need an approved extension before such records can be ranked.

## Proposed scoring formula

All ranking settings are named configuration with values unset pending approval:

| Key | Meaning and constraint |
| --- | --- |
| MATCH_POLICY_VERSION | Immutable policy identity and effective date |
| MATCH_REQUIRED_ANALYTES | Fixed panel for a particular requirement/category/profile; cannot shrink per supplier |
| MATCH_STANDARD_MAPPING | Reviewed source/version/scope bindings for that panel |
| MATCH_GRADE_UTILITY | Approved monotone mapping from a verified grade to dimensionless ranking utility; better contamination grade has greater utility |
| MATCH_WEIGHT_CONTAMINATION | Positive weight for verified contamination utility |
| MATCH_WEIGHT_TECRID | Positive bonus weight for current authenticated TECRID verification |
| MATCH_WEIGHT_ICS_CERT | Positive bonus weight for verified, current, in-scope ICS certification documentation |
| MATCH_VERIFICATION_FRESHNESS_POLICY | Approved authoritative-status checks and validity requirements, with no invented duration |
| MATCH_CENSORING_POLICY | Approved handling of detection limits, qualifiers and incomparability |
| MATCH_NUMERIC_POLICY | Approved decimal representation, precision and display rounding; never rank on rounded display values |

For rankable offer `l` under requirement `r`:

```text
U(a,l,r) = MATCH_GRADE_UTILITY[approved standard/version, verified grade for analyte a]
Q(l,r)   = minimum U(a,l,r) over the complete MATCH_REQUIRED_ANALYTES panel
B_T(l,r) = MATCH_WEIGHT_TECRID if bound TECRID evidence is verified and current,
           otherwise no contribution
B_C(l,r) = MATCH_WEIGHT_ICS_CERT if ICS documentation is verified, current and in scope,
           otherwise no contribution
S(l,r)   = MATCH_WEIGHT_CONTAMINATION * Q(l,r) + B_T(l,r) + B_C(l,r)
```

Using the least favorable utility prevents a favorable analyte from hiding a less favorable analyte. It is a proposed ranking aggregation, not a toxicological mixture model. The grade utility scales must be explicitly approved as comparable for this panel; without that approval, withhold aggregate scoring. Do not average raw concentrations across different substances or use peer percentiles that change merely because other offers disappear.

Weights and mapping values are not set in this spec. Configuration validation rejects missing, non-finite or invalid values, reversed grade ordering and an incomplete panel mapping. No production defaults. Test values in a later authorized build must be TEST-ONLY and use FAKE data.

With other inputs fixed, improving a grade cannot lower the score; improving the least favorable grade increases contamination utility when it becomes the determining grade. Verified TECRID and verified ICS documentation each add their configured contribution, once per offer. Repeated receipts or multiple copies of a certificate do not accumulate bonuses. Their absence adds no bonus, but is shown as missing or unverified rather than as verified with a lower score.

A weaker contamination grade can outrank another offer if the approved bonus weights outweigh its contamination contribution. The explanation must disclose this tradeoff. Elon must approve that additive tradeoff or select a contamination-first ordering before implementation; there is no invented weight ratio that silently decides it. No bonus can override basic match eligibility, a required panel gap, an invalid grade or a failed applicable qualification gate.

If any required grade is missing, not verified or not comparable, `Q` and `S` are absent. Such an offer appears only in a separate "Not ranked: evidence incomplete" group if its basic visibility and listing rules allow it. Never coerce missing grades into a favorable value, silently renormalize a smaller panel, place unranked offers inside scored ranks, or label them clean. Optional certification absence does not itself invalidate an otherwise rankable offer.

## Ordering, grouping and tie-breaks

Compare only within the same requirement, category/use/jurisdiction, required panel, profile/standard mapping and policy version. Separate incomparable cohorts visibly; do not produce a global leaderboard across unrelated products.

Sort rankable offers by `S` descending. For equal full-precision scores, use `Q` descending, then stable supplier organization ID and physical-lot ID in ascending lexical order. Equal scores remain visibly tied; the final ID ordering is only reproducible presentation, not a scientific preference. Do not use revenue, payments, profile completeness, number of uploads or random ordering as hidden tie-breaks.

For a supplier-grouped result, select that supplier's highest-ranked eligible offered lot using the same rule and show the exact lot. Offer an expandable list of its other eligible matching lots. Label the score "Best matching offered lot"; do not imply it measures the supplier's whole production. Changing the selected offer changes the explanation. Uploading duplicate lots or reports cannot create extra supplier rows or extra bonuses.

## Per-result explanation UI

Every scored result must show:

- Supplier and exact offered lot, requirement/profile and ranking policy versions, evaluation time, evidence validity and any tie-break used.
- An analyte table with original reported result/qualifier and units, verified grade, source standard/version and locator, evidence verification state, sample/lot binding and the utility contribution. Link only to evidence the current viewer may access.
- Contamination utility, configured contamination weight, TECRID status and contribution, ICS status/scope and contribution, and the resulting score. Explain which analyte determines the contamination component and whether a bonus changed relative ordering.
- Missing, unverified, stale, revoked, superseded, conflicting or out-of-scope inputs, each with its actual reason. Never hide missing data behind an empty badge or convert an attachment into a verification checkmark.
- A plain statement: "This rank compares the stated offered lot under the selected requirement. It is not a product safety guarantee or certification decision."

Unranked results show the reason and no numeric score or ordinal rank. A user can inspect the methodology and active approved weights. There is no numeric demonstration in this spec because policy values remain unset.

## Privacy and Q7 integration

A ranking can disclose private information even without returning a file. Do not compute a publicly visible score, grade badge, sort position or bonus from gated records unless that derived disclosure has separate explicit publication authority. Q7 grants do not confer publication rights.

For an authenticated private comparison, require current Q7 access to every private input used in the score and explanation. Resolve these permissions server-side before computation and again before release. No missing-data label may reveal the existence, filename or count of another supplier's hidden records; use a generic "Authorized evidence unavailable" explanation. Different viewers can have different authorized comparison cohorts, which the UI must state without identifying hidden records.

Private results use no-store responses and no shared result cache. Audit evaluation against actor, requirement, policy and source versions without copying private content or signed storage URLs. The match engine never reads Q7 storage directly to bypass authorization. Public exports, structured data, sitemaps, analytics and search must not receive private scores or private evidence-derived fields. Grant revocation or membership loss invalidates the next comparison request. Previously received results cannot be recalled.

## Gaming and integrity risks

| Risk | Required response |
| --- | --- |
| Reporting only favorable analytes | Fixed requirement panel; missing inputs make contamination score unavailable |
| Uploading a favorable report repeatedly | Deduplicate authenticated evidence identity/version; no document-count boosts |
| Selecting a favorable sample while hiding current adverse or conflicting evidence | Require approved sample/lot binding and authoritative amendment history; unresolved conflicts are unrankable; audit exclusions |
| Choosing a lenient category, jurisdiction or standard | Buyer requirement and reviewed standard mapping govern; mismatched use or matrix cannot borrow a grade |
| Treating a high detection limit as a clean result | Preserve qualifiers and limits; apply only an approved censoring/comparability policy |
| Copying TECRID badges or certificate images | Verify issuer, identity, current status and exact scope; no supplier self-attestation bonus |
| Replacing a revoked receipt with an old cached copy | Resolve current authoritative status before ranking; revoke/invalidate snapshots on lifecycle changes |
| Changing inventory identity or splitting listings to multiply results | Maintain physical-lot identity and lineage; group supplier results and deduplicate evidence; no count-based rewards |
| Paying for or manually editing a favorable rank | No purchase-based score input; policy amendments require versioned review and reproducible explanations |
| Inferring hidden results by changing filters | Use only authorized inputs; no private-derived public ranking or informative hidden-record counts |

## Future implementation and acceptance criteria

Proposed records for a later build are a reviewed standard mapping, immutable rank policy, verified evidence/certification references and a reproducible evaluation receipt. The receipt binds requirement, selected offer, actor visibility scope, source versions, component contributions, outcome/reasons, policy version and timestamp. It is an evaluation snapshot, not permanent eligibility. No SQL or schema changes belong to this PR.

A later authorized build must test:

- Missing configuration, absent grade mappings, unverified evidence, mocks and incomplete panels never produce verified scores.
- Lower contamination improves or preserves the contamination component under the approved mapping; fixed inputs plus a valid TECRID or ICS receipt add exactly the configured contribution. Copies do not multiply it.
- Wrong supplier/sample/lot/category/use/jurisdiction, mismatched units/species/basis, unsupported censoring and expired/revoked status are excluded with explicit reasons.
- Existing publication and commercial gates continue to govern, including immediate listing, match and reservation invalidation. A score cannot restore eligibility.
- Stable tie-breaks, supplier grouping, duplicate evidence handling and exact component sums are reproducible from the saved policy and source versions.
- Displayed explanation and sort order use the same evaluated snapshot. No hidden bonuses, rounded-value ordering or undocumented fallback weighting occurs.
- Two viewers with different grants cannot infer or access each other's gated inputs; revocation blocks the next request; public pages, metadata, exports and logs omit private-derived fields.
- FAKE fixtures exercise verified, unverified, incomplete, conflicting, revoked and incomparable cases. No real supplier data or invented regulatory values enter fixtures.

## Decisions for Elon before build

- Approve the proposed least-favorable-analyte utility and additive formula, or require contamination-first ordering so bonuses cannot reverse grade precedence. Recommend explicit approval of the tradeoff before assigning any weights.
- Approve the category/required-panel mappings, source editions, grade definitions or a separately labelled VLE grade policy, utility scales, numeric policy and all weights. Values remain TODO; missing means no score.
- Approve verification/certification authorities, scope checks, censoring and freshness rules. Existing TECRID production contract approval is still a prerequisite, not satisfied by this spec.
- Confirm cocoa-only initial scope and supplier grouping by identified best matching offered lot. Recommend preserving the current eligible-listing gate; a broader verification path is a separate future decision.
- Approve the authorized-viewer-only use of gated inputs and any separately proposed public derived disclosure. Recommend no public derived disclosure without explicit authority.

Stop point: one spec-only draft PR, STATUS with WAITING_ON: ELON SPEC PASS, then STOP. Spec acceptance must be followed by an explicit build order before Q8 implementation.
