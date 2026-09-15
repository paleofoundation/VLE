export function ExampleProfileNotice({ tone = "light" }: { tone?: "light" | "dark" }) {
  return (
    <aside className={`exampleProfileNotice exampleProfileNotice${tone === "dark" ? "Dark" : "Light"}`} aria-label="Pilot profile limitation">
      <span className="mono">EXAMPLE LIMITS ONLY</span>
      <p><strong>The current cocoa and avocado Profile limits remain EXAMPLE pending an approved replacement frozen Profile version.</strong> The demo window through 14 September 2026 did not authorize production use. These are workflow-validation values—not regulatory or safety standards. Any supplier or lot labeled “Demo” is demonstration data, not evidence of available qualified inventory. VLE never invents or silently edits limits.</p>
    </aside>
  );
}
