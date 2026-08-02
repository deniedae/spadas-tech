export function fmtMoney(n: number): string {
  return (Number(n) || 0).toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
  });
}

export function calcProfit(item: {
  price?: number | string | null;
  purchase_price?: number | string | null;
  sold_price?: number | string | null;
  shipping_cost?: number | string | null;
  fees?: number | string | null;
  status?: string | null;
}): number {
  const status = (item.status ?? "").toLowerCase();
  const isSold = status === "sold" || Number(item.sold_price ?? 0) > 0;

  if (!isSold) return 0;

  const soldPrice = Number(item.sold_price ?? item.price ?? 0) || 0;
  const purchasePrice = Number(item.purchase_price ?? 0) || 0;
  const shipping = Number(item.shipping_cost ?? 0) || 0;
  const fees = Number(item.fees ?? 0) || 0;

  return soldPrice - purchasePrice - shipping - fees;
}

export function calcInventoryValue(items: Array<{ status?: string; price?: number | string | null }>): number {
  return items
    .filter((item) => (item.status ?? "").toLowerCase() !== "sold")
    .reduce((total, item) => total + (Number(item.price) || 0), 0);
}
