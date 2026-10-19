"use server";
import { revalidatePath } from "next/cache";
import { getCurrentActor } from "@/lib/current-actor";
import { submitProfileClaim, reviewProfileClaim, moderatePublicListing } from "@/services/listing-claims";
export async function claimProfileAction(_state: { error?: string; saved?: boolean }, form: FormData): Promise<{ error?: string; saved?: boolean }> {
  try { await submitProfileClaim(await getCurrentActor(), String(form.get("profileId")), String(form.get("proofNote") ?? ""), String(form.get("website") ?? "")); }
  catch (e) { return { error: e instanceof Error && !e.message.startsWith("Failed query") ? e.message : "Could not queue your claim. Contact marcus@vle.exchange." }; }
  revalidatePath("/claim", "layout"); revalidatePath("/ops/listing-requests"); return { saved: true };
}
export async function reviewClaimAction(_state: { error?: string; saved?: boolean }, form: FormData): Promise<{ error?: string; saved?: boolean }> {
  const action = form.get("action"); if (action !== "approve" && action !== "reject") return { error: "Choose a review action" };
  try { await reviewProfileClaim(await getCurrentActor(), String(form.get("claimId")), action === "approve", String(form.get("reviewNote") ?? "")); }
  catch (e) { return { error: e instanceof Error && !e.message.startsWith("Failed query") ? e.message : "Could not review this claim" }; }
  revalidatePath("/ops/listing-requests"); revalidatePath("/suppliers", "layout"); revalidatePath("/supplier"); return { saved: true };
}
export async function moderateListingAction(form: FormData) { const kind = form.get("kind"); if (kind !== "profile" && kind !== "document" && kind !== "takedown") throw new Error("Invalid action"); await moderatePublicListing(await getCurrentActor(), kind, String(form.get("id"))); revalidatePath("/ops/listing-requests"); revalidatePath("/suppliers", "layout"); revalidatePath("/documents"); }
