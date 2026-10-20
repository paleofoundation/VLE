import Link from "next/link";
import { Inter } from "next/font/google";
import { CornerPoll } from "./poll";
import "./exchange.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });

const links = [
  { href: "/suppliers", label: "Suppliers" },
  { href: "/design-system", label: "Design system" },
  { href: "/email-sign-in", label: "Sign in" },
] as const;

function NavLinks({ current }: { current?: string }) {
  return (
    <>
      {links.map((link) => (
        <Link key={link.href} href={link.href} aria-current={current === link.href ? "page" : undefined}>
          {link.label}
        </Link>
      ))}
    </>
  );
}

export function ExchangeShell({
  children,
  dock = false,
  current,
}: {
  children: React.ReactNode;
  dock?: boolean;
  current?: string;
}) {
  return (
    <div className={`exchange ${inter.className}${dock ? " exchange-has-dock" : ""}`}>
      <a className="x-skip" href="#main-content">
        Skip to content
      </a>
      <header className="x-header">
        <div className="x-header-inner">
          <Link href="/" className="x-logo" aria-label="VLE home">
            <strong>VLE</strong>
            <span>Verified Lot Exchange</span>
          </Link>
          <nav className="x-nav" aria-label="Main">
            <NavLinks current={current} />
          </nav>
          <details className="x-nav-mobile">
            <summary>Menu</summary>
            <nav className="x-menu" aria-label="Main">
              <NavLinks current={current} />
            </nav>
          </details>
        </div>
      </header>
      <div className="x-main">{children}</div>
      <footer className="x-footer">
        <div className="x-wrap x-footer-inner">
          <strong>Verified Lot Exchange</strong>
          <p>Know what&apos;s in the lot before you buy it.</p>
          <p>Free for brands. Free to list. No demo, no sales call.</p>
          <p>Run by Paleo Foundation, a certification body.</p>
          <p>TECRID is a free public tool.</p>
          <nav aria-label="Footer">
            <Link className="x-text-link" href="/suppliers">
              Suppliers
            </Link>
            <Link className="x-text-link" href="/design-system">
              Design system
            </Link>
            <Link className="x-text-link" href="/email-sign-in">
              Sign in
            </Link>
          </nav>
        </div>
      </footer>
      <CornerPoll />
    </div>
  );
}
