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
  description: "Source ingredient lots that already passed a defined compliance profile.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <ClerkProvider>
          <header className="siteHeader">
            <Link href="/" className="brand">VLE<span>.</span></Link>
            <nav aria-label="Main navigation">
              <Link href="/">Passed lots</Link>
              <Link href="/find">Find me a lot</Link>
              <Link href="/ops">Operations</Link>
              <Show when="signed-out"><Link className="button small" href="/sign-in">Sign in</Link></Show>
              <Show when="signed-in"><UserButton /></Show>
            </nav>
          </header>
          {children}
          <footer>VLE · Lot qualification, not finished-product certification · vle.exchange</footer>
        </ClerkProvider>
      </body>
    </html>
  );
}
