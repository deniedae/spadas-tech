export function fmtMoney(n: number): string {
  return (Number(n) || 0).toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
  });
}

export const PLATFORM_FEE_RATES: Record<string, number> = {
  ebay: 0.1325,
  poshmark: 0.2,
  mercari: 0.1,
  depop: 0.1,
  facebook: 0.05,
  vinted: 0.0,
};

export function getPlatformFeeRate(platformName?: string | null): number {
  if (!platformName) return 0.1; // Default 10%
  const p = platformName.toLowerCase().trim();
  if (p.includes("ebay")) return PLATFORM_FEE_RATES.ebay;
  if (p.includes("poshmark")) return PLATFORM_FEE_RATES.poshmark;
  if (p.includes("mercari")) return PLATFORM_FEE_RATES.mercari;
  if (p.includes("depop")) return PLATFORM_FEE_RATES.depop;
  if (p.includes("facebook") || p.includes("fb")) return PLATFORM_FEE_RATES.facebook;
  if (p.includes("vinted")) return PLATFORM_FEE_RATES.vinted;
  return 0.1;
}

export function calcItemFees(
  salePrice: number,
  platformName?: string | null,
  customFees?: number | string | null
): number {
  const custom = Number(customFees ?? 0);
  if (custom > 0) return custom;
  const rate = getPlatformFeeRate(platformName);
  return Math.round(salePrice * rate * 100) / 100;
}

export interface DetailedProfitResult {
  soldPrice: number;
  cogs: number;
  shipping: number;
  platformFee: number;
  netProfit: number;
  marginPct: number;
  roiPct: number;
}

export function calcDetailedProfit(item: {
  price?: number | string | null;
  sold_price?: number | string | null;
  purchase_price?: number | string | null;
  cost?: number | string | null;
  shipping_cost?: number | string | null;
  fees?: number | string | null;
  platform?: string | null;
  status?: string | null;
}): DetailedProfitResult {
  const soldPrice = Number(item.sold_price ?? item.price ?? 0) || 0;
  const cogs = Number(item.purchase_price ?? item.cost ?? 0) || 0;
  const shipping = Number(item.shipping_cost ?? 0) || 0;
  const platformFee = calcItemFees(soldPrice, item.platform, item.fees);
  const netProfit = Math.round((soldPrice - cogs - shipping - platformFee) * 100) / 100;

  const marginPct = soldPrice > 0 ? Math.round((netProfit / soldPrice) * 1000) / 10 : 0;
  const roiPct = cogs > 0 ? Math.round((netProfit / cogs) * 1000) / 10 : 0;

  return {
    soldPrice,
    cogs,
    shipping,
    platformFee,
    netProfit,
    marginPct,
    roiPct,
  };
}

export function calcProfit(item: {
  price?: number | string | null;
  purchase_price?: number | string | null;
  cost?: number | string | null;
  sold_price?: number | string | null;
  shipping_cost?: number | string | null;
  fees?: number | string | null;
  platform?: string | null;
  status?: string | null;
}): number {
  const status = (item.status ?? "").toLowerCase();
  const isSold = status === "sold" || Number(item.sold_price ?? 0) > 0;
  if (!isSold) return 0;
  return calcDetailedProfit(item).netProfit;
}

export function calcInventoryValue(items: Array<{ status?: string; price?: number | string | null }>): number {
  return items
    .filter((item) => (item.status ?? "").toLowerCase() !== "sold")
    .reduce((total, item) => total + (Number(item.price) || 0), 0);
}
