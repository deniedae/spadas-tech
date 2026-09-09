/**
 * Shared types for Spadas Lens AR scanner.
 * Imported by spadas-lens-camera.tsx, lens-hit-card.tsx, lens-comps-modal.tsx, and lens-controls-bar.tsx.
 */

export interface RawSoldComp {
  id: string;
  title: string;
  price: number;
  condition?: string;
  soldDate?: string;
  shippingIncluded?: boolean;
  shippingPrice?: number;
  url?: string;
  thumbnail?: string;
}

export interface VariantAudit {
  variantName?: string | null;
  modelYearOrGen?: string | null;
  colorway?: string | null;
  isReprintRisk?: boolean;
  completeness?: "complete" | "incomplete_missing_parts" | "loose_only" | "bundle";
  reprintWarning?: string | null;
}

export type CopVerdict = "MUST_COP" | "QUICK_FLIP" | "FAIR_MARGIN" | "PASS_RISKY" | "VERIFY_FIRST";

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
  copVerdict?: CopVerdict;
  conditionGrade?: "Mint" | "Good" | "Fair" | "For Parts";
  wearInspection?: {
    surface_wear?: string | null;
    scratching?: string | null;
    oxidisation?: string | null;
    patina?: string | null;
    packaging_completeness?: string | null;
  };
  conditionModifier?: number;
  image?: string | null;
  /** Number of eBay listings found (active or sold depending on compsSource) */
  ebayCompsCount?: number;
  /** Data source used for price comps — drives the UI label */
  compsSource?: "browse_api" | "sold_comps_api" | "ai_estimate" | "intel_p2p";
  /** Underlying real sold listings for full auditability */
  rawComps?: RawSoldComp[];
  /** Min, max, and median price distribution */
  compsRange?: {
    min: number;
    max: number;
    median: number;
  };
  /** Telemetry check separating near-matches, reprints, and model variants */
  variantAudit?: VariantAudit;
  /** Guardrail flag: true if visual confidence < 88% or variant unconfirmed */
  requiresSecondaryVerification?: boolean;
  verificationReason?: string | null;
  fallbackProtocol?: "SCAN_BARCODE" | "ZOOM_LABEL" | "SECOND_ANGLE" | "NONE";
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
  compsSource?: "browse_api" | "sold_comps_api" | "ai_estimate" | "intel_p2p";
  rawComps?: RawSoldComp[];
  compsRange?: {
    min: number;
    max: number;
    median: number;
  };
  variantAudit?: VariantAudit;
  requiresSecondaryVerification?: boolean;
  verificationReason?: string | null;
  fallbackProtocol?: "SCAN_BARCODE" | "ZOOM_LABEL" | "SECOND_ANGLE" | "NONE";
  estCost?: number;
  estimatedProfit?: number;
  estRoi?: number;
  tagPrice?: number;
  trueNetProfit?: number;
  roiPercentage?: number;
  copVerdict?: CopVerdict;
  image?: string | null;
  ocrText?: string[];
  timestamp: number;
}
