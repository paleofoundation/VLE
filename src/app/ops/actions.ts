"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { MockTecridIssuer } from "@/adapters/tecrid/mock";
import { getCurrentActor } from "@/lib/current-actor";
import { advanceSamplingOrder, createSamplingOrder, ingestTecridEvidence, logLotArtifact, placeLotOnHold, publishListing, qualifyLot, revokeEvidence, saveNominationDraft, verifyLotInventory } from "@/services/vle";

const uuid = z.string().uuid();
const value = (data: FormData, name: string) => z.string().min(1).parse(data.get(name));
const refresh = (lotId: string) => { revalidatePath("/"); revalidatePath("/ops"); revalidatePath(`/ops/lots/${lotId}`); };

export async function saveNominationDraftAction(data: FormData) {
  const input = z.object({
    lotId: uuid.optional(),
    supplierOrganizationId: uuid,
    productTypeId: uuid,
    supplierLotCode: z.string().trim().min(2).max(100),
    quantity: z.coerce.number().positive().max(1_000_000_000),
    locationName: z.string().trim().min(2).max(180),
    countryCode: z.string().trim().length(2).transform((country) => country.toUpperCase()),
    ownerName: z.string().trim().min(2).max(180),
  }).parse({
    lotId: data.get("lotId") || undefined,
    supplierOrganizationId: data.get("supplierOrganizationId"),
    productTypeId: data.get("productTypeId"),
    supplierLotCode: data.get("supplierLotCode"),
    quantity: data.get("quantity"),
    locationName: data.get("locationName"),
    countryCode: data.get("countryCode"),
    ownerName: data.get("ownerName"),
  });
  const { lotId, ...nomination } = input;
  const result = await saveNominationDraft(await getCurrentActor(), {
    ...nomination,
    quantity: input.quantity.toString(),
    quantityUnit: "kg",
  }, lotId);
  revalidatePath("/ops");
  revalidatePath("/ops/nominations");
  revalidatePath(`/ops/lots/${result.lot.id}`);
  redirect(`/ops/nominations?saved=${result.lot.id}&mode=${result.created ? "created" : "updated"}`);
}

export async function verifyInventoryAction(data: FormData) {
  const lotId = uuid.parse(data.get("lotId")); await verifyLotInventory(await getCurrentActor(), lotId); refresh(lotId);
}
export async function logLotArtifactAction(data: FormData) {
  const input = z.object({
    lotId: uuid,
    artifactType: z.enum(["SUPPLIER_COA", "SUPPLIER_PDF"]),
    fileName: z.string().trim().min(1).max(180),
    referenceUrl: z.string().trim().url().max(1000).refine((url) => ["https:", "http:"].includes(new URL(url).protocol), "Reference must use HTTP or HTTPS"),
    documentDate: z.iso.date().optional(),
    notes: z.string().trim().max(1000).optional(),
  }).parse({
    lotId: data.get("lotId"), artifactType: data.get("artifactType"), fileName: data.get("fileName"),
    referenceUrl: data.get("referenceUrl"), documentDate: data.get("documentDate") || undefined, notes: data.get("notes") || undefined,
  });
  await logLotArtifact(await getCurrentActor(), input.lotId, {
    artifactType: input.artifactType,
    fileName: input.fileName,
    referenceUrl: input.referenceUrl,
    documentDate: input.documentDate ? new Date(`${input.documentDate}T00:00:00.000Z`) : undefined,
    notes: input.notes,
  });
  refresh(input.lotId);
}
export async function startSamplingAction(data: FormData) {
  const lotId = uuid.parse(data.get("lotId")); await createSamplingOrder(await getCurrentActor(), lotId); refresh(lotId);
}
export async function advanceSamplingAction(data: FormData) {
  const lotId = uuid.parse(data.get("lotId")); const orderId = uuid.parse(data.get("orderId"));
  const to = z.enum(["SCHEDULED", "COLLECTED", "SHIPPED", "RECEIVED", "COMPLETED"]).parse(data.get("to"));
  const sampleInput = to === "COLLECTED" ? { sampleCode: `S-${lotId.slice(0, 8)}-${Date.now()}`, samplerName: "VLE managed sampling operator", method: "EXAMPLE managed composite sampling SOP v0.1", sealIdentifiers: [`SEAL-${Date.now()}`], chainOfCustody: [{ event: "COLLECTED", at: new Date().toISOString() }] } : undefined;
  await advanceSamplingOrder(await getCurrentActor(), orderId, to, sampleInput); refresh(lotId);
}
export async function issueMockEvidenceAction(data: FormData) {
  if (process.env.NODE_ENV === "production") throw new Error("Mock TECRID issuer is disabled in production");
  const lotId = uuid.parse(data.get("lotId")); const sampleId = uuid.parse(data.get("sampleId")); const sampleCode = value(data, "sampleCode"); const tecridId = `TECRID-MOCK-${Date.now()}`;
  const productCode = z.enum(["COCOA_POWDER", "AVOCADO_FRUIT"]).parse(data.get("productCode"));
  const results = productCode === "AVOCADO_FRUIT"
    ? [{ analyte: "lead" as const, valuePpm: 0.04, unit: "ppm" as const }, { analyte: "cadmium" as const, valuePpm: 0.02, unit: "ppm" as const }]
    : [{ analyte: "lead" as const, valuePpm: 0.15, unit: "ppm" as const }, { analyte: "cadmium" as const, valuePpm: 0.45, unit: "ppm" as const }, { analyte: "arsenic" as const, valuePpm: 0.1, unit: "ppm" as const }, { analyte: "mercury" as const, valuePpm: 0.01, unit: "ppm" as const }];
  const adapter = new MockTecridIssuer({ [tecridId]: { sampleCode, results } });
  await ingestTecridEvidence(await getCurrentActor(), sampleId, tecridId, adapter); refresh(lotId);
}
export async function qualifyAction(data: FormData) {
  const lotId = uuid.parse(data.get("lotId")); await qualifyLot(await getCurrentActor(), lotId, uuid.parse(data.get("evidenceId")), uuid.parse(data.get("profileVersionId"))); refresh(lotId);
}
export async function publishAction(data: FormData) {
  const lotId = uuid.parse(data.get("lotId")); await publishListing(await getCurrentActor(), lotId, uuid.parse(data.get("decisionId"))); refresh(lotId);
}
export async function revokeEvidenceAction(data: FormData) {
  const lotId = uuid.parse(data.get("lotId")); await revokeEvidence(await getCurrentActor(), uuid.parse(data.get("evidenceId")), "Managed demo revocation"); refresh(lotId);
}
export async function holdLotAction(data: FormData) {
  const lotId = uuid.parse(data.get("lotId")); await placeLotOnHold(await getCurrentActor(), lotId, "Managed operations hold"); refresh(lotId);
}
