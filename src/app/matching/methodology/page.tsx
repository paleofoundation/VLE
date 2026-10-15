import Link from "next/link";
import { publicPageMetadata } from "@/lib/seo";
import { MATCH_METHODOLOGY_PATH, MATCH_SCOPE_COPY, MATCH_TIE_COPY } from "@/matching/copy";
import styles from "@/matching/explanation.module.css";

export const metadata = publicPageMetadata(
  MATCH_METHODOLOGY_PATH,
  "Matching methodology | Verified Lot Exchange",
  "How comparable cocoa offers are ordered by verified contamination evidence, with verification and certification used only to break equal-grade ties.",
);

export default function MatchingMethodologyPage() {
  return (
    <main id="main-content" className={styles.page}>
      <p className="eyebrow">Matching methodology</p>
      <h1>The offered lot comes first.</h1>
      <p>VLE matching compares identified cocoa powder offers against the same buyer requirement and frozen profile. It does not grade a supplier&apos;s whole production.</p>
      <aside className={styles.note} aria-label="Ranking availability">
        <strong>No approved grade mapping</strong>
        <p>Production grade mappings and ranking policy values are unset in this build. No contamination score is available until the required policy and verification settings are approved. This page describes the method; it does not show live ranks.</p>
      </aside>

      <section aria-labelledby="order-heading">
        <h2 id="order-heading">Contamination evidence determines the order.</h2>
        <ol>
          <li>The existing listing and requirement gates must pass. Product, frozen profile, quantity unit and available quantity must match. TECRID evidence remains required for eligibility.</li>
          <li>The same complete analyte panel applies to every comparable offer. Each result must have a current, verified sample and lot binding and an applicable reviewed grade mapping.</li>
          <li>The least favorable grade utility in that panel is the offer&apos;s contamination utility, Q. Higher Q is ordered first. Raw concentrations across different substances are never averaged.</li>
          <li>{MATCH_TIE_COPY} The configured contributions are added into B and compared only when Q is equal.</li>
          <li>When Q and B are equal, offers share a rank. Supplier, physical-lot and offer identifiers provide a repeatable display order only.</li>
        </ol>
        <p>A verification or certification contribution can never move a worse contamination grade above a better one. TECRID is already an eligibility requirement, so its contribution does not differentiate otherwise equally verified offers in the current eligible cohort.</p>
      </section>

      <section aria-labelledby="policy-heading">
        <h2 id="policy-heading">A reviewed policy, with no assumed thresholds.</h2>
        <p>The required panel, source editions, grade definitions, utility scale, numeric policy, tie contributions and evidence freshness rules must all be approved together. Missing or invalid settings leave ranking disabled.</p>
        <p>Grade utilities are labelled <strong>VLE ranking policy</strong>. A published maximum level does not automatically define a grade scale, and VLE does not attribute its utility mapping to a regulator. If a regulatory limit has not been mapped, the explanation says so.</p>
        <p>Each evaluated result shows the policy version and settings used. Source values retain their reported units, species, basis, matrix, method and detection or quantification limits. This build does not convert measurements or infer missing species.</p>
      </section>

      <section aria-labelledby="verification-heading">
        <h2 id="verification-heading">Verification must be current and in scope.</h2>
        <p>A supplier assertion, uploaded PDF or badge is not verification. TECRID evidence must authenticate the expected sample and evidence version under an approved contract and freshness policy. Mock receipts cannot verify live ranking evidence.</p>
        <p>ICS certification contributes only after a current authority check confirms the holder, program, category, profile and standard scope. The certification connection in this build returns unavailable, so it contributes no bonus. Uploading certificate copies does not change that state.</p>
        <p>A category certification describes a standard per product category with scheduled retesting. It does not replace lot identity, sample binding or the existing listing gate.</p>
      </section>

      <section aria-labelledby="unranked-heading">
        <h2 id="unranked-heading">Incomplete evidence stays unranked.</h2>
        <p>A missing required analyte, incompatible unit or basis, unresolved evidence conflict, unverified binding, revoked receipt or stale status means no contamination score and no ordinal rank. These offers stay in a separate unranked group if their existing visibility and listing gates allow them to appear.</p>
        <p>Censored, non-detect and detection-limit-only results are unrankable in this build. They are never replaced with zero. An incomplete panel is never made favorable by dropping a missing result.</p>
      </section>

      <section aria-labelledby="scope-heading">
        <h2 id="scope-heading">The explanation belongs to one offer.</h2>
        <p>Supplier results show the best matching offered lot, with its exact identifier. Other eligible matching lots can be expanded separately. Repeated listings or report copies do not add bonuses or supplier rows.</p>
        <p>The result explanation records the requirement, policy version, evaluation time, original measurements, source editions, verification status and contributions. It is a snapshot of that comparison, not permanent listing eligibility.</p>
        <p>{MATCH_SCOPE_COPY}</p>
      </section>

      <section aria-labelledby="privacy-heading">
        <h2 id="privacy-heading">Only authorized public evidence is used here.</h2>
        <p>This build excludes gated evidence from computation and explanation. Access to a private document would not by itself authorize a public score, grade, bonus or ordering derived from it. Unavailable authorized evidence is described generically.</p>
        <p>The public methodology page contains no supplier results, evidence fixtures or private record details. A future private comparison requires its own server authorization checks before computation and before release.</p>
      </section>
      <Link className="textLink" href="/">Return to Verified Lot Exchange</Link>
    </main>
  );
}
