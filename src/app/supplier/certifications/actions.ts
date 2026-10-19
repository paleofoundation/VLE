"use server";
import { revalidatePath } from "next/cache";
import { getCurrentActor } from "@/lib/current-actor";
import { saveCertification, removeCertification, reviewCertification, addManualCertificationSuggestion } from "@/services/certifications";
export async function saveCertificationAction(_state: { error?: string; saved?: boolean }, form: FormData): Promise<{ error?: string; saved?: boolean }> {
  const actor = await getCurrentActor();
  try { await saveCertification(actor, Object.fromEntries(form)); }
  catch { return { error: "Could not save. Check the certificate name, date and original HTTPS link." }; }
  revalidatePath("/supplier/certifications"); revalidatePath("/suppliers", "layout"); return { saved: true };
}
export async function removeCertificationAction(form: FormData) { await removeCertification(await getCurrentActor(), String(form.get("id"))); revalidatePath("/supplier/certifications"); revalidatePath("/suppliers", "layout"); }
export async function reviewCertificationAction(form: FormData) {
  const action = form.get("action"); if (action !== "confirm" && action !== "flag") throw new Error("Invalid review action");
  await reviewCertification(await getCurrentActor(), String(form.get("id")), action, String(form.get("note") ?? ""));
  revalidatePath("/ops/certifications"); revalidatePath("/supplier/certifications"); revalidatePath("/suppliers", "layout");
}
export async function manualSuggestionAction(form: FormData) { await addManualCertificationSuggestion(await getCurrentActor(), String(form.get("profileId")), String(form.get("certificationKey")), String(form.get("note") ?? "")); revalidatePath("/ops/certifications"); revalidatePath("/supplier/certifications"); }
