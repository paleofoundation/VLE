"use server";
import {z} from "zod";
import {revalidatePath} from "next/cache";
import {getCurrentActor} from "@/lib/current-actor";
import {saveRequirement,toggleSavedSupplier} from "@/services/saved-requirements";
import {findPublicSupplier} from "@/services/marketplace";
export async function saveLimitsAction(f:FormData){await saveRequirement(await getCurrentActor(),{name:f.get("name"),category:f.get("category"),limits:[{analyte:f.get("analyte"),maximumPpm:z.coerce.number().finite().nonnegative().parse(f.get("maximumPpm")),operator:f.get("operator")}],alertsEnabled:f.get("alerts")==="on"});revalidatePath("/dashboard/brand");}
export async function saveSupplierAction(f:FormData){const slug=z.string().min(1).max(120).parse(f.get("supplier"));if(!await findPublicSupplier(slug))throw new Error("Supplier unavailable");await toggleSavedSupplier(await getCurrentActor(),slug);revalidatePath("/dashboard/brand");}
