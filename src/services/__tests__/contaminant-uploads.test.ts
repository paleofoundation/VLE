import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { eq } from "drizzle-orm";
import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import * as schema from "@/db/schema";
import type { Actor } from "@/domain/authz";
import { MAX_CONTAMINANT_FILE_BYTES } from "@/domain/contaminants";

const auth = vi.hoisted(() => ({ getCurrentActor: vi.fn() }));
vi.mock("@/lib/current-actor", () => auth);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
const { GET } = await import("@/app/api/contaminant-documents/[id]/route");
const { attachContaminantDocumentAction } = await import("@/app/supplier/contaminant-actions");

const database = new PGlite();
const db = drizzle(database, { schema });
vi.mock("@/db", () => ({ getDb: () => db }));
const { attachContaminantDocument, downloadContaminantDocument, listSupplierContaminantDesk, getPublicSupplierProfile } = await import("../contaminants");

const actor: Actor = { userId: randomUUID(), organizationId: randomUUID(), roles: ["SUPPLIER"] };
const other: Actor = { ...actor, organizationId: randomUUID() };
const profileId = randomUUID();
const productId = randomUUID();
const lotId = randomUUID();
const pdf = Buffer.from("%PDF-1.4\n% Synthetic test fixture, no scientific data\n%%EOF");
const input = { documentationType: "PFAS" as const, subject: "LOT" as const, physicalLotId: lotId, fileName: "fixture.pdf", file: { bytes: pdf, contentType: "application/pdf" as const } };
let uploadedId: string;

beforeAll(async () => {
  // Isolated in-memory Postgres. Never reads a connection URL or a real record.
  for (const file of ["0000_romantic_cable", "0001_harden-bindings", "0002_silent_molecule_man", "0003_abnormal_genesis", "0004_contaminant_documents"]) {
    await database.exec(readFileSync(`drizzle/${file}.sql`, "utf8"));
  }
  await db.insert(schema.organizations).values([
    { id: actor.organizationId, name: "Synthetic supplier", slug: "synthetic-supplier", kind: "SUPPLIER" },
    { id: other.organizationId, name: "Other synthetic supplier", slug: "other-synthetic-supplier", kind: "SUPPLIER" },
  ]);
  await db.insert(schema.users).values({ id: actor.userId, clerkUserId: "synthetic-user", email: "fixture@example.test", displayName: "Synthetic user" });
  await db.insert(schema.productTypes).values({ id: productId, code: "TEST_ONLY", name: "Synthetic category" });
  await db.insert(schema.complianceProfiles).values({ id: profileId, productTypeId: productId, name: "Synthetic profile" });
  await db.insert(schema.physicalLots).values({ id: lotId, supplierOrganizationId: actor.organizationId, productTypeId: productId, supplierLotCode: "SYNTHETIC", quantity: "1", quantityUnit: "test unit", locationName: "Test only", countryCode: "US", ownerName: "Test only" });
  // A reference predating 0005 must survive unchanged.
  await database.query("INSERT INTO contaminant_documents (documentation_type, supplier_organization_id, compliance_profile_id, file_name, reference_url) VALUES ('HEAVY_METALS', $1, $2, 'old-reference.pdf', 'https://example.test/old.pdf')", [actor.organizationId, profileId]);
  await database.exec(readFileSync("drizzle/0005_contaminant_pdf_uploads.sql", "utf8"));
}, 20000);
afterAll(async () => { await database.close(); });

describe("PDF persistence and authorization with isolated Postgres", () => {
  it("preserves old references, stores all three types and round-trips PDF bytes without qualifying a lot", async () => {
    for (const documentationType of ["HEAVY_METALS", "PFAS", "MICROPLASTICS"] as const) {
      const document = await attachContaminantDocument(actor, { ...input, documentationType });
      uploadedId = document.id;
      const stored = await downloadContaminantDocument(actor, document.id);
      expect(Buffer.from(stored.fileContent!)).toEqual(pdf);
    }
    const [lot] = await db.select().from(schema.physicalLots).where(eq(schema.physicalLots.id, lotId));
    expect(lot.status).toBe("NOMINATED");
    for (const table of [schema.samples, schema.tecridEvidence, schema.qualificationDecisions, schema.marketplaceListings]) {
      expect(await db.select().from(table)).toHaveLength(0);
    }
    const audits = await db.select().from(schema.auditEvents);
    expect(audits).toHaveLength(3);
    expect(audits.every((event) => event.eventType === "CONTAMINANT_DOCUMENT_ATTACHED")).toBe(true);
    const desk = await listSupplierContaminantDesk(actor);
    expect(desk.documents.find((d) => d.fileName === "old-reference.pdf")?.referenceUrl).toBe("https://example.test/old.pdf");
    expect(JSON.stringify(desk)).not.toContain("fileContent");
    const publicProfile = await getPublicSupplierProfile("synthetic-supplier");
    expect(publicProfile?.documents.some((d) => d.hasUpload)).toBe(true);
    expect(JSON.stringify(publicProfile)).not.toContain("fileContent");
    expect(JSON.stringify(publicProfile)).not.toContain("Synthetic test fixture");
  });

  it("rejects buyers, other suppliers and unknown documents; operations can download", async () => {
    await expect(downloadContaminantDocument({ ...actor, roles: ["BUYER"] }, uploadedId)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(downloadContaminantDocument(other, uploadedId)).rejects.toMatchObject({ code: "TENANT_MISMATCH" });
    await expect(downloadContaminantDocument(actor, randomUUID())).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(downloadContaminantDocument({ ...other, roles: ["OPS"] }, uploadedId)).resolves.toMatchObject({ fileName: "fixture.pdf" });
    await expect(attachContaminantDocument(other, input)).rejects.toMatchObject({ code: "TENANT_MISMATCH" });
    await expect(attachContaminantDocument({ ...actor, roles: ["BUYER"] }, input)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(await db.select().from(schema.auditEvents)).toHaveLength(3);
  });

  it("rejects malformed sources and oversized files at the database boundary", async () => {
    const common = { documentationType: "HEAVY_METALS" as const, supplierOrganizationId: actor.organizationId, complianceProfileId: profileId, fileName: "fixture.pdf" };
    for (const fields of [
      {},
      { referenceUrl: "https://example.test/file.pdf", fileContent: pdf },
      { fileContent: pdf, fileSize: pdf.length, contentType: null },
      { fileContent: pdf, fileSize: pdf.length + 1, contentType: "application/pdf" },
      { fileContent: Buffer.alloc(MAX_CONTAMINANT_FILE_BYTES + 1), fileSize: MAX_CONTAMINANT_FILE_BYTES + 1, contentType: "application/pdf" },
    ]) {
      await expect(db.insert(schema.contaminantDocuments).values({ ...common, ...fields })).rejects.toThrow();
    }
  });
});


describe("action to storage to authenticated download", () => {
  it("round-trips a submitted PDF with attachment/no-store headers and blocks signed-out reads", async () => {
    auth.getCurrentActor.mockResolvedValue(actor);
    const data = new FormData();
    data.set("documentationType", "PFAS");
    data.set("subject", "PROFILE");
    data.set("complianceProfileId", profileId);
    data.set("file", new File([pdf], "action-fixture.pdf", { type: "application/pdf" }));
    expect(await attachContaminantDocumentAction({ error: "", success: false }, data)).toEqual({ error: "", success: true });
    const desk = await listSupplierContaminantDesk(actor);
    const id = desk.documents.find((d) => d.fileName === "action-fixture.pdf")!.id;
    const request = new Request(`https://example.test/api/contaminant-documents/${id}`);
    const response = await GET(request, { params: Promise.resolve({ id }) });
    expect(response.status).toBe(200);
    expect(Buffer.from(await response.arrayBuffer())).toEqual(pdf);
    expect(response.headers.get("Content-Disposition")).toBe('attachment; filename="action-fixture.pdf"');
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    auth.getCurrentActor.mockResolvedValue(other);
    expect((await GET(request, { params: Promise.resolve({ id }) })).status).toBe(403);
    const { DomainError } = await import("@/domain/errors");
    auth.getCurrentActor.mockRejectedValue(new DomainError("Authentication required", "UNAUTHENTICATED"));
    expect((await GET(request, { params: Promise.resolve({ id }) })).status).toBe(401);
  });
  it("returns actionable form errors without writing a document", async () => {
    auth.getCurrentActor.mockResolvedValue(actor);
    const before = (await listSupplierContaminantDesk(actor)).documents.length;
    const invalid = await attachContaminantDocumentAction({ error: "", success: false }, new FormData());
    expect(invalid.success).toBe(false);
    expect(invalid.error.length).toBeGreaterThan(0);
    expect((await listSupplierContaminantDesk(actor)).documents).toHaveLength(before);
  });
});
