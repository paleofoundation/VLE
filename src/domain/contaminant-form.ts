import { z } from "zod";
import { DomainError } from "./errors";
import { MAX_CONTAMINANT_FILE_BYTES, type ContaminantAttachmentInput } from "./contaminants";

const optionalDate = z.string().trim().transform((value, ctx) => {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    ctx.addIssue({ code: "custom", message: "Enter a valid date" });
    return z.NEVER;
  }
  return date;
});
const blankUuid = z.union([z.string().uuid(), z.literal("")]).transform((value) => value || undefined);
const attachment = z.object({
  documentationType: z.enum(["HEAVY_METALS", "PFAS", "MICROPLASTICS"]),
  subject: z.enum(["LOT", "PROFILE"]),
  physicalLotId: blankUuid,
  complianceProfileId: blankUuid,
  fileName: z.string().trim().max(180),
  referenceUrl: z.string().trim().max(1000),
  documentDate: optionalDate,
  retestOn: optionalDate,
  notes: z.string().trim().max(1000).transform((value) => value || undefined),
});

export async function parseContaminantForm(data: FormData): Promise<ContaminantAttachmentInput> {
  const text = (key: string) => typeof data.get(key) === "string" ? data.get(key) as string : "";
  const input = attachment.parse(Object.fromEntries(Object.keys(attachment.shape).map((key) => [key, text(key)])));
  const file = data.get("file");
  if (file && typeof file !== "string" && file.name) {
    if (input.referenceUrl) throw new DomainError("Choose a PDF upload or an https reference, not both", "INVALID_INPUT");
    if (!file.size || file.size > MAX_CONTAMINANT_FILE_BYTES) throw new DomainError("PDF must be nonempty and no larger than 512 KiB", "INVALID_INPUT");
    if (file.type !== "application/pdf") throw new DomainError("Upload a PDF document", "INVALID_INPUT");
    return { ...input, fileName: file.name, referenceUrl: undefined, file: { bytes: new Uint8Array(await file.arrayBuffer()), contentType: "application/pdf" } };
  }
  return { ...input, referenceUrl: input.referenceUrl || undefined };
}
