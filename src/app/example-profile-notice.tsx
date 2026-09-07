export function ExampleProfileNotice({ tone = "light" }: { tone?: "light" | "dark" }) {
  return (
    <aside className={`exampleProfileNotice exampleProfileNotice${tone === "dark" ? "Dark" : "Light"}`} aria-label="Pilot profile limitation">
      <span className="mono">EXAMPLE LIMITS ONLY</span>
      <p><strong>The current cocoa and avocado Profile limits are pilot values for workflow validation.</strong> They are not regulatory or safety standards. Production use requires an approved replacement frozen Profile version; VLE never invents or silently edits limits.</p>
    </aside>
  );
}
