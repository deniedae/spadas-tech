// AI listing domain types — additive, no existing types touched.
// AiGenerationStage is NOT exported here — it lives in lib/ai/listing-generator.ts.

export type Confidence = "high" | "medium" | "low";

/** What the vision model extracts from the uploaded photos. */
export interface ProductAnalysis {
  product_name: string;
  brand: string | null;
  model: string | null;
  category: string;
  color: string | null;
  material: string | null;
  condition: string;
  accessories_detected: string[];
  confidence: Confidence;
  confidence_score: number; // 0..1
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

/** Full AI-generated listing payload. */
export interface AiListingResult {
  inventory_condition?: InventoryCondition;
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
  sales_velocity?: SalesVelocityEstimate;
  future_grail?: FutureGrailPrediction;
  isMockFallback?: boolean;
  detected_objects?: Array<{
    id: string;
    product_name: string | null;
    brand: string | null;
    category: string;
    condition: string;
    bbox: { x: number; y: number; width: number; height: number };
    confidence_score: number;
    ebay_comps_count?: number;
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
