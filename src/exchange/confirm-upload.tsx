"use client";

import { useState } from "react";
import { exampleLots } from "./example-data";

const draft = exampleLots[0]?.results[0];

export function ConfirmUpload() {
  const [fileName, setFileName] = useState("");
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [published, setPublished] = useState(false);

  if (!draft) return null;

  const fields = [
    ["Analyte", draft.analyte],
    ["Value", draft.value],
    ["Unit", draft.unit],
    ["Limit", draft.limit],
    ["Method", draft.method],
    ["Lab", draft.lab],
    ["Date", draft.date],
    ["Plain words", draft.plain],
  ] as const;

  return (
    <section className="x-panel" data-testid="confirm-upload" aria-labelledby="confirm-heading">
      <h3 className="x-h3" id="confirm-heading">
        Lab PDF confirmation
      </h3>
      <p>A supplier uploads a lab PDF. The site drafts the results table. The supplier confirms each value before it shows.</p>
      <p>Real PDF reading is not in this round. The draft below is EXAMPLE data, not a reading of a file.</p>
      <label htmlFor="lab-pdf">Lab PDF</label>
      <input
        id="lab-pdf"
        type="file"
        accept="application/pdf"
        onChange={(event) => {
          setFileName(event.target.files?.[0]?.name ?? "");
          setPublished(false);
        }}
      />
      {fileName ? <p>The file stays on this device: {fileName}. It is not read.</p> : null}
      <ul className="x-cert-list">
        {fields.map(([label, value]) => (
          <li key={label}>
            <label className="x-check">
              <input
                type="checkbox"
                checked={Boolean(checked[label])}
                onChange={(event) => {
                  setChecked((current) => ({ ...current, [label]: event.target.checked }));
                  setPublished(false);
                }}
              />
              <span>
                Confirm {label}: {value}
              </span>
            </label>
          </li>
        ))}
      </ul>
      <button className="x-btn" type="button" disabled={!fields.every(([label]) => checked[label])} onClick={() => setPublished(true)}>
        Confirm values
      </button>
      {published ? (
        <p className="x-next" role="status">
          Next step: the confirmed EXAMPLE values would be the ones that show on the lot. Publishing is not in this round.
        </p>
      ) : null}
    </section>
  );
}
