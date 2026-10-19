import {NextResponse} from "next/server";
import {getCurrentActor} from "@/lib/current-actor";
import {pdfDraft} from "@/domain/pdf-draft";
export const runtime="nodejs";
export async function POST(request:Request){try{const actor=await getCurrentActor();if(!actor.roles.includes("SUPPLIER"))return NextResponse.json({error:"Supplier access required"},{status:403});if(Number(request.headers.get("content-length")??0)>9*1024*1024)return NextResponse.json({error:"Use a PDF under 8 MB."},{status:413});const form=await request.formData(),file=form.get("file");if(!(file instanceof File)||file.size>8*1024*1024)return NextResponse.json({error:"Use a PDF under 8 MB."},{status:400});return NextResponse.json(pdfDraft(Buffer.from(await file.arrayBuffer())));}catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Unable to draft this report"},{status:400});}}
