"use server";
import {getCurrentActor} from "@/lib/current-actor";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import {z} from "zod";
import {sendMarketRequest} from "@/services/market-requests";
import {replyToSupplierRequest,closeSupplierRequest} from "@/services/supplier-requests";
export async function sendRequest(slug:string,input:Record<string,unknown>){const result=await sendMarketRequest(await getCurrentActor(),slug,input);revalidatePath("/dashboard/brand");revalidatePath("/dashboard/supplier/inbox");return {id:result.id};}
export async function quickRequest(f:FormData){const slug=z.string().min(1).max(120).parse(f.get("supplier")),type=z.enum(["DOCUMENT","INVITE_SUPPLIER"]).parse(f.get("type"));await sendRequest(slug,{type,message:type==="INVITE_SUPPLIER"?"Please invite this supplier to list on VLE.":"Please share current lot documentation for this ingredient.",quantityText:""});redirect("/dashboard/brand?sent=1");}
export async function replyAction(f:FormData){await replyToSupplierRequest(await getCurrentActor(),z.uuid().parse(f.get("requestId")),z.string().min(2).max(4000).parse(f.get("message")));revalidatePath("/dashboard/supplier/inbox");revalidatePath("/dashboard/brand");}
export async function closeRequestAction(f:FormData){await closeSupplierRequest(await getCurrentActor(),z.uuid().parse(f.get("requestId")));revalidatePath("/dashboard/brand");}
