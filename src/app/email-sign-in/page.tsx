import type { Metadata } from "next";
import { ExchangeShell } from "@/exchange/shell";
import { EmailSignInScreen } from "@/exchange/email-sign-in";

export const metadata: Metadata = {
  title: "Sign in by email link | VLE",
  description: "One screen. Email link sign-in with no password. Working sign-in is not in this round.",
  robots: { index: false, follow: false },
};

export default function EmailSignInPage() {
  return (
    <ExchangeShell current="/email-sign-in">
      <main id="main-content">
        <div className="x-wrap">
          <EmailSignInScreen />
        </div>
      </main>
    </ExchangeShell>
  );
}
