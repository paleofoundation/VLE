import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SITE_URL } from "@/lib/site";
import { SiteFrame } from "./site-frame";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "VLE | Verified Lot Exchange",
  description: "Buy the ingredient lot that already passed a defined compliance profile.",
  robots: { index: true, follow: true },
  verification: {
    google: "XSK764vYklojORX15ECeOCVHoe-4HUjTL1bo_-sn4_A",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <a className="skipLink" href="#main-content">Skip to content</a>
        <SiteFrame>{children}</SiteFrame>
      </body>
    </html>
  );
}
