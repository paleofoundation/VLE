"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, useReducer } from "react";
import { MATCH_METHODOLOGY_PATH } from "../matching/copy";
import { initialPreparationState, PREPARATION_STEPS, preparationReducer } from "./tecrid-nudge-state";
import styles from "./tecrid-nudge.module.css";

type NudgeProps = { surface: "onboarding" | "profile" };

/** A page change or reload starts a new visit; no account or browser storage is used. */
export function TecridVerificationNudge({ surface }: NudgeProps) {
  const pathname = usePathname();
  return <TecridPreparationPrompt key={`${pathname}:${surface}`} surface={surface} />;
}

function TecridPreparationPrompt({ surface }: NudgeProps) {
  const [state, dispatch] = useReducer(preparationReducer, undefined, initialPreparationState);
  const id = useId();
  const completed = state.checked.length;
  const total = PREPARATION_STEPS.length;

  return (
    <aside className={`tecridNudge ${styles.reminder} ${state.dismissed ? styles.collapsed : ""}`} id="tecrid-verification" aria-labelledby={`${id}-heading`}>
      <div className={styles.header}>
        <div>
          <p className="eyebrow">Optional preparation step</p>
          <h2 id={`${id}-heading`}>Prepare for TECRID verification.</h2>
        </div>
        <button
          type="button"
          className={styles.toggle}
          aria-expanded={!state.dismissed}
          aria-controls={`${id}-content`}
          onClick={() => dispatch({ type: "toggle-reminder" })}
        >
          {state.dismissed ? "Show reminder" : "Dismiss for this visit"}
        </button>
      </div>
      <div id={`${id}-content`} hidden={state.dismissed}>
        {!state.dismissed ? (
          <div className={styles.content}>
            <div className={styles.copy}>
              <p>
                {surface === "onboarding"
                  ? "While you prepare your organization and offered lot, you can gather the information needed for TECRID verification. You can keep using VLE without completing this checklist."
                  : "Preparing your own offer? Use this checklist to get ready for TECRID verification. It belongs to your current visit and does not report this supplier's verification status."}
              </p>
              <p><strong>TECRID verification can break ties between offers with the same contamination grade.</strong> It does not move an offer above one with a better contamination grade.</p>
              <p>Current verified evidence and the existing listing gates still govern matching. Completing preparation, opening TECRID or attaching a file does not verify a supplier or qualify a lot.</p>
              <div className={styles.actions}>
                <a className="button buttonDark" href="https://tecrid.com/join" target="_blank" rel="noopener noreferrer">Open TECRID <span className={styles.small}>(new tab)</span></a>
                <Link className="textLink" href={MATCH_METHODOLOGY_PATH}>How matching uses verification</Link>
              </div>
              <p className={styles.small}>TECRID handles the verification process. This reminder does not submit a request or check verification status.</p>
            </div>
            <section className={styles.preparation} aria-labelledby={`${id}-preparation`}>
              <h3 id={`${id}-preparation`}>Your preparation this visit</h3>
              <p id={`${id}-progress`} className={styles.small} aria-live="polite">{completed} of {total} preparation items checked by you</p>
              <progress value={completed} max={total} aria-labelledby={`${id}-preparation ${id}-progress`}>{completed} of {total}</progress>
              <ul className={styles.checklist}>
                {PREPARATION_STEPS.map((step) => (
                  <li key={step.id}>
                    <label>
                      <input type="checkbox" checked={state.checked.includes(step.id)} onChange={() => dispatch({ type: "toggle", id: step.id })} />
                      <span>{step.label}</span>
                    </label>
                  </li>
                ))}
              </ul>
              <p className={styles.small}>
                {completed === total ? "Preparation checklist complete. This does not establish verification." : "Check items you have prepared. These are your notes, not a verification result."}
              </p>
            </section>
          </div>
        ) : null}
      </div>
      <p className={styles.state} role="status">
        {state.dismissed ? "Reminder dismissed for this visit. " : ""}
        Checklist and dismissal reset when you change pages or reload. They are not saved to a supplier profile.
      </p>
    </aside>
  );
}
