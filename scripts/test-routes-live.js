const fs = require('fs');
const path = require('path');

// Read .env.local
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

const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function testAllRoutes() {
  console.log("=== STEP 1: Direct OpenAI API Key Diagnostic ===");
  console.log("API Key loaded:", process.env.OPENAI_API_KEY ? `${process.env.OPENAI_API_KEY.slice(0, 15)}...` : "MISSING!");

  try {
    const res1 = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "Test" }],
      max_tokens: 5,
    });
    console.log("✅ gpt-4o-mini completion SUCCESS:", res1.choices[0].message.content);
  } catch (e) {
    console.error("❌ gpt-4o-mini completion FAILED:", e.status, e.code, e.message);
  }

  try {
    const res2 = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: "Test" }],
      max_tokens: 5,
    });
    console.log("✅ gpt-4o completion SUCCESS:", res2.choices[0].message.content);
  } catch (e) {
    console.error("❌ gpt-4o completion FAILED:", e.status, e.code, e.message);
  }

  console.log("\n=== STEP 2: Zod Structured Output Completion Diagnostic ===");
  try {
    const res3 = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "test_schema",
          strict: true,
          schema: {
            type: "object",
            properties: {
              title: { type: "string" },
              price: { type: "number" }
            },
            required: ["title", "price"],
            additionalProperties: false
          }
        }
      },
      messages: [{ role: "user", content: "Sell a blue mug for 15 AUD" }],
    });
    console.log("✅ Structured Output SUCCESS:", res3.choices[0].message.content);
  } catch (e) {
    console.error("❌ Structured Output FAILED:", e.status, e.code, e.message);
  }
}

testAllRoutes();
