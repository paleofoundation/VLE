import "server-only";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { memberships, organizations, supplierProfiles, users } from "@/db/schema";
import { onboardingSchema } from "@/domain/onboarding";
import { supplierSlug } from "@/domain/public-listings";
import { appendAuditEvent } from "./audit";
export type SignupIdentity = { clerkUserId: string; email: string | null; displayName: string; emailVerified: boolean };
export async function completeOnboarding(identity: SignupIdentity, input: unknown) {
  if (!identity.email || !identity.emailVerified) throw new Error("Verify your primary email in your account before continuing.");
  const data = onboardingSchema.parse(input);
  return getDb().transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${identity.clerkUserId}))`);
    const existing = await tx.select({ role: memberships.role }).from(memberships).innerJoin(users, eq(memberships.userId, users.id)).where(eq(users.clerkUserId, identity.clerkUserId));
    if (existing.length) return existing.some((r) => r.role === "SUPPLIER") ? "/supplier" : "/buyer";
    const [user] = await tx.insert(users).values({ clerkUserId: identity.clerkUserId, email: identity.email!, displayName: identity.displayName }).onConflictDoUpdate({ target: users.clerkUserId, set: { displayName: identity.displayName } }).returning();
    const slug = `${supplierSlug(data.companyName)}-${randomUUID().slice(0, 8)}`;
    const [org] = await tx.insert(organizations).values({ name: data.companyName, slug, kind: data.role }).returning();
    await tx.insert(memberships).values({ userId: user.id, organizationId: org.id, role: data.role, companyRole: data.companyRole });
    if (data.role === "SUPPLIER") await tx.insert(supplierProfiles).values({ organizationId: org.id, slug, displayName: data.companyName, website: data.website, country: data.country, categories: data.categories, listingSource: "MEMBER", claimStatus: "CLAIMED", hidden: true });
    await appendAuditEvent(tx, { userId: user.id, organizationId: org.id, roles: [data.role] }, { eventType: "SELF_SERVE_ONBOARDING", entityType: "organization", entityId: org.id, data: { kind: data.role, website: data.website, country: data.country, companyRole: data.companyRole } });
    return data.role === "SUPPLIER" ? "/supplier/certifications?onboarding=1" : "/buyer";
  });
}
