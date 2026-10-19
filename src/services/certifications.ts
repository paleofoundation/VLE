import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { certificationSuggestions, supplierCertifications, supplierProfiles } from "@/db/schema";
import type { Actor } from "@/domain/authz";
import { certificationSchema, CERTIFICATION_KEYS } from "@/domain/certifications";
import { appendAuditEvent } from "./audit";
export async function ownSupplierProfile(actor: Actor) {
  if (!actor.roles.includes("SUPPLIER")) throw new Error("Supplier access required");
  const profile = await getDb().query.supplierProfiles.findFirst({ where: eq(supplierProfiles.organizationId, actor.organizationId) });
  if (!profile) throw new Error("Supplier profile not found"); return profile;
}
export function requireCertificationAdmin(actor: Actor) { if (!actor.roles.some((r) => r === "OPS" || r === "ADMIN")) throw new Error("Operations access required"); }
export async function listProfileCertifications(profileId: string) {
  return getDb().select().from(supplierCertifications).where(eq(supplierCertifications.supplierProfileId, profileId));
}
export async function saveCertification(actor: Actor, input: unknown) {
  const profile = await ownSupplierProfile(actor); const data = certificationSchema.parse(input);
  await getDb().transaction(async (tx) => {
    await tx.insert(supplierCertifications).values({ ...data, supplierProfileId: profile.id }).onConflictDoUpdate({ target: [supplierCertifications.supplierProfileId, supplierCertifications.certificationKey], set: { ...data, supplierReported: true, confirmedAt: null, confirmedIssuer: null, confirmedByUserId: null } });
    await appendAuditEvent(tx, actor, { eventType: "SUPPLIER_CERTIFICATION_SAVED", entityType: "supplier_profile", entityId: profile.id, data });
  });
}
export async function removeCertification(actor: Actor, id: string) {
  const profile = await ownSupplierProfile(actor);
  await getDb().transaction(async (tx) => {
    const rows = await tx.delete(supplierCertifications).where(and(eq(supplierCertifications.id, id), eq(supplierCertifications.supplierProfileId, profile.id))).returning();
    if (!rows.length) throw new Error("Certification not found for your organization");
    await appendAuditEvent(tx, actor, { eventType: "SUPPLIER_CERTIFICATION_REMOVED", entityType: "supplier_profile", entityId: profile.id, data: { id } });
  });
}
export async function reviewCertification(actor: Actor, id: string, action: "confirm" | "flag", note: string) {
  requireCertificationAdmin(actor);
  if (!note.trim() || note.length > 1000) throw new Error("Enter the issuing body or review note");
  await getDb().transaction(async (tx) => {
    const [row] = await tx.update(supplierCertifications).set(action === "confirm" ? { confirmedAt: new Date().toISOString().slice(0, 10), confirmedIssuer: note.trim(), confirmedByUserId: actor.userId, flaggedAt: null, flagNote: null } : { flaggedAt: new Date(), flagNote: note.trim(), confirmedAt: null, confirmedIssuer: null, confirmedByUserId: null }).where(eq(supplierCertifications.id, id)).returning();
    if (!row) throw new Error("Certification not found");
    await appendAuditEvent(tx, actor, { eventType: action === "confirm" ? "CERTIFICATION_BODY_CONFIRMED" : "CERTIFICATION_FLAGGED", entityType: "supplier_certification", entityId: id, data: { note } });
  });
}
export async function addManualCertificationSuggestion(actor: Actor, profileId: string, key: string, note: string) {
  requireCertificationAdmin(actor);
  if (!CERTIFICATION_KEYS.includes(key as typeof CERTIFICATION_KEYS[number]) || !note.trim() || note.length > 1000) throw new Error("Choose a certification and enter a note");
  await getDb().transaction(async (tx) => {
    const [row] = await tx.insert(certificationSuggestions).values({ supplierProfileId: profileId, certificationKey: key, note: note.trim(), createdByUserId: actor.userId }).returning();
    await appendAuditEvent(tx, actor, { eventType: "CERTIFICATION_SUGGESTION_ADDED", entityType: "supplier_profile", entityId: profileId, data: { suggestionId: row.id, key, note } });
  });
}
