export function ExampleProfileNotice({ tone = "light" }: { tone?: "light" | "dark" }) {
  return (
    <aside className={`exampleProfileNotice exampleProfileNotice${tone === "dark" ? "Dark" : "Light"}`} aria-label="Pilot profile limitation">
      <span className="mono">EXAMPLE LIMITS ONLY</span>
      <p><strong>The current cocoa and avocado Profile limits remain EXAMPLE through 14 September 2026.</strong> They are workflow-validation values—not regulatory or safety standards. Any supplier or lot labeled “Demo” is demonstration data, not evidence of available qualified inventory. Production use requires an approved replacement frozen Profile version; VLE never invents or silently edits limits.</p>
    </aside>
  );
}
