import type { MetadataRoute } from "next";
import { PUBLIC_SITEMAP_PATHS, absolutePublicUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_SITEMAP_PATHS.filter(path => !["/access", "/join", "/for-buyers"].includes(path)).map((path) => ({
    url: absolutePublicUrl(path),
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : path.startsWith("/for-") ? 0.8 : 0.7,
  }));
}
