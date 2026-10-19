"use server";
import { revalidatePath } from "next/cache";
import { getCurrentActor } from "@/lib/current-actor";
import { saveSupplierProfile, publishSupplierProfile, saveSupplierProduct, saveSupplierLot, addSupplierDocument, requestSupplierSampling } from "@/services/supplier-self-listing";
export async function supplierWriteAction(_state: { error?: string; saved?: boolean }, form: FormData): Promise<{ error?: string; saved?: boolean }> {
  const actor = await getCurrentActor();
  const data = { ...Object.fromEntries(form), categories: form.getAll("categories"), analytes: form.getAll("analytes") };
  try {
    switch (form.get("operation")) {
      case "profile": await saveSupplierProfile(actor, data); break;
      case "publish": await publishSupplierProfile(actor, form.get("publish") === "true"); break;
      case "product": await saveSupplierProduct(actor, data); break;
      case "lot": await saveSupplierLot(actor, data); break;
      case "document": await addSupplierDocument(actor, data); break;
      case "sampling": await requestSupplierSampling(actor, String(form.get("lotId"))); break;
      default: return { error: "Choose an action" };
    }
  } catch (e) { return { error: e instanceof Error && !e.message.startsWith("Failed query") ? e.message.slice(0, 400) : "Could not save. Check the details, including unique profile URL and lot code." }; }
  revalidatePath("/supplier"); revalidatePath("/suppliers", "layout"); revalidatePath("/documents"); revalidatePath("/ops/supplier-sampling"); return { saved: true };
}
