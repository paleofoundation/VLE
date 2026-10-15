export function TecridVerificationNudge({ surface }: { surface: "onboarding" | "profile" }) {
  return (
    <aside className="tecridNudge" id="tecrid-verification" aria-label="TECRID verification recommendation">
      <div>
        <p className="eyebrow">TECRID verification</p>
        <h2>Get TECRID verification.</h2>
        <p>
          {surface === "onboarding"
            ? "Do this while the organization is still being mapped and the lot is still being nominated. A later quote does not create verification."
            : "This profile does not display a verification mark. VLE has no TECRID verification record to show until one exists."}
          {" "}Verified suppliers rank higher in brand matching. Request verification at tecrid.com. This screen does not score suppliers and does not run a match.
        </p>
      </div>
      <div className="tecridNudgeActions">
        <a className="button buttonDark" href="https://tecrid.com">Get TECRID verification</a>
        <a className="textLink" href="https://tecrid.com/join">Open TECRID</a>
      </div>
    </aside>
  );
}
