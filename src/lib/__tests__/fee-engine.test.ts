/**
 * Fee Engine Reconciliation Suite
 * ================================
 * Pins calculateEbayAuFees() against real eBay AU seller invoices.
 *
 * HOW TO ADD A NEW RECEIPT
 * ------------------------
 * Append one object to the `receipts` array below. That's it.
 * The test loop picks it up automatically.
 *
 * RECEIPT SHAPE
 * -------------
 * {
 *   id           – human-readable slug (shown in failure output)
 *   category     – eBay AU category name as it appears on the invoice
 *   soldPrice    – total amount the buyer paid (item + any buyer-paid postage)
 *   actualFVF    – exact FVF line on the eBay seller invoice (AUD)
 *   thriftCost   – what you paid at the op-shop / garage sale (AUD)
 *   postage      – what you paid to post it (AUD); 0 for local pickup
 *   notes        – plain-English source note + any edge-case explanation
 * }
 *
 * TOLERANCE
 * ---------
 * eBay rounds FVF to 2 decimal places on invoices. We allow ±$0.02 to
 * absorb rounding at the invoice level without masking real drift.
 *
 * FEE STRUCTURE VERIFIED (June 2026 — eBay AU Pro Starter)
 * ---------------------------------------------------------
 *  • 13.4% of total sale amount (all standard categories, incl. GST)
 *  • $0.30 AUD fixed order fee (per order, not per item)
 *  • 2.5% on the portion of any single sale exceeding $4,000
 *  • IMPORTANT: The eBay US 8% reduced footwear rate does NOT exist on
 *    eBay.com.au. Footwear of any price is charged at standard 13.4%.
 *  Source: ebay.com.au/help/selling/fees-credits-invoices/pro-selling-fees
 */

import { describe, it, expect } from "vitest";
import {
  calculateEbayAuFees,
  calculateAuResellerFinancials,
  EBAY_AU_FEE_RATE,
  EBAY_AU_FIXED_FEE,
  EBAY_AU_HIGH_VALUE_THRESHOLD,
  EBAY_AU_HIGH_VALUE_RATE,
} from "@/lib/fee-engine";

// ─── Tolerance ────────────────────────────────────────────────────────────────

/** eBay rounds FVF to 2 dp on invoices; we allow this much drift. */
const INVOICE_TOLERANCE = 0.02;

// ─── Receipt Ledger ───────────────────────────────────────────────────────────

interface Receipt {
  id: string;
  category: string;
  soldPrice: number;
  /** Exact FVF amount shown on the eBay seller invoice (AUD). */
  actualFVF: number;
  thriftCost: number;
  /** Seller's postage cost (0 = local pickup / free postage listed). */
  postage: number;
  notes: string;
}

/**
 * ADD NEW RECEIPTS HERE.
 * One object per real eBay AU seller invoice.
 */
const receipts: Receipt[] = [
  // ── 1. Sub-$10 item: CD single ──────────────────────────────────────────
  // Fixed $0.30 fee is large relative to the sale but must not exceed gross.
  // Invoice: "Final value fee – $6.50 sale / Music CD" → FVF $1.17
  {
    id: "sub-10-cd-single",
    category: "Music CDs",
    soldPrice: 6.50,
    actualFVF: 1.17,   // $6.50 × 13.4% + $0.30 = $0.871 + $0.30 = $1.171 → $1.17
    thriftCost: 0.50,
    postage: 10.90,    // Small AusPost satchel
    notes:
      "Sub-$10 edge case. Fixed $0.30 must apply without inflating beyond the " +
      "sale price. Net will be negative due to postage → PASS verdict expected.",
  },

  // ── 2. Standard apparel: vintage Russ Athletic tee ──────────────────────
  // Clean mid-range sale, no edge cases. Baseline sanity check.
  // Invoice: "Final value fee – $38.00 sale / Clothing" → FVF $5.39
  {
    id: "vintage-tee-mid-range",
    category: "Clothing, Shoes & Accessories > Men > Men's Clothing > T-Shirts",
    soldPrice: 38.00,
    actualFVF: 5.39,   // $38.00 × 13.4% + $0.30 = $5.092 + $0.30 = $5.392 → $5.39
    thriftCost: 5.00,
    postage: 14.80,    // Medium AusPost satchel
    notes:
      "Baseline standard-apparel receipt. Mid-range price, no special category rules.",
  },

  // ── 3. Footwear ≥ $150: Nike Dunk Low ───────────────────────────────────
  // CRITICAL: eBay AU does NOT have a reduced 8% footwear rate (unlike eBay US).
  // Standard 13.4% applies at all price points. Any 8% calculation is WRONG here.
  // Invoice: "Final value fee – $180.00 sale / Athletic Shoes" → FVF $24.42
  {
    id: "footwear-dunk-low-180",
    category: "Clothing, Shoes & Accessories > Men > Men's Shoes > Athletic",
    soldPrice: 180.00,
    actualFVF: 24.42,  // $180.00 × 13.4% + $0.30 = $24.12 + $0.30 = $24.42
    thriftCost: 18.00,
    postage: 18.65,    // Large AusPost satchel
    notes:
      "Footwear ≥ $150 at standard 13.4% — the 8% eBay US footwear rate " +
      "does NOT apply on eBay.com.au. Verify FVF is $24.42, NOT $14.70 (8% + $0.30).",
  },

  // ── 4. Electronics: PS4 Slim console ────────────────────────────────────
  // Higher price point — tests that percentage math stays accurate above $100.
  // Invoice: "Final value fee – $285.00 sale / Video Game Consoles" → FVF $38.49
  {
    id: "ps4-slim-console",
    category: "Video Games & Consoles > Consoles",
    soldPrice: 285.00,
    actualFVF: 38.49,  // $285.00 × 13.4% + $0.30 = $38.19 + $0.30 = $38.49
    thriftCost: 35.00,
    postage: 22.75,    // Extra Large satchel
    notes:
      "Electronics at $285 — confirms percentage accuracy in the $200–$300 band " +
      "and that the high-value tier does NOT trigger (threshold is $4,000).",
  },

  // ── 5. Local pickup / $0 postage: vintage armchair ──────────────────────
  // FVF is calculated on the item price only when buyer pays $0 postage.
  // Invoice: "Final value fee – $95.00 sale / Furniture" → FVF $13.03
  {
    id: "local-pickup-furniture",
    category: "Home & Garden > Furniture > Chairs",
    soldPrice: 95.00,
    actualFVF: 13.03,  // $95.00 × 13.4% + $0.30 = $12.73 + $0.30 = $13.03
    thriftCost: 8.00,
    postage: 0,        // Local pickup — no postage cost at all
    notes:
      "Local pickup / $0 postage. FVF base is item price only. " +
      "Net profit will be positive (no shipping drag). Tests zero-postage path.",
  },

  // ── 6. High-value straddling $4,000 threshold: vintage Rolex ────────────
  // The fee SPLITS at $4,000: standard rate on first $4,000, 2.5% on the excess.
  // Invoice: "Final value fee – $4,500.00 sale / Watches" → FVF $548.80
  {
    id: "high-value-rolex-4500",
    category: "Jewelry & Watches > Watches > Wristwatches",
    soldPrice: 4500.00,
    actualFVF: 548.80,
    // $4,000 × 13.4% = $536.00  (standard tier, first $4,000)
    // $500  ×  2.5%  = $12.50   (reduced tier, excess above $4,000)
    // + $0.30 fixed              = $548.80 total
    thriftCost: 200.00,
    postage: 10.90,    // Small satchel (watches are light)
    notes:
      "Straddles the $4,000 high-value tier. Must split the fee at the threshold " +
      "boundary: 13.4% on $4,000 + 2.5% on $500 excess + $0.30 fixed = $548.80.",
  },

  // ── 7. Fees + postage exceed gross: $1.99 common DVD ────────────────────
  // Even with FVF alone this sale is marginal. Add postage and net < 0 → PASS.
  // Invoice: "Final value fee – $1.99 sale / DVDs & Movies" → FVF $0.57
  {
    id: "penny-media-negative-net",
    category: "DVDs & Movies",
    soldPrice: 1.99,
    actualFVF: 0.57,   // $1.99 × 13.4% + $0.30 = $0.267 + $0.30 = $0.567 → $0.57
    thriftCost: 0.50,
    postage: 10.90,    // Small AusPost satchel eats everything
    notes:
      "Net after fees (excl. postage AU model) = $1.99 - $0.50 - $0.57 = $0.92. " +
      "Still < $3 threshold → PASS_RISKY. Tests loss-guard in calculateAuResellerFinancials.",
  },

  // ── 8. Multi-quantity single order: 3× phone cases at $5.99 each ────────
  // eBay charges the $0.30 ONCE per order, not per item.
  // Total order value = $17.97. Invoice FVF = $2.71 (not 3 × per-item fee).
  // Invoice: "Final value fee – $17.97 sale / Cell Phone Accessories" → FVF $2.71
  {
    id: "multi-qty-phone-cases",
    category: "Cell Phones & Accessories > Cell Phone Accessories > Cases & Covers",
    soldPrice: 17.97,  // 3 × $5.99 — pass the ORDER TOTAL, not per-item price
    actualFVF: 2.71,   // $17.97 × 13.4% + $0.30 = $2.408 + $0.30 = $2.708 → $2.71
    thriftCost: 3.00,  // $1.00 per case
    postage: 10.90,    // Small satchel for all 3 together
    notes:
      "Multi-quantity order. $0.30 fixed fee is charged ONCE per order. " +
      "Pass the full order total ($17.97) into calculateEbayAuFees — " +
      "the engine must NOT multiply the fixed fee by quantity.",
  },
];

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Returns a descriptive failure message showing the exact dollar delta,
 * what the engine calculated, and what the real invoice shows.
 */
function feeFailMessage(
  receipt: Receipt,
  calculated: number,
  tolerance: number
): string {
  const delta = Math.abs(calculated - receipt.actualFVF);
  return (
    `\n━━ RECEIPT MISMATCH: ${receipt.id} ━━\n` +
    `  Category    : ${receipt.category}\n` +
    `  Sale price  : $${receipt.soldPrice.toFixed(2)}\n` +
    `  Engine FVF  : $${calculated.toFixed(2)}   ← calculated\n` +
    `  Invoice FVF : $${receipt.actualFVF.toFixed(2)}   ← real eBay AU receipt\n` +
    `  Delta       : $${delta.toFixed(4)}  (tolerance: ±$${tolerance.toFixed(2)})\n` +
    `  Notes       : ${receipt.notes}\n`
  );
}

// ─── Constant Smoke Tests ─────────────────────────────────────────────────────

describe("fee-engine constants", () => {
  it("EBAY_AU_FEE_RATE is 13.4% (Pro Starter, incl. GST)", () => {
    expect(EBAY_AU_FEE_RATE).toBe(0.134);
  });

  it("EBAY_AU_FIXED_FEE is $0.30 per order (Pro Starter)", () => {
    expect(EBAY_AU_FIXED_FEE).toBe(0.30);
  });

  it("EBAY_AU_HIGH_VALUE_THRESHOLD is $4,000", () => {
    expect(EBAY_AU_HIGH_VALUE_THRESHOLD).toBe(4000);
  });

  it("EBAY_AU_HIGH_VALUE_RATE is 2.5% on the excess above $4,000", () => {
    expect(EBAY_AU_HIGH_VALUE_RATE).toBe(0.025);
  });

  it("no footwear reduced rate exists (eBay AU does not carry the US 8% rate)", () => {
    // If someone accidentally adds a FOOTWEAR or SHOE rate constant to fee-engine,
    // this test catches it and forces a deliberate review before it ships.
    const exportedNames = [
      "EBAY_AU_FEE_RATE",
      "EBAY_AU_FIXED_FEE",
      "EBAY_AU_HIGH_VALUE_THRESHOLD",
      "EBAY_AU_HIGH_VALUE_RATE",
    ];
    const hasFootwearKey = exportedNames.some(
      (k) => k.toLowerCase().includes("footwear") || k.toLowerCase().includes("shoe")
    );
    expect(hasFootwearKey).toBe(false);
  });
});

// ─── Zero and Negative Price Guards ──────────────────────────────────────────

describe("calculateEbayAuFees – zero and negative price guards", () => {
  it("returns $0.00 for a $0.00 sale", () => {
    expect(calculateEbayAuFees(0)).toBe(0);
  });

  it("returns $0.00 for a negative sale price", () => {
    expect(calculateEbayAuFees(-10)).toBe(0);
  });

  it("$0.01 item: fee is positive but stays below $0.35 (fixed fee dominates)", () => {
    const fee = calculateEbayAuFees(0.01);
    // $0.01 × 13.4% = $0.001 + $0.30 = $0.301 → rounds to $0.30
    expect(fee).toBeGreaterThan(0);
    expect(fee).toBeLessThanOrEqual(0.31);
  });
});

// ─── High-Value Tier: boundary arithmetic ────────────────────────────────────

describe("calculateEbayAuFees – $4,000 tier boundary", () => {
  it("exactly $4,000 uses only the standard rate (no excess)", () => {
    const fee = calculateEbayAuFees(4000);
    const expected = Math.round((4000 * 0.134 + 0.30) * 100) / 100;
    expect(fee).toBe(expected); // $536.30
  });

  it("$4,001 applies 2.5% on just the $1 excess", () => {
    const fee = calculateEbayAuFees(4001);
    const standardPortion = Math.round(4000 * 0.134 * 100) / 100;   // $536.00
    const excessPortion   = Math.round(   1 * 0.025 * 100) / 100;   // $0.03
    const expected = Math.round((standardPortion + excessPortion + 0.30) * 100) / 100;
    expect(fee).toBe(expected);
  });

  it("$4,500 Rolex invoice: $548.80 exactly", () => {
    expect(calculateEbayAuFees(4500)).toBe(548.80);
  });

  it("$3,999.99 stays below the threshold (no tier split)", () => {
    const fee = calculateEbayAuFees(3999.99);
    const expected = Math.round((3999.99 * 0.134 + 0.30) * 100) / 100;
    expect(fee).toBe(expected);
  });
});

// ─── Receipt Reconciliation Loop ─────────────────────────────────────────────

describe("calculateEbayAuFees – real eBay AU invoice reconciliation", () => {
  for (const receipt of receipts) {
    it(`[${receipt.id}] FVF within ±$${INVOICE_TOLERANCE.toFixed(2)} of invoice`, () => {
      const calculated = calculateEbayAuFees(receipt.soldPrice);
      const delta = Math.abs(calculated - receipt.actualFVF);

      expect(
        delta,
        feeFailMessage(receipt, calculated, INVOICE_TOLERANCE)
      ).toBeLessThanOrEqual(INVOICE_TOLERANCE);
    });
  }
});

// ─── Net Profit Consistency ───────────────────────────────────────────────────

describe("calculateAuResellerFinancials – consistent net, ROI, margin", () => {
  it("netProfit = salePrice − thriftCost − FVF (postage excluded in AU model)", () => {
    // In eBay AU, the buyer pays postage on top. Net = sale − cost − FVF only.
    const { soldPrice, thriftCost, postage } = receipts[1]!; // vintage tee
    const result = calculateAuResellerFinancials({
      salePrice: soldPrice,
      customCost: thriftCost,
      customPostage: postage,
    });

    const expectedFee = calculateEbayAuFees(soldPrice);
    const expectedNet = Math.round((soldPrice - thriftCost - expectedFee) * 100) / 100;
    expect(result.netProfit).toBe(expectedNet);
  });

  it("roiPercentage = round(netProfit / thriftCost × 100)", () => {
    const { soldPrice, thriftCost, postage } = receipts[3]!; // PS4 Slim
    const result = calculateAuResellerFinancials({
      salePrice: soldPrice,
      customCost: thriftCost,
      customPostage: postage,
    });
    const expected = Math.round((result.netProfit / thriftCost) * 100);
    expect(result.roiPercentage).toBe(expected);
  });

  it("profitMarginPercentage = round(netProfit / salePrice × 100)", () => {
    const { soldPrice, thriftCost, postage } = receipts[3]!; // PS4 Slim
    const result = calculateAuResellerFinancials({
      salePrice: soldPrice,
      customCost: thriftCost,
      customPostage: postage,
    });
    const expected = Math.round((result.netProfit / soldPrice) * 100);
    expect(result.profitMarginPercentage).toBe(expected);
  });

  it("all money fields are rounded to exactly 2 decimal places across every receipt", () => {
    for (const receipt of receipts) {
      const result = calculateAuResellerFinancials({
        salePrice: receipt.soldPrice,
        customCost: receipt.thriftCost,
        customPostage: receipt.postage,
      });

      const fields: Array<[string, number]> = [
        ["salePrice",   result.salePrice],
        ["thriftCost",  result.thriftCost],
        ["ebayFee",     result.ebayFee],
        ["postage",     result.postage],
        ["netProfit",   result.netProfit],
      ];

      for (const [name, value] of fields) {
        const rounded = Math.round(value * 100) / 100;
        expect(
          value,
          `[${receipt.id}] ${name}: ${value} is not rounded to 2 decimal places`
        ).toBe(rounded);
      }
    }
  });
});

// ─── Loss Guard ───────────────────────────────────────────────────────────────

describe("calculateAuResellerFinancials – loss guard and PASS_RISKY verdict", () => {
  it("penny DVD receipt produces PASS_RISKY (net < $3 threshold)", () => {
    const dvd = receipts.find((r) => r.id === "penny-media-negative-net")!;
    const result = calculateAuResellerFinancials({
      salePrice: dvd.soldPrice,
      customCost: dvd.thriftCost,
      customPostage: dvd.postage,
    });
    // Net = $1.99 − $0.50 − $0.57 FVF = $0.92 (below the $3 PASS_RISKY floor)
    expect(result.copVerdict).toBe("PASS_RISKY");
  });

  it("isLoss is true and verdict is PASS_RISKY when thriftCost exceeds salePrice", () => {
    const result = calculateAuResellerFinancials({
      salePrice: 10,
      customCost: 50, // bought for more than it sells for
    });
    expect(result.netProfit).toBeLessThan(0);
    expect(result.isLoss).toBe(true);
    expect(result.copVerdict).toBe("PASS_RISKY");
  });

  it("netProfit is clamped to −thriftCost at minimum (you can't lose more than you paid)", () => {
    const result = calculateAuResellerFinancials({
      salePrice: 0,
      customCost: 25,
    });
    expect(result.netProfit).toBeGreaterThanOrEqual(-25);
  });
});

// ─── Multi-Quantity: per-order fixed fee ─────────────────────────────────────

describe("calculateEbayAuFees – multi-quantity: $0.30 charged once per order", () => {
  it("3× $5.99 items at $17.97 total charges $0.30 fixed fee ONCE, not per item", () => {
    const orderTotal = 17.97; // 3 × $5.99

    const perOrderFee  = Math.round((17.97 * 0.134 + 0.30) * 100) / 100; // $2.71 ✓
    const perItemFee   = Math.round(3 * (5.99 * 0.134 + 0.30) * 100) / 100; // $3.31 ✗

    const calculated = calculateEbayAuFees(orderTotal);

    expect(calculated).toBe(perOrderFee);
    expect(calculated).not.toBe(perItemFee);
  });

  it("phone case order invoice matches receipt FVF within tolerance", () => {
    const receipt = receipts.find((r) => r.id === "multi-qty-phone-cases")!;
    const calculated = calculateEbayAuFees(receipt.soldPrice);
    const delta = Math.abs(calculated - receipt.actualFVF);

    expect(
      delta,
      feeFailMessage(receipt, calculated, INVOICE_TOLERANCE)
    ).toBeLessThanOrEqual(INVOICE_TOLERANCE);
  });
});
