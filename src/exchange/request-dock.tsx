"use client";

import { useState, type FormEvent } from "react";

const kinds = [
  { id: "sample", label: "Request a sample" },
  { id: "quote", label: "Request a quote" },
  { id: "document", label: "Request a document" },
] as const;

type Kind = (typeof kinds)[number]["id"];

type Answers = { volume: string; timing: string; use: string };

export function RequestDock() {
  const [kind, setKind] = useState<Kind | null>(null);
  const [sent, setSent] = useState<Answers | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const volume = String(formData.get("volume") ?? "").trim();
    const timing = String(formData.get("timing") ?? "").trim();
    const use = String(formData.get("use") ?? "").trim();
    if (!volume || !timing || !use || !kind) return;
    setSent({ volume, timing, use });
  }

  const active = kinds.find((item) => item.id === kind);

  return (
    <aside className="x-dock" id="requests" data-testid="request-dock" aria-label="Requests">
      <h2>Requests</h2>
      <div className="x-dock-actions">
        {kinds.map((item) => (
          <button
            key={item.id}
            className={kind === item.id || (kind === null && item.id === "sample") ? "x-btn" : "x-btn-secondary"}
            type="button"
            aria-pressed={kind === item.id}
            onClick={() => {
              setKind(item.id);
              setSent(null);
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      {kind && !sent ? (
        <form className="x-form" onSubmit={submit}>
          <p>A few questions come before this {active?.label.toLowerCase()}.</p>
          <label htmlFor="request-volume">Volume</label>
          <input id="request-volume" name="volume" required />
          <label htmlFor="request-timing">Timing</label>
          <input id="request-timing" name="timing" required />
          <label htmlFor="request-use">Intended use</label>
          <input id="request-use" name="use" required />
          <button className="x-btn" type="submit">
            Continue
          </button>
        </form>
      ) : null}
      {sent && active ? (
        <p className="x-next" role="status" data-testid="request-next">
          Next step: {active.label} is recorded on this screen. Volume {sent.volume}. Timing {sent.timing}. Intended use {sent.use}. A person follows up from here. Email is not in this round.
        </p>
      ) : null}
    </aside>
  );
}
