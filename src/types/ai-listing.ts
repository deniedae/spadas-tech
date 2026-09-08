// AI listing domain types — additive, no existing types touched.
// AiGenerationStage is NOT exported here — it lives in lib/ai/listing-generator.ts.

export type Confidence = "high" | "medium" | "low";

export interface RetakeRecommendation {
  required: boolean;
  angle_type: "tag" | "hardware" | "material" | "focus" | "overall";
  reason: string;
  prompt_label: string;
}

export interface VisualReasoning {
  visible_text_detected: string[];
  physical_object_description: string;
  brand_identified: string | null;
  identification_reasoning: string;
}

export type ConditionGrade = "Mint" | "Good" | "Fair" | "For Parts";

export interface WearInspection {
  surface_wear?: string | null;
  scratching?: string | null;
  oxidisation?: string | null;
  patina?: string | null;
  packaging_completeness?: string | null;
}

/** What the vision model extracts from the uploaded photos. */
export interface ProductAnalysis {
  status?: "identified" | "unidentified";
  visual_reasoning?: VisualReasoning | null;
  product_name: string | null;
  brand: string | null;
  model: string | null;
  category: string;
  color: string | null;
  material: string | null;
  condition: string;
  condition_grade?: ConditionGrade | null;
  wear_inspection?: WearInspection | null;
  condition_modifier?: number | null;
  defect_notes?: string[];
  accessories_detected: string[];
  confidence: Confidence;
  confidence_score: number; // 0..1
  variant_audit?: VariantAuditRecord | null;
  retake_recommended?: RetakeRecommendation | null;
}

/** Marketplace-specific generated copy. */
export interface MarketTitles {
  ebay: string;
  facebook_marketplace: string;
  vinted: string;
  depop: string;
}

export type ShippingSize = "small" | "medium" | "large" | "extra-large";

export interface ShippingEstimate {
  size: ShippingSize;
  estimated_weight_grams: number;
  dimensions_cm: { length: number; width: number; height: number } | null;
  notes: string | null;
}

export type InventoryCondition = "untested" | "faulty_for_parts" | "used_working" | "refurbished";

export interface SalesVelocityEstimate {
  sell_speed: "FAST_FLIP" | "MODERATE" | "SLOW_BURNER";
  est_days_to_sell: string;
  demand_score: number;
  sell_through_rate: string;
}

export interface FutureGrailPrediction {
  is_future_grail: boolean;
  trend_source: string | null;
  viral_score: number;
  current_price: number;
  projected_peak_price: number;
  projected_roi_gain: string;
  holding_recommendation: string;
  value_curve: number[];
}

export type CopVerdict = "MUST_COP" | "QUICK_FLIP" | "FAIR_MARGIN" | "PASS_RISKY" | "VERIFY_FIRST";

export interface ThriftTagOcrData {
  detected_tag_price: number | null;
  tag_currency: string;
  tag_read_confidence: "high" | "medium" | "low" | "none";
  true_net_profit: number;
  roi_percentage: number;
  cop_verdict: CopVerdict;
}

export interface RawSoldCompRecord {
  id: string;
  title: string;
  price: number;
  condition?: string;
  sold_date?: string;
  shipping_included?: boolean;
  shipping_price?: number;
  url?: string;
  thumbnail?: string;
}

export interface VariantAuditRecord {
  variant_name?: string | null;
  model_year_or_gen?: string | null;
  colorway?: string | null;
  is_reprint_risk?: boolean;
  completeness?: "complete" | "incomplete_missing_parts" | "loose_only" | "bundle";
  reprint_warning?: string | null;
}

/** Full AI-generated listing payload. */
export interface AiListingResult {
  status?: "identified" | "unidentified";
  inventory_condition?: InventoryCondition;
  condition_grade?: ConditionGrade | null;
  wear_inspection?: WearInspection | null;
  condition_modifier?: number | null;
  defect_notes?: string[];
  as_is_disclaimer?: string;
  analysis: ProductAnalysis;
  market_titles: MarketTitles;
  seo_description: string;
  detailed_description: string;
  shipping_estimate: ShippingEstimate;
  item_specifics: Record<string, string>;
  suggested_keywords: string[];
  suggested_price_min: number;
  suggested_price_max: number;
  suggested_price_median?: number;
  suggested_price_currency: "USD" | "AUD" | "GBP" | "EUR";
  ebay_comps_count?: number;
  raw_sold_comps?: RawSoldCompRecord[];
  comps_range?: { min: number; max: number; median: number };
  variant_audit?: VariantAuditRecord;
  requires_secondary_verification?: boolean;
  verification_reason?: string | null;
  fallback_protocol?: "SCAN_BARCODE" | "ZOOM_LABEL" | "SECOND_ANGLE" | "NONE";
  sales_velocity?: SalesVelocityEstimate;
  future_grail?: FutureGrailPrediction;
  detected_tag_price?: number;
  true_net_profit?: number;
  roi_percentage?: number;
  cop_verdict?: CopVerdict;
  isMockFallback?: boolean;
  retake_recommended?: RetakeRecommendation | null;
  detected_objects?: Array<{
    id: string;
    product_name: string | null;
    brand: string | null;
    category: string;
    condition: string;
    bbox: { x: number; y: number; width: number; height: number };
    confidence_score: number;
    ebay_comps_count?: number;
    detected_tag_price?: number;
    true_net_profit?: number;
    roi_percentage?: number;
    cop_verdict?: CopVerdict;
    raw_sold_comps?: RawSoldCompRecord[];
    variant_audit?: VariantAuditRecord;
  }>;
}

/** Row in the ai_listing_analyses table. */
export interface AiListingAnalysisRecord {
  id: string;
  user_id: string;
  image_urls: string[];
  result: AiListingResult;
  listing_id: string | null; // set once the user saves it as a listing
  created_at: string;
}
