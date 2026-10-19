import {notFound} from "next/navigation";
import {supplierBySlug} from "@/content/fieldwork/catalog";
import {Profile} from "@/components/fieldwork/profile";
export async function generateMetadata({params}:{params:Promise<{slug:string}>}){const s=supplierBySlug((await params).slug);return {title:s?.name??"Supplier unavailable",description:s?`Explore ${s.name}, ${s.category} and original supplier-published documents. Public reports do not establish VLE lot qualification.`:undefined,alternates:{canonical:`https://vle.exchange/suppliers/${s?.slug??""}`}};}
export default async function Page({params}:{params:Promise<{slug:string}>}){const s=supplierBySlug((await params).slug);if(!s)notFound();return <Profile supplier={s}/>}
