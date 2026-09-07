type PilotAudience = "exchange" | "supplier" | "buyer" | "laboratory" | "access";

const statusByAudience = {
  exchange: [
    ["Live pilot", "Managed onboarding"],
    ["Entry", "Supplier · Buyer · Lab"],
    ["Profile mode", "EXAMPLE through 14 Sep"],
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
          <strong>{value}</strong>
        </div>
      ))}
    </section>
  );
}
