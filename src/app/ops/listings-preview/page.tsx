import { getCurrentPageActor } from "@/lib/page-actor";
import { NonMemberBanner, DocumentSourceLabel, LotStatusSteps, VerifiedBadge } from "@/components/listing";
import { notFound } from "next/navigation";
export const dynamic = "force-dynamic";
export default async function ListingsPreview() {
  const actor = await getCurrentPageActor();
  if (!actor.roles.some((r) => r === "OPS" || r === "ADMIN")) notFound();
  return <main id="main-content" style={{ maxWidth: 1100, margin: "60px auto", padding: 24 }}>
    <p className="eyebrow">Operations / component reference</p><h1>Public listing labels</h1>
    <NonMemberBanner slug="kasandrinos" />
    <h2>Document provenance</h2><DocumentSourceLabel domain="cdn.shopify.com" date="2026-10-19" />
    <DocumentSourceLabel domain="cdn.labdoor.io" date="2026-10-19" sourcePageUrl="https://www.transparentlabs.com/pages/third-party-tests" />
    <h2>Evidence boundary</h2><p>No badge appears without a current evidence record.</p><VerifiedBadge evidence={null} />
    <h2>Lot progress without records</h2><LotStatusSteps />
    <p>Listings and takedowns: <a href="mailto:marcus@vle.exchange">marcus@vle.exchange</a>. Takedown requests are honoured within 5 business days.</p>
  </main>;
}
