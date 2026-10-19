import {randomUUID} from "node:crypto";
import {NextResponse} from "next/server";
import {z} from "zod";
import {getDb} from "@/db";
import {marketplaceEvents} from "@/db/market-schema";
import {findPublicSupplier} from "@/services/marketplace";
export async function POST(req:Request){try{if(req.headers.get("origin")!==new URL(req.url).origin)return new Response(null,{status:403});const d=z.object({supplier:z.string().max(120),kind:z.enum(["PROFILE","DOCUMENT"]),document:z.string().max(2000).default("")}).parse(await req.json());const s=await findPublicSupplier(d.supplier);if(!s||d.kind==="DOCUMENT"&&!s.documents.some(x=>x.url===d.document))return new Response(null,{status:400});const existing=req.headers.get("cookie")?.match(/(?:^|;\s*)vle_visitor=([0-9a-f-]{36})(?:;|$)/)?.[1];const visitorId=existing??randomUUID();await getDb().insert(marketplaceEvents).values({supplierSlug:s.slug,kind:d.kind,documentUrl:d.document,visitorId,day:new Date().toISOString().slice(0,10)}).onConflictDoNothing();const response=new NextResponse(null,{status:204});if(!existing)response.cookies.set("vle_visitor",visitorId,{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",maxAge:86400,path:"/"});return response;}catch{return new Response(null,{status:400});}}
