const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

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

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function runVisionTest() {
  console.log("\n--- Vision Completion Test ---");
  try {
    const visionRes = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Identify this item in 5 words" },
            {
              type: "image_url",
              image_url: {
                url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
                detail: "low"
              }
            }
          ]
        }
      ],
      max_tokens: 15,
    });
    console.log("🎉 VISION SUCCESS! Response:", visionRes.choices[0].message.content);
  } catch (err) {
    console.error("❌ VISION FAILED:", err);
  }
}

runVisionTest();
