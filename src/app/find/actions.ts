"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentActor } from "@/lib/current-actor";
import { createBuyerRequirement } from "@/services/vle";

export async function createRequirementAction(data: FormData) {
  const schema = z.object({ productTypeId: z.string().uuid(), profileVersionId: z.string().uuid(), quantity: z.coerce.number().positive(), destination: z.string().min(2).max(160), notes: z.string().max(1000).optional() });
  const input = schema.parse(Object.fromEntries(data));
  await createBuyerRequirement(await getCurrentActor(), { ...input, quantity: input.quantity.toString(), quantityUnit: "kg" });
  redirect("/find?created=1");
}
