import type { Metadata } from "next";
import { REVOCATION_NOTICE } from "@/gated/model";
import { GatedDesk } from "./desk";
export const metadata: Metadata = {
  title: "Private document access",
  robots: { index: false, follow: false },
};
export default function GatedPage() {
  return (
    <main id="main-content" className="commercialPage">
      <h1>Private document access</h1>
      <p>{REVOCATION_NOTICE}</p>
      <p>
        Access approval does not verify a document or establish certification.
        An owner also needs a redeemed code to read files.
      </p>
      <GatedDesk />
    </main>
  );
}
