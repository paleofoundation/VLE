"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { MockTecridIssuer } from "@/adapters/tecrid/mock";
import { getCurrentActor } from "@/lib/current-actor";
import { advanceSamplingOrder, createSamplingOrder, ingestTecridEvidence, placeLotOnHold, publishListing, qualifyLot, revokeEvidence, verifyLotInventory } from "@/services/vle";

const uuid = z.string().uuid();
const value = (data: FormData, name: string) => z.string().min(1).parse(data.get(name));
const refresh = (lotId: string) => { revalidatePath("/"); revalidatePath("/ops"); revalidatePath(`/ops/lots/${lotId}`); };

export async function verifyInventoryAction(data: FormData) {
  const lotId = uuid.parse(data.get("lotId")); await verifyLotInventory(await getCurrentActor(), lotId); refresh(lotId);
}
export async function startSamplingAction(data: FormData) {
  const lotId = uuid.parse(data.get("lotId")); await createSamplingOrder(await getCurrentActor(), lotId); refresh(lotId);
}
export async function advanceSamplingAction(data: FormData) {
  const lotId = uuid.parse(data.get("lotId")); const orderId = uuid.parse(data.get("orderId"));
  const to = z.enum(["SCHEDULED", "COLLECTED", "SHIPPED", "RECEIVED", "COMPLETED"]).parse(data.get("to"));
  const sampleInput = to === "COLLECTED" ? { sampleCode: `S-${lotId.slice(0, 8)}-${Date.now()}`, samplerName: "VLE managed sampling operator", method: "EXAMPLE cocoa composite sampling SOP v0.1", sealIdentifiers: [`SEAL-${Date.now()}`], chainOfCustody: [{ event: "COLLECTED", at: new Date().toISOString() }] } : undefined;
  await advanceSamplingOrder(await getCurrentActor(), orderId, to, sampleInput); refresh(lotId);
}
export async function issueMockEvidenceAction(data: FormData) {
  if (process.env.NODE_ENV === "production") throw new Error("Mock TECRID issuer is disabled in production");
  const lotId = uuid.parse(data.get("lotId")); const sampleId = uuid.parse(data.get("sampleId")); const sampleCode = value(data, "sampleCode"); const tecridId = `TECRID-MOCK-${Date.now()}`;
  const adapter = new MockTecridIssuer({ [tecridId]: { sampleCode, results: [
    { analyte: "lead", valuePpm: 0.15, unit: "ppm" }, { analyte: "cadmium", valuePpm: 0.45, unit: "ppm" },
    { analyte: "arsenic", valuePpm: 0.1, unit: "ppm" }, { analyte: "mercury", valuePpm: 0.01, unit: "ppm" },
  ] } });
  await ingestTecridEvidence(await getCurrentActor(), sampleId, tecridId, adapter); refresh(lotId);
}
export async function qualifyAction(data: FormData) {
  const lotId = uuid.parse(data.get("lotId")); await qualifyLot(await getCurrentActor(), lotId, uuid.parse(data.get("evidenceId")), uuid.parse(data.get("profileVersionId"))); refresh(lotId);
}
export async function publishAction(data: FormData) {
  const lotId = uuid.parse(data.get("lotId")); await publishListing(await getCurrentActor(), lotId, uuid.parse(data.get("decisionId")), `cocoa-${lotId.slice(0, 8)}-${Date.now()}`); refresh(lotId);
}
export async function revokeEvidenceAction(data: FormData) {
  const lotId = uuid.parse(data.get("lotId")); await revokeEvidence(await getCurrentActor(), uuid.parse(data.get("evidenceId")), "Managed demo revocation"); refresh(lotId);
}
export async function holdLotAction(data: FormData) {
  const lotId = uuid.parse(data.get("lotId")); await placeLotOnHold(await getCurrentActor(), lotId, "Managed operations hold"); refresh(lotId);
}
