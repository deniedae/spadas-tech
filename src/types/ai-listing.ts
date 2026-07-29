export type AiGenerationStage =
  | "uploading"
  | "analyzing"
  | "identifying"
  | "pricing"
  | "generating"
  | "complete";

export type Confidence = "high" | "medium" | "low";

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
  confidence_score: number;
}

export interface MarketTitles {
  ebay: string;
  facebook_marketplace: string;
  vinted: string;
  depop: string;
}

export interface ShippingEstimate {
  size: "small" | "medium" | "large" | "extra-large";
  estimated_weight_grams: number;
  dimensions_cm: {
    length: number;
    width: number;
    height: number;
  } | null;
  notes: string | null;
}

export interface AiListingResult {
  analysis: ProductAnalysis;

  market_titles: MarketTitles;

  seo_description: string;

  detailed_description: string;

  shipping_estimate: ShippingEstimate;

  item_specifics: Record<string, string>;

  suggested_keywords: string[];

  suggested_price_min: number;

  suggested_price_max: number;

  suggested_price_currency: "AUD";
}

export interface AiListingAnalysisRecord {
  id: string;
  created_at: string;
  listing_id: string | null;
  result: AiListingResult;
}

export type ShippingSize =
  | "small"
  | "medium"
  | "large"
  | "extra-large";