"use client";

import { useState } from "react";
import { Badge, ResultsTable } from "./ui";
import type { ExampleLot } from "./example-data";

const EXAMPLE_LIMIT = 0.05;

function meetsLimit(lot: ExampleLot, limit: number | null) {
  if (limit == null || Number.isNaN(limit)) return null;
  const lead = lot.results.find((row) => row.analyte === "Lead");
  if (!lead) return null;
  if (lead.leadNumber == null) return true;
  return lead.leadNumber < limit;
}

export function BrandLimits({ lots }: { lots: ExampleLot[] }) {
  const [draft, setDraft] = useState(String(EXAMPLE_LIMIT));
  const [limit, setLimit] = useState<number | null>(EXAMPLE_LIMIT);

  return (
    <div data-testid="brand-limits">
      <form
        className="x-form x-limit"
        onSubmit={(event) => {
          event.preventDefault();
          const value = draft.trim();
          setLimit(value ? Number(value) : null);
        }}
      >
        <p>
          A brand saves its own limits. Lots that meet them are marked. This screen starts with an EXAMPLE limit: lead under EXAMPLE {EXAMPLE_LIMIT}. It is kept in this browser only. Account saving is not in this round.
        </p>
        <label htmlFor="lead-limit">Lead under</label>
        <input id="lead-limit" inputMode="decimal" value={draft} onChange={(event) => setDraft(event.target.value)} />
        <button className="x-btn" type="submit">
          Save limit
        </button>
      </form>
      {lots.map((lot) => {
        const mark = meetsLimit(lot, limit);
        return (
          <article key={lot.id} className="x-lot" id={lot.id}>
            <div className="x-lot-head">
              <h3 className="x-h3">{lot.name}</h3>
              <Badge tone="accent">EXAMPLE</Badge>
              {mark === true ? <Badge tone="accent">Meets your limit</Badge> : null}
              {mark === false ? <Badge>Outside your limit</Badge> : null}
            </div>
            <ResultsTable lot={lot} />
          </article>
        );
      })}
    </div>
  );
}
