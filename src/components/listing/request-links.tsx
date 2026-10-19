import Link from "next/link";
import { REQUEST_LABELS, type SupplierRequestType } from "@/domain/supplier-requests";
import styles from "./directory.module.css";
export function SupplierRequestLinks({ slug, member, lotId }: { slug: string; member: boolean; lotId?: string }) {
  const types: SupplierRequestType[] = member ? ["DOCUMENT", "SAMPLE", "QUOTE"] : ["INVITE_SUPPLIER"];
  return <div className={styles.actions}>{types.map((type) => <Link className="button buttonDark" key={type} href={`/requests/new?${new URLSearchParams({ supplier: slug, type, ...(lotId ? { lot: lotId } : {}) })}`}>{REQUEST_LABELS[type]}</Link>)}</div>;
}
