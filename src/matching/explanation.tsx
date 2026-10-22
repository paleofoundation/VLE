import Link from "next/link";
import { MATCH_METHODOLOGY_PATH, MATCH_SCOPE_COPY, MATCH_TIE_COPY } from "./copy";
import { compareDecimal } from "./policy";
import type { EvaluationReceipt, SupplierMatchGroup } from "./types";
import styles from "./explanation.module.css";

/**
 * Render only a fresh, server-authorized evaluation snapshot. Never pass raw
 * evidence, gated records or a previously cached evaluation to this component.
 * The calling server boundary must recheck eligibility and viewing authority.
 */
export function MatchResultExplanation({ receipt, bestOfferedLot = true }: { receipt: EvaluationReceipt; bestOfferedLot?: boolean }) {
  if (receipt.outcome === "INELIGIBLE") return null;
  if (receipt.viewer.visibility !== "PUBLIC_ONLY") {
    return <p>Authorized evidence unavailable</p>;
  }

  const ranked = receipt.outcome === "RANKED" && receipt.q !== null && receipt.bonus !== null;
  const policy = receipt.policy;
  const evidenceUnavailable = receipt.reasons.includes("Authorized evidence unavailable");
  const determining = ranked ? receipt.analytes.filter((analyte) => compareDecimal(analyte.utility, receipt.q!) === 0) : [];

  return (
    <article className={styles.card} aria-label={`Matching explanation for offered lot ${receipt.offer.lotId}`}>
      <p className="eyebrow">{bestOfferedLot ? "Best matching offered lot" : "Other matching offered lot"}</p>
      <h3>Offered lot {receipt.offer.lotId}</h3>
      <p>Supplier {receipt.offer.supplierId} · Offer {receipt.offer.id}</p>
      <p className={styles.note}>
        {ranked ? <strong>{receipt.rank === null ? "Rankable offered lot" : `Rank ${receipt.rank} · ties share the same rank`}</strong> : <strong>Not ranked</strong>}
        {" "}{ranked ? MATCH_TIE_COPY : "No contamination score or ordinal rank is assigned."}
      </p>

      <dl className={styles.facts}>
        <div><dt>Requirement</dt><dd>{receipt.requirement.id}</dd></div>
        <div><dt>Frozen profile</dt><dd>{receipt.requirement.profileVersionId}</dd></div>
        <div><dt>Product scope</dt><dd>{receipt.requirement.productCode}</dd></div>
        <div><dt>Intended use and jurisdiction</dt><dd>{receipt.requirement.intendedUse} · {receipt.requirement.jurisdiction}</dd></div>
        <div><dt>Required quantity</dt><dd>{receipt.requirement.quantity} {receipt.requirement.quantityUnit}</dd></div>
        <div><dt>VLE ranking policy</dt><dd>{policy?.MATCH_POLICY_VERSION.id ?? "No approved grade mapping"}</dd></div>
        <div><dt>Evaluated at</dt><dd><time dateTime={receipt.evaluatedAt}>{receipt.evaluatedAt}</time></dd></div>
      </dl>

      {receipt.reasons.length > 0 ? (
        <section aria-label="Reasons this offer is not ranked">
          <h4>Evidence and policy limitations</h4>
          <ul>{(evidenceUnavailable ? ["Authorized evidence unavailable"] : receipt.reasons).map((reason, index) => <li key={`${index}-${reason}`}>{reason}</li>)}</ul>
        </section>
      ) : null}

      {ranked ? (
        <section aria-label="Ranking explanation">
          <dl className={styles.facts}>
            <div><dt>Contamination utility Q</dt><dd>{receipt.q}</dd></div>
            <div><dt>Equal-grade tie contribution B</dt><dd>{receipt.bonus}</dd></div>
            <div><dt>TECRID</dt><dd>{receipt.tecrid.status}; contribution {receipt.tecrid.contribution}</dd></div>
            <div><dt>ICS certification</dt><dd>{receipt.ics.status}; contribution {receipt.ics.contribution}</dd></div>
          </dl>
          <p>
            Q is the lowest utility across the complete required panel. Higher Q comes first.
            {" "}TECRID and ICS contributions cannot move an offer ahead of one with better contamination utility.
          </p>
          {determining.length > 0 ? <p>Determining analytes: {determining.map((analyte) => analyte.analyte).join(", ")}.</p> : null}
          <p>{receipt.tieBreak}. Equal Q and B remain tied; stable identifiers determine display order only.</p>
          {policy ? (
            <details className={styles.details}>
              <summary>Policy settings used for this evaluation</summary>
              <dl className={styles.facts}>
                <div><dt>Fixed required panel</dt><dd>{policy.MATCH_REQUIRED_ANALYTES.join(", ")}</dd></div>
                <div><dt>TECRID tie weight</dt><dd>{policy.MATCH_WEIGHT_TECRID}</dd></div>
                <div><dt>ICS tie weight</dt><dd>{policy.MATCH_WEIGHT_ICS_CERT}</dd></div>
                <div><dt>Numeric policy</dt><dd>{policy.MATCH_NUMERIC_POLICY.id}; displayed without rounding</dd></div>
                <div><dt>Freshness policy</dt><dd>{policy.MATCH_VERIFICATION_FRESHNESS_POLICY.id}</dd></div>
                <div><dt>Policy effective at</dt><dd>{policy.MATCH_POLICY_VERSION.effectiveAt}</dd></div>
              </dl>
              <p>Grade utilities are a VLE ranking policy. They are not a regulator&apos;s grade scale or a toxicological mixture calculation.</p>
              <ul>{Object.entries(policy.MATCH_GRADE_UTILITY).map(([grade, utility]) => <li key={grade}>{grade}: {utility}</li>)}</ul>
            </details>
          ) : null}
          {receipt.ics.reference ? <p>ICS reference: {receipt.ics.reference}; program: {receipt.ics.program}; standard: {receipt.ics.standardVersion}; status checked {receipt.ics.checkedAt}; valid until {receipt.ics.validUntil}.</p> : null}
        </section>
      ) : null}

      {!evidenceUnavailable && receipt.analytes.length > 0 ? (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <caption>Authorized public evidence and VLE grade mapping</caption>
            <thead><tr><th scope="col">Analyte and reported result</th><th scope="col">Measurement context</th><th scope="col">VLE ranking policy</th><th scope="col">Source mapping</th></tr></thead>
            <tbody>{receipt.analytes.map((analyte) => (
              <tr key={analyte.analyte}>
                <th scope="row">{analyte.analyte}<br />{analyte.value ?? "No measured value"} {analyte.unit}<br />{analyte.qualifier}</th>
                <td>{analyte.species}; {analyte.matrix}; {analyte.basis}<br />Method: {analyte.method}<br />LOD: {analyte.detectionLimit ?? "not reported"}<br />LOQ: {analyte.quantificationLimit ?? "not reported"}<br />{analyte.metadataVerification}</td>
                <td>{analyte.grade}{ranked ? <><br />Utility: {analyte.utility}</> : null}</td>
                <td>{analyte.sourceTitle}<br />{analyte.edition}; {analyte.locator}<br />{analyte.regulatoryMapping === "NO_REGULATORY_LIMIT_MAPPED" ? "No regulatory limit mapped" : "Reviewed source mapping"}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : null}

      {!evidenceUnavailable && receipt.sources.length > 0 ? (
        <details className={styles.details}>
          <summary>Evidence verification and sample binding</summary>
          <p>TECRID status: {receipt.tecrid.status}. These are references from the evaluated public evidence snapshot. No document link is inferred from a reference.</p>
          <ul className={styles.sources}>{receipt.sources.map((source) => (
            <li key={`${source.id}-${source.reportVersion}`}>
              <strong>{source.id}, report {source.reportVersion}</strong>
              <p>Sample {source.sampleCode}, bound to offered lot {receipt.offer.lotId}. Binding reference: {source.bindingReference}; reviewer: {source.bindingReviewedBy}.</p>
              <p>TECRID {source.tecridId}; issuer {source.issuer}; contract {source.contractVersion}. Issued {source.issuedAt}; verified {source.verifiedAt}; authentication {source.authenticationMethod}; key {source.authenticationKeyId ?? "not supplied"}; expires {source.expiresAt}.</p>
              <p>Current status checked {source.checkedAt}; status contract {source.statusContractVersion}; status authentication {source.statusAuthenticationMethod}; key {source.statusAuthenticationKeyId ?? "not supplied"}; verified {source.statusVerifiedAt}.</p>
              <p>Collected {source.collectedAt}; reported {source.reportedAt}. Evidence hash: <code>{source.payloadHash}</code>.</p>
            </li>
          ))}</ul>
        </details>
      ) : null}

      <p className={styles.subtle}>{MATCH_SCOPE_COPY}</p>
      <p className={styles.subtle}>This comparison uses authorized public evidence only. A different authorized view can have a different comparison set.</p>
      <Link className="textLink" href={MATCH_METHODOLOGY_PATH}>Read the matching methodology</Link>
    </article>
  );
}

export function SupplierMatchExplanation({ group }: { group: SupplierMatchGroup }) {
  const otherLots = group.otherLots.filter((receipt) => receipt.outcome !== "INELIGIBLE");
  return (
    <section aria-label={`Offered lots from supplier ${group.supplierId}`}>
      <MatchResultExplanation receipt={group.best} />
      {otherLots.length > 0 ? (
        <details className={styles.details}>
          <summary>Other eligible matching lots from this supplier</summary>
          {otherLots.map((receipt) => <MatchResultExplanation key={receipt.offer.id} receipt={receipt} bestOfferedLot={false} />)}
        </details>
      ) : null}
    </section>
  );
}
