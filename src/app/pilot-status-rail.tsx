import Link from "next/link";
import { Fragment } from "react";
import { homePersonas } from "./home-personas";
import styles from "./home.module.css";

type PilotAudience = "exchange" | "supplier" | "buyer" | "laboratory" | "access";

const statusByAudience = {
  exchange: [
    ["Live pilot", "Managed onboarding"],
    ["Entry", "Supplier · Buyer · Lab"],
    ["Profile mode", "EXAMPLE · approval pending"],
    ["Claim", "Lot-specific only"],
  ],
  supplier: [
    ["Pilot intake", "Reviewed access"],
    ["Bring", "Stocked lot facts"],
    ["Next gate", "Independent sample"],
    ["Boundary", "PDF/COA ≠ QUALIFIED"],
  ],
  buyer: [
    ["Pilot intake", "Reviewed access"],
    ["Bring", "Requirement + destination"],
    ["Match", "Eligible cocoa only"],
    ["Boundary", "Intent ≠ Order"],
  ],
  laboratory: [
    ["Onboarding", "Managed pilot"],
    ["Receive", "Sample + custody"],
    ["Evidence", "TECRID-bound"],
    ["Decision", "Recorded separately"],
  ],
  access: [
    ["Identity", "Clerk-authenticated"],
    ["Review", "Organization + role"],
    ["Authority", "Server-side mapping"],
    ["Visibility", "No data before approval"],
  ],
} as const satisfies Record<PilotAudience, readonly (readonly [string, string])[]>;

export function PilotStatusRail({ audience }: { audience: PilotAudience }) {
  return (
    <section className="pilotStatusRail" aria-label={`${audience} pilot status`}>
      {statusByAudience[audience].map(([label, value], index) => (
        <div key={label}>
          <span className="mono">{String(index + 1).padStart(2, "0")} / {label}</span>
          {audience === "exchange" && label === "Entry" ? (
            <strong className={styles.personaEntry}>
              {homePersonas.map((persona, personaIndex) => (
                <Fragment key={persona.id}>
                  {personaIndex > 0 ? " · " : ""}
                  <Link href={`#${persona.id}`}>{persona.label}</Link>
                </Fragment>
              ))}
            </strong>
          ) : <strong>{value}</strong>}
        </div>
      ))}
    </section>
  );
}
