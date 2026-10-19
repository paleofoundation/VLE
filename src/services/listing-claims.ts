import "server-only";
import { suppliers, profileDocuments, type Supplier } from "@/content/fieldwork/catalog";
import { createHash } from "node:crypto";
import { and, eq, ne, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { users, memberships, organizations, profileClaims, supplierProfiles, supplierProducts, supplierLots, supplierSamplingRequests, supplierCertifications, certificationSuggestions, publicDocuments, publicFormQuotas, takedownRequests } from "@/db/schema";
import type { Actor } from "@/domain/authz";
import { takedownSchema, claimNeedsProof } from "@/domain/listing-claims";
import { websiteEmailMatches } from "@/domain/listing-claims";
import { getClerkIdentity } from "@/lib/clerk-identity";
import { requireCertificationAdmin } from "./certifications";
import { documentResults } from "@/db/market-schema";
import { appendAuditEvent } from "./audit";
type Tx = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];
async function consumeQuota(tx: Tx, name: string) {
  const key = createHash("sha256").update(name).digest("hex");
  const result = await tx.execute(sql`INSERT INTO ${publicFormQuotas} (key, attempts, resets_at) VALUES (${key}, 1, now() + interval '1 hour') ON CONFLICT (key) DO UPDATE SET attempts = CASE WHEN public_form_quotas.resets_at <= now() THEN 1 ELSE public_form_quotas.attempts + 1 END, resets_at = CASE WHEN public_form_quotas.resets_at <= now() THEN now() + interval '1 hour' ELSE public_form_quotas.resets_at END WHERE public_form_quotas.resets_at <= now() OR public_form_quotas.attempts < 5 RETURNING key`);
  if (!result.rows.length) throw new Error("Too many requests. Try again later or email marcus@vle.exchange.");
}
export async function verifiedClaimIdentity(actor: Actor) {
  const user = await getDb().query.users.findFirst({ where: eq(users.id, actor.userId) }); if (!user) throw new Error("Account not found");
  if (process.env.NODE_ENV !== "production" && process.env.VLE_DEV_ACTOR === user.email) return { email: user.email, emailVerified: true };
  return getClerkIdentity(user.clerkUserId);
}
export async function submitProfileClaim(actor: Actor, profileId: string, proofNote: string, honeypot: string) {
  if (honeypot || !actor.roles.some((r) => r === "BUYER" || r === "SUPPLIER")) throw new Error("A company account is required");
  if (proofNote.length > 4000) throw new Error("Proof note is too long");
  const identity = await verifiedClaimIdentity(actor); if (!identity.emailVerified) throw new Error("Verify your primary account email before claiming a profile");
  return getDb().transaction(async (tx) => {
    await consumeQuota(tx, `claim:${actor.userId}`);
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${profileId}))`);
    const p = await tx.query.supplierProfiles.findFirst({ where: eq(supplierProfiles.id, profileId) });
    if (!p || p.hidden || p.claimStatus === "CLAIMED" || p.organizationId) throw new Error("This profile is unavailable for a claim");
    const domainMatched = websiteEmailMatches(p.website, identity.email);
    if (claimNeedsProof(domainMatched, proofNote)) throw new Error("Add a proof note explaining your authority to represent the company");
    const [claim] = await tx.insert(profileClaims).values({ supplierProfileId: p.id, claimantOrganizationId: actor.organizationId, claimantUserId: actor.userId, primaryEmail: identity.email, domainMatched, proofNote: proofNote.trim() || null }).onConflictDoUpdate({ target: [profileClaims.supplierProfileId, profileClaims.claimantUserId], set: { primaryEmail: identity.email, domainMatched, proofNote: proofNote.trim() || null, status: "PENDING", reviewNote: null, reviewedByUserId: null, reviewedAt: null } }).returning();
    await tx.update(supplierProfiles).set({ claimStatus: "CLAIM_PENDING" }).where(eq(supplierProfiles.id, p.id));
    await appendAuditEvent(tx, actor, { eventType: "SUPPLIER_PROFILE_CLAIMED_FOR_REVIEW", entityType: "profile_claim", entityId: claim.id, data: { profileId, domainMatched } });
    return claim;
  });
}
export async function submitTakedown(input: unknown, ip: string) {
  const data = takedownSchema.parse(input);
  return getDb().transaction(async (tx) => {
    await consumeQuota(tx, `takedown-ip:${ip}`); await consumeQuota(tx, `takedown-email:${data.email.toLowerCase()}`);
    const [row] = await tx.insert(takedownRequests).values({ company: data.company, name: data.name, email: data.email, profileUrl: data.profileUrl, whatToRemove: data.whatToRemove, reason: data.reason }).returning();
    await appendAuditEvent(tx, null, { eventType: "TAKEDOWN_REQUESTED", entityType: "takedown_request", entityId: row.id, data: { profileUrl: row.profileUrl } });
    return row;
  });
}
export async function reviewProfileClaim(actor: Actor, id: string, approve: boolean, reviewNote: string) {
  requireCertificationAdmin(actor); if (reviewNote.length > 4000) throw new Error("Review note is too long");
  await getDb().transaction(async (tx) => {
    const [claim] = await tx.select().from(profileClaims).where(eq(profileClaims.id, id)).for("update");
    if (!claim || claim.status !== "PENDING") throw new Error("Pending claim not found");
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${claim.supplierProfileId}))`);
    const p = await tx.query.supplierProfiles.findFirst({ where: eq(supplierProfiles.id, claim.supplierProfileId) });
    if (!p || p.organizationId || p.claimStatus === "CLAIMED") throw new Error("Profile ownership has already changed");
    if (approve) {
      if (!claim.domainMatched && reviewNote.trim().length < 10) throw new Error("Record the proof reviewed before confirming this unmatched-domain claim");
      const draft = await tx.query.supplierProfiles.findFirst({ where: eq(supplierProfiles.organizationId, claim.claimantOrganizationId) });
      if (draft && draft.id !== p.id) {
        if (draft.publishedAt) throw new Error("This organization already published a profile. Contact marcus@vle.exchange to review consolidation.");
        // Preserve all supplier-entered work from its unpublished onboarding draft.
        await tx.update(supplierProducts).set({ supplierProfileId: p.id }).where(eq(supplierProducts.supplierProfileId, draft.id));
        await tx.update(supplierLots).set({ supplierProfileId: p.id }).where(eq(supplierLots.supplierProfileId, draft.id));
        const sourceDocuments = await tx.query.publicDocuments.findMany({ where: eq(publicDocuments.supplierProfileId, p.id) });
        const draftDocuments = await tx.query.publicDocuments.findMany({ where: eq(publicDocuments.supplierProfileId, draft.id) });
        for (const d of draftDocuments) {
          const duplicate=sourceDocuments.find((s)=>s.sourceUrl===d.sourceUrl);
          if(duplicate){
            const prior=await tx.select().from(documentResults).where(eq(documentResults.documentId,d.id));
            const target=await tx.select().from(documentResults).where(eq(documentResults.documentId,duplicate.id));
            if(prior.length&&target.length)throw new Error("Both profiles contain confirmed results for the same document. Review consolidation before confirming ownership.");
            if(prior.length)await tx.update(documentResults).set({documentId:duplicate.id}).where(eq(documentResults.documentId,d.id));
            await tx.delete(publicDocuments).where(eq(publicDocuments.id,d.id));
          }
          else await tx.update(publicDocuments).set({ supplierProfileId: p.id }).where(eq(publicDocuments.id, d.id));
        }
        await tx.update(supplierSamplingRequests).set({ supplierProfileId: p.id }).where(eq(supplierSamplingRequests.supplierProfileId, draft.id));
        await tx.update(certificationSuggestions).set({ supplierProfileId: p.id }).where(eq(certificationSuggestions.supplierProfileId, draft.id));
        const existing = await tx.query.supplierCertifications.findMany({ where: eq(supplierCertifications.supplierProfileId, p.id) });
        const held = await tx.query.supplierCertifications.findMany({ where: eq(supplierCertifications.supplierProfileId, draft.id) });
        for (const c of held) {
          if (existing.some((e) => e.certificationKey === c.certificationKey)) await tx.delete(supplierCertifications).where(eq(supplierCertifications.id, c.id));
          else await tx.update(supplierCertifications).set({ supplierProfileId: p.id }).where(eq(supplierCertifications.id, c.id));
        }
        await tx.delete(supplierProfiles).where(eq(supplierProfiles.id, draft.id));
      }
      await tx.update(supplierProfiles).set({ organizationId: claim.claimantOrganizationId, claimStatus: "CLAIMED" }).where(eq(supplierProfiles.id, p.id));
      await tx.insert(memberships).values({ userId: claim.claimantUserId, organizationId: claim.claimantOrganizationId, role: "SUPPLIER" }).onConflictDoNothing();
      await tx.update(organizations).set({ kind: "SUPPLIER" }).where(eq(organizations.id, claim.claimantOrganizationId));
      await tx.update(profileClaims).set({ status: "REJECTED", reviewNote: "Another ownership claim was confirmed by operations", reviewedAt: new Date(), reviewedByUserId: actor.userId }).where(and(eq(profileClaims.supplierProfileId, p.id), ne(profileClaims.id, id), eq(profileClaims.status, "PENDING")));
    } else {
      const other = await tx.query.profileClaims.findFirst({ where: and(eq(profileClaims.supplierProfileId, p.id), ne(profileClaims.id, id), eq(profileClaims.status, "PENDING")) });
      if (!other) await tx.update(supplierProfiles).set({ claimStatus: "UNCLAIMED" }).where(eq(supplierProfiles.id, p.id));
    }
    await tx.update(profileClaims).set({ status: approve ? "APPROVED" : "REJECTED", reviewNote: reviewNote.trim() || null, reviewedAt: new Date(), reviewedByUserId: actor.userId }).where(eq(profileClaims.id, id));
    await appendAuditEvent(tx, actor, { eventType: approve ? "PROFILE_CLAIM_CONFIRMED" : "PROFILE_CLAIM_REJECTED", entityType: "profile_claim", entityId: id, data: { profileId: p.id, claimantOrganizationId: claim.claimantOrganizationId, reviewNote, listingSourceUnchanged: true } });
  });
}
export async function moderatePublicListing(actor: Actor, kind: "profile" | "document" | "takedown", id: string) {
  requireCertificationAdmin(actor);
  await getDb().transaction(async (tx) => {
    const rows = kind === "profile" ? await tx.update(supplierProfiles).set({ hidden: true, moderationHidden: true }).where(eq(supplierProfiles.id, id)).returning({ id: supplierProfiles.id }) : kind === "document" ? await tx.update(publicDocuments).set({ linkState: "NO_LONGER_PUBLISHED" }).where(eq(publicDocuments.id, id)).returning({ id: publicDocuments.id }) : await tx.update(takedownRequests).set({ resolvedAt: new Date(), resolvedByUserId: actor.userId }).where(eq(takedownRequests.id, id)).returning({ id: takedownRequests.id });
    if (!rows.length) throw new Error("Record not found");
    await appendAuditEvent(tx, actor, { eventType: kind === "profile" ? "PUBLIC_PROFILE_HIDDEN" : kind === "document" ? "PUBLIC_DOCUMENT_REMOVED" : "TAKEDOWN_RESOLVED", entityType: kind, entityId: id, data: {} });
  });
}

// A roster profile becomes a durable moderation target without creating membership.
export async function ensureClaimProfile(slug: string) {
 const source=suppliers.find(s=>s.slug===slug); if(!source)return null;
 const db=getDb();
 await db.insert(supplierProfiles).values({slug,displayName:source.name,website:source.website,country:source.country,categories:[source.category],listingSource:"PUBLIC_DOCUMENTS",hidden:false}).onConflictDoNothing();
 const profile=await db.query.supplierProfiles.findFirst({where:eq(supplierProfiles.slug,slug)});
 if(!profile || profile.hidden || profile.moderationHidden)return null;
 if(profile.listingSource!=="MEMBER")for(const d of profileDocuments(source as Supplier))await db.insert(publicDocuments).values({supplierProfileId:profile.id,productName:d.product,docType:"Other",testsText:d.title,sourceUrl:d.url,sourceDomain:d.domain,sourcePageUrl:d.source,labName:d.lab,reportDate:/^\d{4}-\d{2}-\d{2}$/.test(d.date)?d.date:null,reportDateText:d.date,foundAt:"2026-10-19"}).onConflictDoNothing();
 return profile;
}
export async function ensureRosterModerationRecords(){for(const source of suppliers)await ensureClaimProfile(source.slug);}
