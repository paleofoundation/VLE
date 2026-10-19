import Link from "next/link";
import {cookies} from "next/headers";
import {auth} from "@clerk/nextjs/server";
import {eq} from "drizzle-orm";
import {getDb} from "@/db";
import {productPrices} from "@/db/market-schema";
import {EmptyState,Table} from "./ui";
export async function ProductPricing({productId,returnTo}:{productId:string;returnTo:string}){const jar=await cookies();if(!jar.getAll().some(c=>/^__session(?:_|$)/.test(c.name)&&c.value))return <Link className="fw-button fw-primary" href={`/sign-in?next=${encodeURIComponent(returnTo)}`}>Sign in to see prices</Link>;const {userId}=await auth();if(!userId)return <Link className="fw-button fw-primary" href="/sign-in">Sign in to see prices</Link>;const prices=await getDb().select().from(productPrices).where(eq(productPrices.productId,productId));if(!prices.length)return <EmptyState title="No prices published."><p>Request a quote from this supplier.</p></EmptyState>;return <Table caption="Supplier price tiers"><thead><tr><th scope="col">Price</th><th scope="col">Pack / minimum</th><th scope="col">Terms</th></tr></thead><tbody>{prices.map(p=><tr key={p.id}><td>{p.priceOnRequest?"Price on request":`${p.currency} ${p.amount} / ${p.unit}`}</td><td>{p.packSize}{p.minimumQuantity?<small>Minimum {p.minimumQuantity} {p.unit}</small>:null}</td><td>{[p.leadTime,p.incoterms,p.regions?.join(", ")].filter(Boolean).join(" · ")}</td></tr>)}</tbody></Table>}
