import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { resolveCurrentAccess } from "@/lib/current-actor";
import { getSupplier } from "@/lib/public-listings";
import { REQUEST_LABELS, REQUEST_TYPES, assertSupplierRequestType, type SupplierRequestType } from "@/domain/supplier-requests";
import { SupplierRequestForm } from "./form";
import styles from "@/app/onboarding/onboarding.module.css";
export const dynamic = "force-dynamic";
export const metadata = { title: "Send a supplier request | VLE", robots: { index: false, follow: false } };
export default async function NewSupplierRequest({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const p = await searchParams; const slug = typeof p.supplier === "string" ? p.supplier : "";
  const type: SupplierRequestType = typeof p.type === "string" && REQUEST_TYPES.includes(p.type as SupplierRequestType) ? p.type as SupplierRequestType : "DOCUMENT";
  const next = `/requests/new?${new URLSearchParams({ supplier: slug, type, ...(typeof p.lot === "string" ? { lot: p.lot } : {}) })}`;
  const access = await resolveCurrentAccess();
  if (access.status === "SIGNED_OUT") redirect(`/sign-up?as=brand&next=${encodeURIComponent(next)}`);
  if (access.status === "PENDING_MAPPING") redirect(`/onboarding?as=brand&next=${encodeURIComponent(next)}`);
  if (!access.actor.roles.includes("BUYER")) return <main id="main-content" className={styles.page}><h1>A brand account is required</h1><p>Use your brand workspace to send sourcing requests.</p><Link href="/suppliers">Browse suppliers</Link></main>;
  const supplier = await getSupplier(slug); if (!supplier) notFound();
  try { assertSupplierRequestType(supplier.listingSource, type); } catch { return <main id="main-content" className={styles.page}><h1>This request is unavailable</h1><Link href={`/suppliers/${slug}`}>Return to supplier</Link></main>; }
  return <main id="main-content" className={styles.page}><p className="eyebrow">Brand workspace</p><h1>{REQUEST_LABELS[type]}</h1><p>{supplier.displayName}</p>{type === "INVITE_SUPPLIER" ? <p>This goes to VLE operations. The supplier will not receive an automated message.</p> : <p>Your request appears in this supplier&apos;s VLE inbox.</p>}<SupplierRequestForm supplierProfileId={supplier.id} type={type} lotId={typeof p.lot === "string" ? p.lot : null} /></main>;
}
