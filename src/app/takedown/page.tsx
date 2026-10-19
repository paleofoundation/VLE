import { publicPageMetadata } from "@/lib/seo";
import { TakedownForm } from "./form";
import styles from "@/app/onboarding/onboarding.module.css";
export const metadata = publicPageMetadata("/takedown", "Listing takedown request | VLE", "Takedown requests are honoured within 5 business days. Contact marcus@vle.exchange.");
export default async function TakedownPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const p = (await searchParams).profile; const slug = typeof p === "string" && /^[a-z0-9-]+$/.test(p) ? p : "";
  return <main id="main-content" className={styles.page}><p className="eyebrow">Public listing support</p><h1>Request a takedown.</h1><p>Takedown requests are honoured within 5 business days. No account is required.</p><p>Email <a href="mailto:marcus@vle.exchange">marcus@vle.exchange</a> for listing or takedown help.</p><TakedownForm profileUrl={slug ? `https://vle.exchange/suppliers/${slug}` : ""} /></main>;
}
