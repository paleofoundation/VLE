import Link from "next/link";
import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

export function Button({ children, variant = "primary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "quiet" }) {
  return <button className={`button button-${variant} ${className}`} {...props}>{children}</button>;
}
export function ButtonLink({ href, children, variant = "primary", className = "" }: { href: string; children: ReactNode; variant?: "primary" | "secondary" | "quiet"; className?: string }) {
  return <Link href={href} className={`button button-${variant} ${className}`}>{children}</Link>;
}
export function Input(props: InputHTMLAttributes<HTMLInputElement>) { return <input {...props} className={`input ${props.className ?? ""}`} />; }
export function Label({ children, htmlFor }: { children: ReactNode; htmlFor: string }) { return <label className="label" htmlFor={htmlFor}>{children}</label>; }
export function Card({ children, className = "", ...props }: HTMLAttributes<HTMLElement>) { return <section {...props} className={`card ${className}`}>{children}</section>; }
export function Badge({ children, accent = false }: { children: ReactNode; accent?: boolean }) { return <span className={`badge ${accent ? "badge-accent" : ""}`}>{children}</span>; }
export function Arrow({ external = false }: { external?: boolean }) { return <span aria-hidden="true" className="arrow">{external ? "↗" : "→"}</span>; }
export function Table({ children, caption }: { children: ReactNode; caption: string }) { return <div className="table-scroll" role="region" aria-label={caption} tabIndex={0}><table><caption className="sr-only">{caption}</caption>{children}</table></div>; }
export function ResultRow({ analyte, value, unit, meaning }: { analyte: string; value: string; unit?: string; meaning: string }) {
  return <tr><th scope="row">{analyte}</th><td><span className="result-value">{value}</span>{unit && <span className="result-unit">{unit}</span>}</td><td className="result-meaning">{meaning}</td></tr>;
}
export function PriceTag({ price }: { price?: string }) { return <span className="price-tag">{price ?? "Sign in to see prices"}</span>; }
export function EmptyState({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) { return <Card className="empty-state"><h3>{title}</h3><p>{children}</p>{action}</Card>; }
export function Skeleton({ count = 3 }: { count?: number }) { return <div className="supplier-grid" aria-label="Loading suppliers" aria-busy="true">{Array.from({ length: count }, (_, i) => <div key={i} className="card skeleton"><span /><span /><span /></div>)}</div>; }
export function StatusSteps({ completed = [] }: { completed?: string[] }) { return <ol className="status-steps">{["Lot", "Sample", "TECRID", "QUALIFIED", "Reserved"].map((step, i) => <li key={step} className={completed.includes(step) ? "complete" : ""}><span>{String(i + 1).padStart(2, "0")}</span><strong>{step}</strong><small>{completed.includes(step) ? "Recorded" : "Pending"}</small></li>)}</ol>; }
export function SectionHeading({ label, title, children }: { label?: string; title: string; children?: ReactNode }) { return <div className="section-heading"><div>{label && <p className="eyebrow">{label}</p>}<h2>{title}</h2></div>{children}</div>; }
