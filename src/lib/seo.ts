import type { Metadata } from "next";
import { SITE_URL, absolutePublicUrl, type PublicSitemapPath } from "./site";

export const SITE_NAME = "Verified Lot Exchange";

export function publicPageMetadata(path: PublicSitemapPath, title: string, description: string): Metadata {
  const url = absolutePublicUrl(path);
  const image = {
    url: `${SITE_URL}/opengraph-image`,
    width: 1200,
    height: 630,
    alt: "VLE — Verified Lot Exchange",
  };

  return {
    title,
    description,
    alternates: { canonical: url },
    robots: { index: true, follow: true },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title,
      description,
      url,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}
