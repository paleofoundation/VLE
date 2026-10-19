import type { MetadataRoute } from "next";
import { listSuppliers } from "@/lib/public-listings";
import { PUBLIC_SITEMAP_PATHS, SITE_URL, absolutePublicUrl } from "@/lib/site";

export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const suppliers = await listSuppliers();
  return [...PUBLIC_SITEMAP_PATHS.filter((path) => path !== "/suppliers/kasandrinos").map((path) => ({
    url: absolutePublicUrl(path),
    changeFrequency: path === "/" ? "weekly" as const : "monthly" as const,
    priority: path === "/" ? 1 : path.startsWith("/for-") ? 0.8 : 0.7,
  })), ...suppliers.map((s) => ({ url: `${SITE_URL}/suppliers/${s.slug}`, changeFrequency: "monthly" as const, priority: 0.7 }))];
}
