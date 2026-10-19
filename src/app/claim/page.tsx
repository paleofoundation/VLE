import Link from "next/link";
import { listSuppliers } from "@/lib/public-listings";
import { publicPageMetadata } from "@/lib/seo";
import styles from "@/components/listing/directory.module.css";
export const dynamic = "force-dynamic";
export const metadata = publicPageMetadata("/claim", "Claim your supplier profile | VLE", "Find a public supplier listing and submit an ownership claim for operations review.");
export default async function ClaimIndex({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = (await searchParams).q; const profiles = (await listSuppliers({ q: typeof q === "string" ? q.slice(0,100) : undefined })).filter((p) => p.claimStatus !== "CLAIMED" && p.listingSource === "PUBLIC_DOCUMENTS");
  return <main id="main-content" className={styles.page}><header className={styles.hero}><p className="eyebrow">Company ownership</p><h1>Claim your supplier profile.</h1><p>Claims use your verified account email. Matching company domains enter the operations confirmation queue; other claims need a proof note.</p></header><form method="get" className={styles.filters}><label>Find your company<input name="q" defaultValue={typeof q === "string" ? q : ""} maxLength={100} /></label><button className="button buttonDark">Search profiles</button></form><div className={styles.cards}>{profiles.map((p) => <article key={p.id} className={styles.card}><h2>{p.displayName}</h2><p>{p.country}</p><Link className="textLink" href={`/claim/${p.slug}`}>Claim this profile</Link></article>)}</div>{!profiles.length ? <p>No unclaimed profiles match your search.</p> : null}<p>Listings and claims: <a href="mailto:marcus@vle.exchange">marcus@vle.exchange</a>.</p></main>;
}
