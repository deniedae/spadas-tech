/**
 * Shared types for Spadas Lens AR scanner.
 * Imported by spadas-lens-camera.tsx, lens-hit-card.tsx, and lens-controls-bar.tsx.
 */

export interface DetectedHit {
  id: string;
  name: string;
  brand?: string | null;
  category: string;
  condition: string;
  visualReasoning?: {
    visible_text_detected?: string[];
    physical_object_description?: string;
  };
  inventoryCondition?: "untested" | "faulty_for_parts" | "used_working" | "refurbished";
  defectNotes?: string[];
  asIsDisclaimer?: string;
  estimatedValue: number;
  estCost: number;
  estimatedProfit: number;
  estRoi: number;
  verdict: "BUY" | "CAUTION" | "PASS";
  confidence: number;
  bbox: { x: number; y: number; width: number; height: number };
  timestamp: number;
  isGrail?: boolean;
  tagPrice?: number;
  trueNetProfit?: number;
  roiPercentage?: number;
  copVerdict?: "MUST_COP" | "QUICK_FLIP" | "FAIR_MARGIN" | "PASS_RISKY";
  image?: string | null;
  /** Number of eBay listings found (active or sold depending on compsSource) */
  ebayCompsCount?: number;
  /** Data source used for price comps — drives the UI label */
  compsSource?: "browse_api" | "sold_comps_api" | "ai_estimate";
  salesVelocity?: {
    sell_speed: "FAST_FLIP" | "MODERATE" | "SLOW_BURNER";
    est_days_to_sell: string;
    demand_score: number;
    sell_through_rate: string;
  };
  futureGrail?: {
    is_future_grail: boolean;
    trend_source: string | null;
    viral_score: number;
    current_price: number;
    projected_peak_price: number;
    projected_roi_gain: string;
    holding_recommendation: string;
    value_curve: number[];
  };
}

export interface ActiveScanItem {
  id: string;
  productName: string;
  brand?: string | null;
  category: string;
  condition: string;
  inventoryCondition?: "untested" | "faulty_for_parts" | "used_working" | "refurbished";
  defectNotes?: string[];
  asIsDisclaimer?: string;
  bbox: { x: number; y: number; width: number; height: number };
  status: "pending" | "valued" | "rejected";
  estimatedValue?: number;
  suggestedPriceMin?: number;
  suggestedPriceMax?: number;
  confidenceScore?: number;
  ebayCompsCount?: number;
  compsSource?: "browse_api" | "sold_comps_api" | "ai_estimate";
  estCost?: number;
  estimatedProfit?: number;
  estRoi?: number;
  tagPrice?: number;
  trueNetProfit?: number;
  roiPercentage?: number;
  copVerdict?: "MUST_COP" | "QUICK_FLIP" | "FAIR_MARGIN" | "PASS_RISKY";
  image?: string | null;
  timestamp: number;
}
