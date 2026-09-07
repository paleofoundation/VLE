import type { Metadata } from "next";
import Link from "next/link";
import { ClerkProvider, Show, UserButton } from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "VLE — Verified Lot Exchange",
  description: "Buy the ingredient lot that already passed a defined compliance profile.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <ClerkProvider>
          <a className="skipLink" href="#main-content">Skip to content</a>
          <header className="siteHeader">
            <Link href="/" className="brand" aria-label="VLE home">
              <span className="brandMark" aria-hidden="true">VLE</span>
              <span className="brandName">Verified Lot Exchange</span>
            </Link>
            <nav aria-label="Main navigation">
              <Link href="/for-suppliers">For Suppliers</Link>
              <Link href="/for-buyers">For Buyers</Link>
              <Link href="/for-laboratories">For Laboratories</Link>
              <Link href="/access">Access</Link>
              <Link className="button buttonSmall buttonDark" href="/join">Join</Link>
              <Show when="signed-in"><UserButton /></Show>
            </nav>
          </header>
          {children}
          <footer className="siteFooter">
            <div className="footerTop">
              <div>
                <Link href="/" className="footerBrand">VLE<span>.</span></Link>
                <p>Source against a named compliance profile—only after the lot-specific evidence gate clears.</p>
              </div>
              <div className="footerNetwork" aria-label="Network roles">
                <span>HMI <small>know</small></span>
                <span>TECRID <small>prove evidence</small></span>
                <span className="isVle">VLE <small>source passed lots</small></span>
                <span>HMTc <small>certify finished product</small></span>
              </div>
            </div>
            <div className="footerBoundary">
              <p><strong>Claim boundary:</strong> VLE reports that an identified lot passed a named Compliance Profile. It does not certify a finished product.</p>
              <p><Link href="/join">Join the pilot</Link> · Cocoa powder + avocado fruit pilots · vle.exchange</p>
            </div>
          </footer>
        </ClerkProvider>
      </body>
    </html>
  );
}
