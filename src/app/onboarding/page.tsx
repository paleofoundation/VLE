import Link from "next/link";
import { redirect } from "next/navigation";
import { resolveCurrentAccess } from "@/lib/current-actor";
import { listSuppliers } from "@/lib/public-listings";
import { safeNext, websiteEmailMatches } from "@/domain/onboarding";
import { OnboardingForm } from "./form";
import styles from "./onboarding.module.css";
export const dynamic = "force-dynamic";
export const metadata = { title: "Choose your VLE workspace", robots: { index: false, follow: false } };
export default async function OnboardingPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const access = await resolveCurrentAccess(); if (access.status === "SIGNED_OUT") redirect("/sign-in");
  if (access.status === "ACTIVE") redirect(access.actor.roles.includes("SUPPLIER") ? "/supplier" : access.actor.roles.some((r) => r === "ADMIN" || r === "OPS") ? "/ops" : "/buyer");
  const params = await searchParams;
  const matches = access.identity.emailVerified ? (await listSuppliers()).filter((s) => s.claimStatus === "UNCLAIMED" && websiteEmailMatches(s.website, access.identity.email)) : [];
  return <main id="main-content" className={styles.page}><p className="eyebrow">Welcome to VLE</p><h1>Set up your workspace.</h1><p>List ingredients as a supplier, or source ingredients as a brand. Viewing public documents is free.</p>
    {matches.map((s) => <aside className={styles.notice} key={s.id}>We found a public listing for your company. <Link href={`/claim/${s.slug}`}>Claim it?</Link></aside>)}
    <OnboardingForm initialRole={params.as === "brand" ? "BUYER" : "SUPPLIER"} next={safeNext(params.next)} />
  </main>;
}
