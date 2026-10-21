"use client";

import { useState } from "react";

export function EmailSignInScreen({ heading = "h1" }: { heading?: "h1" | "h2" }) {
  const [email, setEmail] = useState<string | null>(null);
  return (
    <section className="x-panel" data-testid="email-sign-in" aria-labelledby="sign-in-heading">
      <p className="x-kicker">One screen</p>
      {heading === "h1" ? (
        <h1 className="x-display" id="sign-in-heading">
          Sign in by email link
        </h1>
      ) : (
        <h2 className="x-h2" id="sign-in-heading">
          Sign in by email link
        </h2>
      )}
      <p>No password. Working sign-in is not in this round. This screen sends nothing.</p>
      {email ? (
        <p className="x-next" role="status">
          Next step: a one-time link would open for {email}. Sending email is not in this round.
        </p>
      ) : (
        <form
          className="x-form"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            const value = String(data.get("email") ?? "").trim();
            if (!value) return;
            setEmail(value);
          }}
        >
          <label htmlFor="sign-in-email">Email</label>
          <input id="sign-in-email" name="email" type="email" autoComplete="email" required />
          <button className="x-btn" type="submit">
            Email me a sign-in link
          </button>
        </form>
      )}
    </section>
  );
}
