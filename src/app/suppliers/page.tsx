import { Directory } from "@/components/directory";
import type { Filters } from "@/lib/catalog";
export const metadata = { title: "Ingredient suppliers", alternates: { canonical: "/suppliers" } };
export default async function Page({ searchParams }: { searchParams: Promise<Record<string,string | string[] | undefined>> }) { const query = await searchParams; const filters = Object.fromEntries(Object.entries(query).filter(([,v])=>typeof v === "string")) as Filters; return <Directory filters={filters}/>; }
