"use server";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {getCurrentActor} from "@/lib/current-actor";
import {quickList,savePrice,confirmResults} from "@/services/marketplace";
import {saveSupplierProfile,publishSupplierProfile,saveSupplierProduct,saveSupplierLot,addSupplierDocument,requestSupplierSampling} from "@/services/supplier-self-listing";
import {saveCertification} from "@/services/certifications";
function refresh(){revalidatePath("/suppliers");revalidatePath("/dashboard/supplier");revalidatePath("/documents");}
export async function quickListAction(f:FormData){const slug=await quickList(await getCurrentActor(),Object.fromEntries(f));refresh();redirect(`/suppliers/${slug}`);}
export async function profileAction(f:FormData){await saveSupplierProfile(await getCurrentActor(),{...Object.fromEntries(f),categories:f.getAll("categories")});refresh();}
export async function publishAction(f:FormData){await publishSupplierProfile(await getCurrentActor(),f.get("publish")==="true");refresh();}
export async function productAction(f:FormData){await saveSupplierProduct(await getCurrentActor(),Object.fromEntries(f));refresh();}
export async function lotAction(f:FormData){await saveSupplierLot(await getCurrentActor(),Object.fromEntries(f));refresh();}
export async function documentAction(f:FormData){await addSupplierDocument(await getCurrentActor(),{...Object.fromEntries(f),analytes:f.getAll("analytes")});refresh();}
export async function samplingAction(f:FormData){await requestSupplierSampling(await getCurrentActor(),String(f.get("lotId")));refresh();}
export async function priceAction(f:FormData){await savePrice(await getCurrentActor(),Object.fromEntries(f));refresh();}
export async function certificateAction(f:FormData){await saveCertification(await getCurrentActor(),Object.fromEntries(f));refresh();}
export async function confirmResultsAction(documentId:string,rows:unknown){await confirmResults(await getCurrentActor(),documentId,rows);refresh();}
