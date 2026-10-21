/**
 * A certificate of analysis belongs to one lot.
 * The id is the file's own id once a real COA is on file.
 */
export type CertificateOfAnalysis = {
  id: string;
  lotId: string;
};

export type ExchangeLot = {
  id: string;
  coa: CertificateOfAnalysis | null;
};

export const DRAFT_AWAITING_COA = "Draft preview: awaiting COA";

export function coaAttachedToLot(lot: ExchangeLot) {
  return lot.coa != null && lot.coa.lotId === lot.id;
}

/**
 * A product is on the public exchange only when a COA is attached to a specific lot.
 * Without that COA it stays a draft that only the supplier can see.
 */
export function isPublishedProduct(lots: readonly ExchangeLot[]) {
  return lots.some(coaAttachedToLot);
}
