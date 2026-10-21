"use client";

import { useState } from "react";
import { CLAIM_LINK, TAKEDOWN_LINK } from "./copy";

function ShortRequest({ id, title, detailLabel }: { id: string; title: string; detailLabel: string }) {
  const [sent, setSent] = useState<{ name: string; email: string; detail: string } | null>(null);
  return (
    <section id={id} className="x-anchor" aria-labelledby={`${id}-heading`}>
      <h3 className="x-h3" id={`${id}-heading`}>
        {title}
      </h3>
      {sent ? (
        <p className="x-next" role="status">
          Next step: {title} stays on this screen for {sent.name}, {sent.email}. Detail: {sent.detail}. Email is not in this round.
        </p>
      ) : (
        <form
          className="x-form"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            const name = String(data.get("name") ?? "").trim();
            const email = String(data.get("email") ?? "").trim();
            const detail = String(data.get("detail") ?? "").trim();
            if (!name || !email || !detail) return;
            setSent({ name, email, detail });
          }}
        >
          <label htmlFor={`${id}-name`}>Your name</label>
          <input id={`${id}-name`} name="name" required />
          <label htmlFor={`${id}-email`}>Email</label>
          <input id={`${id}-email`} name="email" type="email" required autoComplete="email" />
          <label htmlFor={`${id}-detail`}>{detailLabel}</label>
          <textarea id={`${id}-detail`} name="detail" required />
          <button className="x-btn" type="submit">
            Continue
          </button>
        </form>
      )}
    </section>
  );
}

export function ProfileClaims() {
  return (
    <div className="x-section" data-testid="profile-claims">
      <p>
        <a className="x-text-link" href="#claim">
          {CLAIM_LINK}
        </a>
        {" · "}
        <a className="x-text-link" href="#takedown">
          {TAKEDOWN_LINK}
        </a>
      </p>
      <div className="x-doc-list">
        <ShortRequest id="claim" title={CLAIM_LINK} detailLabel="Your relationship to this profile" />
        <ShortRequest id="takedown" title={TAKEDOWN_LINK} detailLabel="What should come down" />
      </div>
    </div>
  );
}
