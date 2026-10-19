import type {Metadata} from "next";
import {Header,Footer} from "@/components/fieldwork/shell";
import {SITE_URL} from "@/lib/site";
import {SiteStructuredData} from "./site-structured-data";
import "./globals.css";
export const metadata:Metadata={metadataBase:new URL(SITE_URL),title:{default:"VLE | Ingredients, with the evidence.",template:"%s | VLE"},description:"Find ingredient suppliers by their public lab reports, certificates and lot records. Browse the evidence, compare suppliers and source with clarity.",robots:{index:true,follow:true},verification:{google:"XSK764vYklojORX15ECeOCVHoe-4HUjTL1bo_-sn4_A"}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><a className="fw-skip" href="#main-content">Skip to content</a><SiteStructuredData/><Header/>{children}<Footer/></body></html>}
