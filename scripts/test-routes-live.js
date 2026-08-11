const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
const { zodResponseFormat } = require('openai/helpers/zod');
const { z } = require('zod');

const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2].trim();
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      process.env[key] = value;
    }
  });
}

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const InventoryConditionEnum = z.enum([
  "untested",
  "faulty_for_parts",
  "used_working",
  "refurbished"
]);

const AiListingResultSchema = z.object({
  detected_objects: z.array(
    z.object({
      id: z.string(),
      product_name: z.string().nullable(),
      brand: z.string().nullable(),
      category: z.string(),
      condition: z.string(),
      inventory_condition: InventoryConditionEnum,
      bbox: z.object({
        x: z.number(),
        y: z.number(),
        width: z.number(),
        height: z.number(),
      }),
      confidence_score: z.number(),
    })
  ).nullable(),
  analysis: z.object({
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
    confidence: z.enum(["high", "medium", "low"]),
    confidence_score: z.number(),
    accessories_detected: z.array(z.string()),
  }),
  market_titles: z.object({
    ebay: z.string(),
    facebook_marketplace: z.string(),
    vinted: z.string(),
    depop: z.string(),
  }),
  seo_description: z.string(),
  detailed_description: z.string(),
  suggested_price_min: z.number(),
  suggested_price_max: z.number(),
  suggested_price_currency: z.string(),
  shipping_estimate: z.object({
    size: z.enum(["small", "medium", "large", "extra-large"]),
    estimated_weight_grams: z.number(),
    dimensions_cm: z.object({
      length: z.number(),
      width: z.number(),
      height: z.number(),
    }).nullable(),
    notes: z.string().nullable(),
  }).nullable(),
  suggested_keywords: z.array(z.string()),
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const testImageBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

async function testFullZodVisionCall() {
  console.log("=== Testing Full Zod AiListingResultSchema Vision Call ===");
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.0,
      response_format: zodResponseFormat(AiListingResultSchema, "ai_listing_analysis"),
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Evaluate item: Sony Walkman cassette player" },
            {
              type: "image_url",
              image_url: { url: testImageBase64, detail: "low" }
            }
          ]
        }
      ]
    });
    console.log("🎉 FULL ZOD VISION SUCCESS!");
    console.log("Parsed content:", completion.choices[0].message.content.slice(0, 300));
  } catch (err) {
    console.error("❌ FULL ZOD VISION FAILED:", err.status, err.code, err.message);
  }
}

testFullZodVisionCall();
