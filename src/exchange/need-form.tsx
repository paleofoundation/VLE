"use client";

import { useState } from "react";
import { NEED_LINE } from "./copy";

export function NeedForm({ found }: { found: number }) {
  const [sent, setSent] = useState<{ need: string; volume: string; timing: string; use: string } | null>(null);
  return (
    <section className="x-section" data-testid="empty-search" aria-labelledby="need-heading">
      {found === 0 ? <p>Nothing on the example list matched.</p> : <p>This search found little.</p>}
      <h2 id="need-heading">{NEED_LINE}</h2>
      {sent ? (
        <p className="x-next" role="status">
          Next step: we have what you need ({sent.need}), volume {sent.volume}, timing {sent.timing}, and intended use {sent.use}. A person follows up from this note. Email is not in this round.
        </p>
      ) : (
        <form
          className="x-form"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            const need = String(data.get("need") ?? "").trim();
            const volume = String(data.get("volume") ?? "").trim();
            const timing = String(data.get("timing") ?? "").trim();
            const use = String(data.get("use") ?? "").trim();
            if (!need || !volume || !timing || !use) return;
            setSent({ need, volume, timing, use });
          }}
        >
          <label htmlFor="need-what">What you need</label>
          <input id="need-what" name="need" required />
          <label htmlFor="need-volume">Volume</label>
          <input id="need-volume" name="volume" required />
          <label htmlFor="need-timing">Timing</label>
          <input id="need-timing" name="timing" required />
          <label htmlFor="need-use">Intended use</label>
          <input id="need-use" name="use" required />
          <button className="x-btn" type="submit">
            Continue
          </button>
        </form>
      )}
    </section>
  );
}
