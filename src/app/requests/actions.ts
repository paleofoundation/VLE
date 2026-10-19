"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentActor } from "@/lib/current-actor";
import { createSupplierRequest, replyToSupplierRequest, closeSupplierRequest } from "@/services/supplier-requests";
export async function sendSupplierRequestAction(_state: { error?: string }, form: FormData): Promise<{ error?: string }> {
  const actor = await getCurrentActor();
  try { await createSupplierRequest(actor, Object.fromEntries(form)); }
  catch (e) { return { error: e instanceof Error && !e.message.startsWith("Failed query") ? e.message.slice(0,400) : "Could not send your request. Try again." }; }
  revalidatePath("/buyer"); revalidatePath("/supplier"); revalidatePath("/ops/requests"); redirect("/buyer?request=sent#requests");
}
export async function replySupplierRequestAction(_state: { error?: string; saved?: boolean }, form: FormData): Promise<{ error?: string; saved?: boolean }> {
  try { await replyToSupplierRequest(await getCurrentActor(), String(form.get("requestId")), String(form.get("message") ?? "")); }
  catch { return { error: "Could not send this reply. The request must be open and belong to your inbox." }; }
  revalidatePath("/buyer"); revalidatePath("/supplier"); revalidatePath("/ops/requests"); return { saved: true };
}
export async function closeSupplierRequestAction(form: FormData) { await closeSupplierRequest(await getCurrentActor(), String(form.get("requestId"))); revalidatePath("/buyer"); revalidatePath("/supplier"); revalidatePath("/ops/requests"); }
