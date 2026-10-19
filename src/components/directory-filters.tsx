"use client";
import { useRouter } from "next/navigation";
import { categories, filtersPath, type Filters } from "@/lib/catalog";
import { Label } from "./ui";
export function DirectoryFilters({ filters }: { filters: Filters }) {
  const router = useRouter();
  const options: { key: keyof Filters; label: string; values: [string, string][] }[] = [
    { key: "category", label: "Ingredient category", values: categories.map(c => [c.slug,c.label]) },
    { key: "analyte", label: "Contaminant tested", values: ["lead","arsenic","cadmium","mercury","pesticides","glyphosate","phthalates"].map(a => [a,a[0].toUpperCase()+a.slice(1)]) },
    { key: "country", label: "Country", values: ["Greece","Japan","India","Germany","Poland","Australia","USA"].map(c => [c,c]) },
    { key: "months", label: "Document age", values: [["6","Last 6 months"],["12","Last 12 months"],["24","Last 24 months"]] },
    { key: "status", label: "Listing status", values: [["PUBLIC_DOCUMENTS","Public documents"],["MEMBER","VLE member"]] },
    { key: "hasPrice", label: "Prices", values: [["yes","Has a published price"]] },
    { key: "certification", label: "Certifications", values: [["paleo","Certified Paleo"],["keto","KETO Certified"],["organic","Organic"],["kosher","Kosher"],["non-gmo","Non-GMO"]] },
  ];
  return <div className="filter-fields">{options.map(o => <div key={o.key}><Label htmlFor={`filter-${o.key}`}>{o.label}</Label><select className="input" id={`filter-${o.key}`} value={filters[o.key] ?? ""} onChange={e => router.push(filtersPath({ ...filters, [o.key]: e.target.value }))}><option value="">All</option>{o.values.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></div>)}</div>;
}
