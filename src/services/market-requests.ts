import "server-only";
import {and,eq} from "drizzle-orm";
import {getDb} from "@/db";
import {supplierProfiles} from "@/db/schema";
import {supplierBySlug} from "@/content/fieldwork/catalog";
import {createSupplierRequest} from "./supplier-requests";
import type {Actor} from "@/domain/authz";
export async function sendMarketRequest(actor:Actor,slug:string,input:Record<string,unknown>){if(!actor.roles.includes("BUYER"))throw new Error("A brand account is required to send requests");let [p]=await getDb().select().from(supplierProfiles).where(and(eq(supplierProfiles.slug,slug),eq(supplierProfiles.hidden,false)));if(!p){const source=supplierBySlug(slug);if(!source)throw new Error("Supplier unavailable");if(input.type!=="INVITE_SUPPLIER")throw new Error("This supplier is not a VLE member");[p]=await getDb().insert(supplierProfiles).values({slug:source.slug,displayName:source.name,country:source.country,website:source.website,categories:[source.category],listingSource:"PUBLIC_DOCUMENTS",hidden:false}).onConflictDoUpdate({target:supplierProfiles.slug,set:{slug:source.slug}}).returning();}return createSupplierRequest(actor,{...input,supplierProfileId:p.id});}
