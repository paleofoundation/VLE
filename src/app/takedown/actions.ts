"use server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { submitTakedown } from "@/services/listing-claims";
export async function takedownAction(_state: { error?: string; saved?: boolean }, form: FormData): Promise<{ error?: string; saved?: boolean }> {
  const h = await headers(); const ip = h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  try { await submitTakedown(Object.fromEntries(form), ip); }
  catch (e) { return { error: e instanceof Error && e.message.startsWith("Too many") ? e.message : "Could not submit. Check all fields or email marcus@vle.exchange." }; }
  revalidatePath("/ops/listing-requests"); return { saved: true };
}
