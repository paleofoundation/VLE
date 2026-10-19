import Link from "next/link";
import {cookies} from "next/headers";
import {auth} from "@clerk/nextjs/server";
import {notFound} from "next/navigation";
import {findPublicSupplier} from "@/services/marketplace";
import {REQUEST_LABELS,REQUEST_TYPES,type SupplierRequestType} from "@/domain/supplier-requests";
import {RequestForm} from "@/components/fieldwork/request-form";
export const metadata={title:"Prepare a sourcing request",robots:{index:false,follow:false}};
export default async function RequestPage({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){const f=await searchParams,s=await findPublicSupplier(f.supplier??"");if(!s)notFound();const requested=REQUEST_TYPES.includes(f.type as SupplierRequestType)?f.type as SupplierRequestType:"DOCUMENT",type=s.member?requested==="INVITE_SUPPLIER"?"DOCUMENT":requested:"INVITE_SUPPLIER";const jar=await cookies();const signedIn=jar.getAll().some(c=>/^__session(?:_|$)/.test(c.name)&&c.value)?Boolean((await auth()).userId):false;return <main id="main-content" className="fw-container fw-page"><div className="fw-breadcrumb"><Link href={`/suppliers/${s.slug}`}>{s.name}</Link><span>/</span><span>{REQUEST_LABELS[type]}</span></div><div className="fw-info-copy"><p className="fw-eyebrow">{type==="SAMPLE"?"01 USAGE DETAILS · 02 SIGN IN & SEND":"SOURCING REQUEST"}</p><h1>{REQUEST_LABELS[type]}</h1><p className="fw-page-lead">{s.name}{!s.member?" is not a VLE member. This request goes to VLE operations.":" receives requests in its supplier inbox."}</p><RequestForm supplier={{slug:s.slug,name:s.name}} type={type} signedIn={signedIn} quantity={f.quantity??""}/></div></main>}
