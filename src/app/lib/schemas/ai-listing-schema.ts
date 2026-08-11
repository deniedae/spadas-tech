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

export const DetectedObjectSchema = z.object({
  id: z.string(),
  product_name: z.string().nullable(),
  brand: z.string().nullable(),
  category: z.string(),
  condition: z.string(),
  bbox: BoundingBoxSchema,
  confidence_score: z.number(),
});

export const ProductAnalysisSchema = z.object({
  product_name: z.string().nullable(),
  brand: z.string().nullable(),
  model: z.string().nullable(),
  category: z.string(),
  color: z.string().nullable(),
  material: z.string().nullable(),
  condition: z.string(),
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

export const AiListingResultSchema = z.object({
  detected_objects: z.array(DetectedObjectSchema).optional(),
  analysis: ProductAnalysisSchema,
  market_titles: MarketTitlesSchema,
  seo_description: z.string(),
  detailed_description: z.string(),
  shipping_estimate: ShippingEstimateSchema,
  item_specifics: z.record(z.string(), z.string()),
  suggested_keywords: z.array(z.string()),
  suggested_price_min: z.number(),
  suggested_price_max: z.number(),
  suggested_price_currency: z.enum(["USD", "AUD", "GBP", "EUR"]),
});

export type GenerateListingSchemaType = z.infer<typeof GenerateListingSchema>;
export type AiListingResultSchemaType = z.infer<typeof AiListingResultSchema>;
