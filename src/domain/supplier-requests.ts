import { z } from "zod";
import type { Actor } from "./authz";
export const REQUEST_TYPES = ["DOCUMENT", "SAMPLE", "QUOTE", "INVITE_SUPPLIER"] as const;
export type SupplierRequestType = typeof REQUEST_TYPES[number];
export const REQUEST_LABELS: Record<SupplierRequestType, string> = { DOCUMENT: "Request a document", SAMPLE: "Request a sample", QUOTE: "Request a quote", INVITE_SUPPLIER: "Ask VLE to invite this supplier" };
export const sampleQualificationSchema=z.object({samples:z.coerce.number().int().min(1).max(100),annualVolume:z.string().regex(/^\d{1,12}(?:\.\d{1,3})?$/).refine(x=>Number(x)>0),unit:z.enum(["kg","L","units"]),timing:z.string().min(1).max(120),market:z.string().trim().min(2).max(160),existingCustomer:z.enum(["yes","no"]),intendedUse:z.string().trim().min(5).max(500)});
export const supplierRequestSchema = z.object({ supplierProfileId: z.string().uuid(), type: z.enum(REQUEST_TYPES), qualification: sampleQualificationSchema.nullish(), lotId: z.string().uuid().or(z.literal("")).optional().transform((s) => s || null), message: z.string().trim().min(5).max(4000), quantityText: z.string().trim().max(300).transform((s) => s || null) }).refine(d=>d.type!=="SAMPLE"||!!d.qualification,"Complete the sample usage details");
export function assertSupplierRequestType(source: string, type: SupplierRequestType) {
  if (source === "PUBLIC_DOCUMENTS" && type !== "INVITE_SUPPLIER") throw new Error("This supplier is not a VLE member. Ask VLE to invite it instead.");
  if (source === "MEMBER" && type === "INVITE_SUPPLIER") throw new Error("This supplier already has a VLE account.");
}
export function requestCanBeRead(actor: Actor, request: { buyerOrganizationId: string; supplierOrganizationId: string | null; type: SupplierRequestType }) {
  return actor.roles.some((r) => r === "OPS" || r === "ADMIN") || actor.roles.includes("BUYER") && request.buyerOrganizationId === actor.organizationId || actor.roles.includes("SUPPLIER") && request.type !== "INVITE_SUPPLIER" && request.supplierOrganizationId === actor.organizationId;
}
export function requestCanBeAnswered(actor: Actor, request: { supplierOrganizationId: string | null; type: SupplierRequestType }) {
  return request.type === "INVITE_SUPPLIER" ? actor.roles.some((r) => r === "OPS" || r === "ADMIN") : actor.roles.includes("SUPPLIER") && request.supplierOrganizationId === actor.organizationId;
}
