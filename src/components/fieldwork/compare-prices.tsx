import {cookies} from "next/headers";
import {auth} from "@clerk/nextjs/server";
import Link from "next/link";
import {eq} from "drizzle-orm";
import {getDb} from "@/db";
import {supplierProducts,supplierProfiles} from "@/db/schema";
import {productPrices} from "@/db/market-schema";
export async function ComparePrices({slug,member}:{slug:string;member:boolean}){if(!member)return <span>Not publicly published</span>;const jar=await cookies();if(!jar.getAll().some(c=>/^__session(?:_|$)/.test(c.name)&&c.value)||!(await auth()).userId)return <Link className="fw-text-link" href="/sign-in?next=/compare">Sign in to see prices</Link>;const rows=await getDb().select({price:productPrices,product:supplierProducts.name}).from(productPrices).innerJoin(supplierProducts,eq(supplierProducts.id,productPrices.productId)).innerJoin(supplierProfiles,eq(supplierProfiles.id,supplierProducts.supplierProfileId)).where(eq(supplierProfiles.slug,slug));return rows.length?<div>{rows.map(({price:p,product})=><p key={p.id}>{p.unit==="kg"||p.unit==="g"?`${p.currency} ${p.unit==="g"?(Number(p.amount)*1000).toFixed(4):p.amount} / kg`:`${p.currency} ${p.amount} / ${p.unit}`}<small className="fw-result-note">{product}{p.packSize?` · ${p.packSize}`:""}</small></p>)}</div>:<span>No prices published</span>;}
