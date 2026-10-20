import { Fraunces, Outfit } from "next/font/google";
import { SiteStructuredData } from "./site-structured-data";
import { Exchange } from "./home/exchange";
import { buildHomeView } from "./home/catalog";
import { publicPageMetadata } from "@/lib/seo";

const display = Fraunces({
  subsets: ["latin"],
  display: "swap",
  style: ["normal", "italic"],
  variable: "--font-display",
});

const sans = Outfit({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-ui",
});

export const metadata = publicPageMetadata(
  "/",
  "VLE | Verified Lot Exchange",
  "Find ingredient suppliers by what is in the lot. Brands browse free. Documents stay visible.",
);

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[]; category?: string | string[] }>;
}) {
  const params = await searchParams;
  const view = buildHomeView(params);

  return (
    <div className={`${display.variable} ${sans.variable}`}>
      <SiteStructuredData />
      <Exchange view={view} />
    </div>
  );
}
