"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SiteFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/") return children;

  return (
    <>
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
        </nav>
      </header>
      {children}
      <footer className="siteFooter">
        <div className="footerTop">
          <div>
            <Link href="/" className="footerBrand">VLE<span>.</span></Link>
            <p>Source against a named compliance profile, only after the lot-specific evidence gate clears.</p>
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
          <p><Link href="/join">Join the pilot</Link> · <Link href="/articles">Articles</Link> · <Link href="/contaminants">Contaminant documentation</Link> · <Link href="/suppliers">Supplier profiles</Link> · <Link href="/faq">FAQ</Link> · Cocoa powder + avocado fruit pilots · vle.exchange</p>
        </div>
      </footer>
    </>
  );
}
