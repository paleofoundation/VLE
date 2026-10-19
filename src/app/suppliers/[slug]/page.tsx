import { notFound } from "next/navigation";
import { findSupplier, suppliers } from "@/lib/catalog";
import { SupplierProfile } from "@/components/profile";
export function generateStaticParams() { return suppliers.map(s=>({slug:s.slug})); }
export async function generateMetadata({params}:{params:Promise<{slug:string}>}) { const {slug}=await params; const s=findSupplier(slug); return {title:s?.name ?? "Supplier not found",description:s?.summary,alternates:{canonical:`/suppliers/${slug}`}}; }
export default async function Page({params}:{params:Promise<{slug:string}>}) { const {slug}=await params; const supplier=findSupplier(slug); if(!supplier)notFound(); return <SupplierProfile supplier={supplier}/>; }
