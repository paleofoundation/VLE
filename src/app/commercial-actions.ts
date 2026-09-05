"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentActor } from "@/lib/current-actor";
import {
  cancelReservationIntent,
  createReservationIntent,
  createSupplierQuote,
  matchBuyerRequirement,
  transitionSupplierQuote,
} from "@/services/commercial";

const uuid = z.string().uuid();
const hours = z.coerce.number().int().min(1).max(168);

function refreshCommercial() {
  revalidatePath("/find");
  revalidatePath("/buyer");
  revalidatePath("/supplier");
  revalidatePath("/ops");
  revalidatePath("/ops/commercial");
}

export async function matchRequirementAction(data: FormData) {
  await matchBuyerRequirement(await getCurrentActor(), uuid.parse(data.get("requirementId")));
  refreshCommercial();
}

export async function createQuoteAction(data: FormData) {
  const input = z.object({
    requirementMatchId: uuid,
    quantity: z.coerce.number().positive(),
    unitPrice: z.coerce.number().positive(),
    currency: z.enum(["USD", "EUR"]),
    terms: z.string().max(1000).optional(),
    expiresInHours: hours,
  }).parse(Object.fromEntries(data));
  const now = new Date();
  await createSupplierQuote(await getCurrentActor(), {
    requirementMatchId: input.requirementMatchId,
    quantity: input.quantity.toString(),
    quantityUnit: "kg",
    unitPrice: input.unitPrice.toString(),
    currency: input.currency,
    terms: input.terms || undefined,
    expiresAt: new Date(now.getTime() + input.expiresInHours * 60 * 60 * 1000),
  }, now);
  refreshCommercial();
}

export async function transitionQuoteAction(data: FormData) {
  const quoteId = uuid.parse(data.get("quoteId"));
  const to = z.enum(["SENT", "ACCEPTED", "WITHDRAWN"]).parse(data.get("to"));
  await transitionSupplierQuote(await getCurrentActor(), quoteId, to);
  refreshCommercial();
}

export async function createReservationAction(data: FormData) {
  const quoteId = uuid.parse(data.get("quoteId"));
  const expiresInHours = hours.parse(data.get("expiresInHours"));
  const now = new Date();
  await createReservationIntent(await getCurrentActor(), quoteId, new Date(now.getTime() + expiresInHours * 60 * 60 * 1000), now);
  refreshCommercial();
}

export async function cancelReservationAction(data: FormData) {
  await cancelReservationIntent(
    await getCurrentActor(),
    uuid.parse(data.get("reservationId")),
    z.string().min(3).max(240).parse(data.get("reason")),
  );
  refreshCommercial();
}
