import { z } from "zod";

export const GenerateListingSchema = z.object({
  title: z.string().describe("SEO-friendly listing title under 80 characters"),
  description: z
    .string()
    .describe("Professional 2-3 short sentences, plain text, no markdown, no emoji"),
  price: z
    .number()
    .describe("Realistic Australian resale price in AUD as a number"),
});

export const BoundingBoxSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
});

export const InventoryConditionEnum = z.enum([
  "untested",
  "faulty_for_parts",
  "used_working",
  "refurbished",
]);

export const DetectedObjectSchema = z.object({
  id: z.string(),
  product_name: z.string().nullable(),
  brand: z.string().nullable(),
  category: z.string(),
  condition: z.string(),
  inventory_condition: InventoryConditionEnum,
  bbox: BoundingBoxSchema,
  confidence_score: z.number(),
});

export const VisualReasoningSchema = z.object({
  visible_text_detected: z
    .array(z.string())
    .describe("Every word, title, brand name, model number, or text printed on the product transcribed verbatim via OCR"),
  physical_object_description: z
    .string()
    .describe("Physical description of the object: color, material, form factor, and distinguishing features"),
  brand_identified: z
    .string()
    .nullable()
    .describe("Verified brand name if a logo/text is visible on the product, or null if unbranded or generic"),
  identification_reasoning: z
    .string()
    .describe("Step-by-step reasoning explaining why this exact item is identified based on the visual evidence"),
});

export const ProductAnalysisSchema = z.object({
  visual_reasoning: VisualReasoningSchema.nullable(),
  product_name: z.string().nullable(),
  brand: z.string().nullable(),
  model: z.string().nullable(),
  category: z.string(),
  color: z.string().nullable(),
  material: z.string().nullable(),
  condition: z.string(),
  inventory_condition: InventoryConditionEnum,
  defect_notes: z.array(z.string()),
  as_is_disclaimer: z.string().nullable(),
  accessories_detected: z.array(z.string()),
  confidence: z.enum(["high", "medium", "low"]),
  confidence_score: z.number(),
});

export const MarketTitlesSchema = z.object({
  ebay: z.string(),
  facebook_marketplace: z.string(),
  vinted: z.string(),
  depop: z.string(),
});

export const DimensionsCmSchema = z.object({
  length: z.number(),
  width: z.number(),
  height: z.number(),
});

export const ShippingEstimateSchema = z.object({
  size: z.enum(["small", "medium", "large", "extra-large"]),
  estimated_weight_grams: z.number(),
  dimensions_cm: DimensionsCmSchema.nullable(),
  notes: z.string().nullable(),
});

export const ItemSpecificSchema = z.object({
  name: z.string(),
  value: z.string(),
});

export const SalesVelocitySchema = z.object({
  sell_speed: z.enum(["FAST_FLIP", "MODERATE", "SLOW_BURNER"]),
  est_days_to_sell: z.string(),
  demand_score: z.number(),
  sell_through_rate: z.string(),
});

export const FutureGrailSchema = z.object({
  is_future_grail: z.boolean(),
  trend_source: z.string().nullable(),
  viral_score: z.number(),
  current_price: z.number(),
  projected_peak_price: z.number(),
  projected_roi_gain: z.string(),
  holding_recommendation: z.string(),
  value_curve: z.array(z.number()),
});

export const AiListingResultSchema = z.object({
  inventory_condition: InventoryConditionEnum,
  defect_notes: z.array(z.string()),
  as_is_disclaimer: z.string().nullable(),
  detected_objects: z.array(DetectedObjectSchema).nullable(),
  analysis: ProductAnalysisSchema,
  market_titles: MarketTitlesSchema,
  seo_description: z.string(),
  detailed_description: z.string(),
  shipping_estimate: ShippingEstimateSchema.nullable(),
  item_specifics: z.array(ItemSpecificSchema),
  suggested_keywords: z.array(z.string()),
  suggested_price_min: z.number(),
  suggested_price_max: z.number(),
  suggested_price_currency: z.string(),
  sales_velocity: SalesVelocitySchema.nullable(),
  future_grail: FutureGrailSchema.nullable(),
});

export type GenerateListingSchemaType = z.infer<typeof GenerateListingSchema>;
export type AiListingResultSchemaType = z.infer<typeof AiListingResultSchema>;
