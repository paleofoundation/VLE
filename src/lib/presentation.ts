export function formatQuantity(value: string) {
  const quantity = Number(value);
  return Number.isFinite(quantity)
    ? new Intl.NumberFormat("en", { maximumFractionDigits: 3 }).format(quantity)
    : value;
}
