"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentActor } from "@/lib/current-actor";
import { attachContaminantDocument } from "@/services/contaminants";

const optionalDate = z.string().trim().optional().transform((value) => {
  if (!value) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  return new Date(`${value}T00:00:00.000Z`);
});

const blankUuid = z.union([z.string().uuid(), z.literal("")]).optional().transform((value) => value || undefined);

const attachment = z.object({
  documentationType: z.enum(["HEAVY_METALS", "PFAS", "MICROPLASTICS"]),
  subject: z.enum(["LOT", "PROFILE"]),
  physicalLotId: blankUuid,
  complianceProfileId: blankUuid,
  fileName: z.string().trim().min(1).max(180),
  referenceUrl: z.string().trim().url().refine((value) => value.startsWith("https://"), "Use an https reference"),
  documentDate: optionalDate,
  retestOn: optionalDate,
  notes: z.string().trim().max(1000).optional().transform((value) => value || undefined),
});

function text(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value : "";
}

export async function attachContaminantDocumentAction(data: FormData) {
  const input = attachment.parse({
    documentationType: text(data.get("documentationType")),
    subject: text(data.get("subject")),
    physicalLotId: text(data.get("physicalLotId")),
    complianceProfileId: text(data.get("complianceProfileId")),
    fileName: text(data.get("fileName")),
    referenceUrl: text(data.get("referenceUrl")),
    documentDate: text(data.get("documentDate")),
    retestOn: text(data.get("retestOn")),
    notes: text(data.get("notes")),
  });
  const actor = await getCurrentActor();
  await attachContaminantDocument(actor, input);
  revalidatePath("/supplier");
  revalidatePath("/suppliers");
  revalidatePath(`/suppliers`);
}
