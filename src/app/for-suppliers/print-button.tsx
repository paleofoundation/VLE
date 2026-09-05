"use client";

export function PrintButton() {
  return <button className="button supplierPrintButton" type="button" onClick={() => window.print()}>Print one-page guide</button>;
}
