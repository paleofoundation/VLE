import type { Metadata } from "next";
import localFont from "next/font/local";
import { Header, Footer } from "@/components/shell";
import { StructuredData } from "@/components/structured-data";
import "./globals.css";
const geist = localFont({ src: "../../public/fonts/geist-latin.woff2", variable: "--font-geist", display: "swap", weight: "100 900" });
export const metadata: Metadata = { metadataBase: new URL("https://vle.exchange"), title: { default: "VLE | Know what's in the lot", template: "%s | VLE" }, description: "Find ingredient suppliers through public lab reports and lot results. Free for brands. Free to list. No demo, no sales call.", verification: { google: "XSK764vYklojORX15ECeOCVHoe-4HUjTL1bo_-sn4_A" } };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="en" className={geist.variable}><body><StructuredData /><a href="#main-content" className="skip-link">Skip to content</a><Header />{children}<Footer /></body></html>; }
