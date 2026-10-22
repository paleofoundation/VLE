"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentActor } from "@/lib/current-actor";
import { attachContaminantDocument } from "@/services/contaminants";
import { assertPermission } from "@/domain/authz";
import { DomainError } from "@/domain/errors";
import { parseContaminantForm } from "@/domain/contaminant-form";

export async function attachContaminantDocumentAction(_previous: { error: string; success: boolean }, data: FormData) {
  try {
    const actor = await getCurrentActor();
    assertPermission(actor, "ATTACH_CONTAMINANT_DOCUMENT");
    const input = await parseContaminantForm(data);
    await attachContaminantDocument(actor, input);
    revalidatePath("/supplier");
    revalidatePath("/suppliers/[slug]", "page");
    if (input.physicalLotId) revalidatePath(`/ops/lots/${input.physicalLotId}`);
    return { error: "", success: true };
  } catch (error) {
    if (error instanceof z.ZodError) return { error: error.issues[0]?.message ?? "Check the document fields", success: false };
    if (error instanceof DomainError) return { error: error.message, success: false };
    throw error;
  }
}
