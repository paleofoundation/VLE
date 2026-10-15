import { and, asc, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  complianceProfiles,
  contaminantDocuments,
  organizations,
  physicalLots,
  productTypes,
} from "@/db/schema";
import { assertPermission, assertTenant, type Actor } from "@/domain/authz";
import {
  assertContaminantAttachment,
  assertContaminantDownload,
  contaminantDocumentationType,
  type ContaminantAttachmentInput,
} from "@/domain/contaminants";
import { DomainError } from "@/domain/errors";
import { appendAuditEvent } from "./audit";

function documentSelection() {
  return {
    id: contaminantDocuments.id,
    documentationType: contaminantDocuments.documentationType,
    fileName: contaminantDocuments.fileName,
    referenceUrl: contaminantDocuments.referenceUrl,
    hasUpload: sql<boolean>`${contaminantDocuments.fileContent} IS NOT NULL`,
    fileSize: contaminantDocuments.fileSize,
    documentDate: contaminantDocuments.documentDate,
    retestOn: contaminantDocuments.retestOn,
    notes: contaminantDocuments.notes,
    attachedAt: contaminantDocuments.attachedAt,
    lotCode: physicalLots.supplierLotCode,
    profileName: complianceProfiles.name,
  };
}

export async function listSupplierContaminantDesk(actor: Actor) {
  assertPermission(actor, "ATTACH_CONTAMINANT_DOCUMENT");
  const db = getDb();
  const [lots, profiles, documents] = await Promise.all([
    db.select({
      id: physicalLots.id,
      supplierLotCode: physicalLots.supplierLotCode,
      product: productTypes.name,
    }).from(physicalLots)
      .innerJoin(productTypes, eq(productTypes.id, physicalLots.productTypeId))
      .where(eq(physicalLots.supplierOrganizationId, actor.organizationId))
      .orderBy(desc(physicalLots.createdAt)),
    db.select({
      id: complianceProfiles.id,
      name: complianceProfiles.name,
      product: productTypes.name,
    }).from(complianceProfiles)
      .innerJoin(productTypes, eq(productTypes.id, complianceProfiles.productTypeId))
      .orderBy(asc(complianceProfiles.name)),
    db.select(documentSelection()).from(contaminantDocuments)
      .leftJoin(physicalLots, eq(physicalLots.id, contaminantDocuments.physicalLotId))
      .leftJoin(complianceProfiles, eq(complianceProfiles.id, contaminantDocuments.complianceProfileId))
      .where(eq(contaminantDocuments.supplierOrganizationId, actor.organizationId))
      .orderBy(desc(contaminantDocuments.attachedAt)),
  ]);
  return { lots, profiles, documents };
}

export async function attachContaminantDocument(actor: Actor, input: ContaminantAttachmentInput, now = new Date()) {
  assertPermission(actor, "ATTACH_CONTAMINANT_DOCUMENT");
  assertContaminantAttachment(input);
  const db = getDb();
  return db.transaction(async (tx) => {
    if (input.subject === "LOT") {
      const [lot] = await tx.select({
        id: physicalLots.id,
        supplierOrganizationId: physicalLots.supplierOrganizationId,
      }).from(physicalLots).where(eq(physicalLots.id, input.physicalLotId!)).limit(1);
      if (!lot) throw new DomainError("Physical lot not found", "NOT_FOUND");
      assertTenant(actor, lot.supplierOrganizationId);
    } else {
      const [profile] = await tx.select({ id: complianceProfiles.id })
        .from(complianceProfiles).where(eq(complianceProfiles.id, input.complianceProfileId!)).limit(1);
      if (!profile) throw new DomainError("Compliance profile not found", "NOT_FOUND");
    }

    const [document] = await tx.insert(contaminantDocuments).values({
      documentationType: input.documentationType,
      supplierOrganizationId: actor.organizationId,
      physicalLotId: input.subject === "LOT" ? input.physicalLotId : null,
      complianceProfileId: input.subject === "PROFILE" ? input.complianceProfileId : null,
      fileName: input.fileName.trim(),
      referenceUrl: input.referenceUrl?.trim() ?? null,
      fileContent: input.file ? Buffer.from(input.file.bytes) : null,
      fileSize: input.file?.bytes.byteLength ?? null,
      contentType: input.file?.contentType ?? null,
      documentDate: input.documentDate,
      retestOn: input.retestOn,
      notes: input.notes?.trim() || null,
      attachedByUserId: actor.userId,
      attachedAt: now,
    }).returning({ id: contaminantDocuments.id });

    await appendAuditEvent(tx, actor, {
      eventType: "CONTAMINANT_DOCUMENT_ATTACHED",
      entityType: "ContaminantDocument",
      entityId: document.id,
      data: {
        documentationType: input.documentationType,
        subject: input.subject,
        lotId: input.subject === "LOT" ? input.physicalLotId : null,
        profileId: input.subject === "PROFILE" ? input.complianceProfileId : null,
        referenceRecorded: Boolean(input.referenceUrl),
        fileUploaded: Boolean(input.file),
        fileSize: input.file?.bytes.byteLength ?? null,
        resultStored: false,
        lotStatusUnchanged: true,
      },
    });
    return document;
  });
}

export async function listLotContaminantDocuments(lotId: string) {
  return getDb().select(documentSelection()).from(contaminantDocuments)
    .leftJoin(physicalLots, eq(physicalLots.id, contaminantDocuments.physicalLotId))
    .leftJoin(complianceProfiles, eq(complianceProfiles.id, contaminantDocuments.complianceProfileId))
    .where(eq(contaminantDocuments.physicalLotId, lotId))
    .orderBy(desc(contaminantDocuments.attachedAt));
}

export async function getPublicSupplierProfile(slug: string) {
  const db = getDb();
  const [organization] = await db.select({
    id: organizations.id,
    name: organizations.name,
    slug: organizations.slug,
  }).from(organizations)
    .where(and(eq(organizations.slug, slug), eq(organizations.kind, "SUPPLIER")))
    .limit(1);
  if (!organization) return null;
  const documents = await db.select(documentSelection()).from(contaminantDocuments)
    .leftJoin(physicalLots, eq(physicalLots.id, contaminantDocuments.physicalLotId))
    .leftJoin(complianceProfiles, eq(complianceProfiles.id, contaminantDocuments.complianceProfileId))
    .where(eq(contaminantDocuments.supplierOrganizationId, organization.id))
    .orderBy(desc(contaminantDocuments.attachedAt));
  return {
    organization,
    documents: documents.map((document) => ({
      ...document,
      type: contaminantDocumentationType(document.documentationType),
    })),
  };
}

/** Private bytes are selected only after role and supplier ownership checks. */
export async function downloadContaminantDocument(actor: Actor, documentId: string) {
  assertContaminantDownload(actor);
  const db = getDb();
  const [metadata] = await db.select({
    supplierOrganizationId: contaminantDocuments.supplierOrganizationId,
  }).from(contaminantDocuments).where(eq(contaminantDocuments.id, documentId)).limit(1);
  if (!metadata) throw new DomainError("Document not found", "NOT_FOUND");
  assertTenant(actor, metadata.supplierOrganizationId);
  const [document] = await db.select({
    fileName: contaminantDocuments.fileName,
    fileContent: contaminantDocuments.fileContent,
  }).from(contaminantDocuments).where(and(
    eq(contaminantDocuments.id, documentId),
    eq(contaminantDocuments.supplierOrganizationId, metadata.supplierOrganizationId),
  )).limit(1);
  if (!document?.fileContent) throw new DomainError("Uploaded PDF not found", "NOT_FOUND");
  return document;
}
