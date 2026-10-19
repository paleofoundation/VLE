import { notFound } from "next/navigation";
import { Directory } from "@/components/directory";
import type { Filters } from "@/lib/catalog";
export const metadata = { title: "Filtered ingredient suppliers", robots: { index: false, follow: true } };
export default async function Page({ params, searchParams }: { params: Promise<{ facets: string[] }>; searchParams: Promise<{ q?: string }> }) {
  const { facets } = await params; const { q } = await searchParams;
  const allowed = ["category","analyte","country","months","status","hasPrice","certification","result"];
  if (facets.length % 2 !== 0 || facets.some((v,i)=>i%2===0&&!allowed.includes(v))) notFound();
  const filters: Filters = { q }; for(let i=0;i<facets.length;i+=2) filters[facets[i] as keyof Filters] = facets[i+1];
  return <Directory filters={filters}/>;
}
