"use client";

import { useState } from "react";

export function ConfirmUpload() {
  const [fileName, setFileName] = useState("");

  return (
    <section className="x-panel" data-testid="confirm-upload" aria-labelledby="confirm-heading">
      <h3 className="x-h3" id="confirm-heading">
        Lab PDF confirmation
      </h3>
      <p>A supplier uploads a lab PDF. The site drafts the results table. The supplier confirms each value before it shows.</p>
      <p>Real PDF reading is not in this round. Lab results pending. There are no drafted values to confirm.</p>
      <label htmlFor="lab-pdf">Lab PDF</label>
      <input
        id="lab-pdf"
        type="file"
        accept="application/pdf"
        onChange={(event) => {
          setFileName(event.target.files?.[0]?.name ?? "");
        }}
      />
      {fileName ? <p>The file stays on this device: {fileName}. It is not read. Lab results pending.</p> : null}
      <button className="x-btn" type="button" disabled>
        Confirm values
      </button>
    </section>
  );
}
