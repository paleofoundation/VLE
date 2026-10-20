"use client";

import { useState, useSyncExternalStore } from "react";
import { POLL_BRAND, POLL_LINE, POLL_LOOKING, POLL_SUPPLIER } from "./copy";

const STORAGE_KEY = "vle-corner-poll";
const choices = [POLL_BRAND, POLL_SUPPLIER, POLL_LOOKING] as const;

function pollClosed() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

export function CornerPoll() {
  const storedClosed = useSyncExternalStore(() => () => {}, pollClosed, () => false);
  const [closedNow, setClosedNow] = useState(false);
  const [choice, setChoice] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);

  function close() {
    try {
      window.localStorage.setItem(STORAGE_KEY, "closed");
    } catch {
      /* The poll still closes for this view. */
    }
    setClosedNow(true);
  }

  function submit() {
    if (!choice) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ choice, note }));
    } catch {
      /* Saved for this view only. */
    }
    setDone(true);
  }

  if (storedClosed || closedNow) return null;

  return (
    <aside className="x-poll" aria-label="Optional poll" data-testid="poll">
      <button className="x-poll-close" type="button" onClick={close}>
        Not now
      </button>
      {done ? (
        <p>Thank you. This poll stays closed on this browser.</p>
      ) : (
        <>
          <p>{POLL_LINE}</p>
          <div className="x-poll-actions">
            {choices.map((item) => (
              <button key={item} className={choice === item ? "x-btn" : "x-btn-secondary"} type="button" aria-pressed={choice === item} onClick={() => setChoice(item)}>
                {item}
              </button>
            ))}
            <label htmlFor="poll-note">What should we know?</label>
            <input id="poll-note" value={note} onChange={(event) => setNote(event.target.value)} />
            <button className="x-btn" type="button" onClick={submit} disabled={!choice}>
              Send
            </button>
          </div>
        </>
      )}
    </aside>
  );
}
