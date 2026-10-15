import Link from "next/link";
import { kasandrinosPreviewTour, PREVIEW_NOTICE, type PreviewAnalyteRow, type PreviewRailStep } from "@/domain/kasandrinos-preview";

export function PreviewBanner() {
  return (
    <aside className="previewBanner" role="status">
      <strong>{PREVIEW_NOTICE}</strong>
      <p>This pull-request preview is not indexed, not a qualification, and not on the public shelf. Production behavior is unchanged.</p>
    </aside>
  );
}

export function PreviewTour({ current }: { current: string }) {
  const index = kasandrinosPreviewTour.findIndex((step) => step.path === current);
  const next = index >= 0 ? kasandrinosPreviewTour[index + 1] : undefined;
  return (
    <nav className="previewTour" aria-label="Preview walkthrough">
      <ol>
        {kasandrinosPreviewTour.map((step, stepIndex) => (
          <li key={step.path} className={step.path === current ? "isCurrent" : undefined}>
            <Link href={step.path} aria-current={step.path === current ? "page" : undefined}>
              <span>{String(stepIndex + 1).padStart(2, "0")}</span>
              {step.title}
            </Link>
          </li>
        ))}
      </ol>
      {index === -1 ? <p>This page stays inside the preview. Continue the main path from the steps above.</p> : next ? <Link className="button buttonDark" href={next.path}>Continue to {next.title}</Link> : <p>End of the preview path. Nothing here is live.</p>}
    </nav>
  );
}

export function LotStateRail({ steps }: { steps: readonly PreviewRailStep[] }) {
  return (
    <ol className="previewRail" aria-label="Lot state">
      {steps.map((step, index) => (
        <li key={step.label} className={step.state === "now" ? "isNow" : "isLocked"}>
          <span>{String(index + 1).padStart(2, "0")}</span>
          <div>
            <strong>{step.label}</strong>
            <p>{step.detail}</p>
          </div>
          <b>{step.state === "now" ? "Next step" : "Not reached"}</b>
        </li>
      ))}
    </ol>
  );
}

export function AnalyteTable({ rows }: { rows: readonly PreviewAnalyteRow[] }) {
  return (
    <div className="previewTableWrap">
      <table className="previewTable">
        <caption>Reported results. The Light Labs spec column is the lab&apos;s own spec, not a VLE limit and not a regulatory limit.</caption>
        <thead>
          <tr>
            <th scope="col">Analyte</th>
            <th scope="col">LOQ</th>
            <th scope="col">Light Labs spec</th>
            <th scope="col">Result</th>
            <th scope="col">Certificate status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.analyte}>
              <th scope="row">{row.analyte}</th>
              <td>{row.loq}</td>
              <td>{row.lightLabsSpec}</td>
              <td>{row.result}</td>
              <td>{row.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MissingFacts() {
  const facts = ["Quantity", "Quantity unit", "Stocked location", "Country", "Owner of record", "Supplier organization"];
  return (
    <dl className="factGrid previewFacts">
      {facts.map((fact) => (
        <div key={fact}><dt>{fact}</dt><dd>Not on the certificate</dd></div>
      ))}
    </dl>
  );
}
