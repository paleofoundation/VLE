import {CompareButton} from "./compare-selection";
import Link from "next/link";
import type {Supplier} from "@/content/fieldwork/catalog";
import {displayDate} from "@/content/fieldwork/catalog";
import {Arrow,Card,DocumentIcon} from "./ui";
export function SupplierCard({supplier:s}:{supplier:Supplier}){return <Card className="fw-supplier-card"><div className="fw-card-meta"><span>{s.category}</span><span>{s.country}</span></div><h3><Link href={`/suppliers/${s.slug}`}>{s.name}</Link></h3><p className="fw-card-product">{s.products[0]}</p><div className="fw-card-evidence"><DocumentIcon/><span><strong>{s.documents.length} public {s.documents.length===1?"document":"documents"}</strong><small>Latest report · {displayDate(s.latest)}</small></span></div><div className="fw-card-bottom"><span className="fw-source-status"><i/>{s.member?"VLE member":"Public-document listing"}</span><CompareButton id={`s:${s.slug}`} label={s.name}/><Link href={`/suppliers/${s.slug}`} aria-label={`View ${s.name}`} className="fw-card-arrow"><Arrow/></Link></div></Card>}
