"use client";

import { useState } from "react";

export function BrandLimits() {
  const [draft, setDraft] = useState("");
  const [limit, setLimit] = useState<number | null>(null);

  return (
    <div data-testid="brand-limits">
      <form
        className="x-form x-limit"
        onSubmit={(event) => {
          event.preventDefault();
          const value = draft.trim();
          const parsed = Number(value);
          setLimit(value && !Number.isNaN(parsed) ? parsed : null);
        }}
      >
        <p>
          A brand saves its own limits. Lots that meet them are marked. Saving a limit here updates the marks on this screen. Account saving is not in this round.
        </p>
        <label htmlFor="lead-limit">Lead under</label>
        <input id="lead-limit" inputMode="decimal" value={draft} onChange={(event) => setDraft(event.target.value)} />
        <button className="x-btn" type="submit">
          Save limit
        </button>
      </form>
      <p>{limit == null ? "No limit is saved on this screen." : `Lead under ${limit} is saved on this screen.`}</p>
      <p>No lots are on file, so there is nothing to mark. Lab results pending.</p>
    </div>
  );
}
