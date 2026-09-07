"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function NominationError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main id="main-content" className="accessPage">
      <section className="accessCard nominationErrorCard" aria-labelledby="nomination-error-heading">
        <span className="mono">NOMINATION / ACTION REQUIRED</span>
        <h1 id="nomination-error-heading">The intake was not changed.</h1>
        <p>VLE could not load or save this private nomination. No lot was advanced, sampled, qualified, or published.</p>
        <div className="accessBoundary"><strong>Safe failure boundary.</strong><span>Retry once. If the state remains unavailable, return to the operations board and review the pilot references before entering the facts again.</span></div>
        <div className="accessActions"><button className="button buttonDark" type="button" onClick={reset}>Retry nomination</button><Link className="textLink" href="/ops">Operations board</Link></div>
      </section>
    </main>
  );
}
