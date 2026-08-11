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

const vckKey = process.env.VERCEL_AI_KEY || process.env.LING_API_KEY;

async function testEndpoints() {
  const endpoints = [
    "https://openrouter.ai/api/v1",
    "https://api.vck.vercel.app/v1",
    "https://gateway.ai.cloudflare.com/v1",
  ];

  for (const url of endpoints) {
    console.log(`\n--- Testing URL: ${url} ---`);
    try {
      const client = new OpenAI({ apiKey: vckKey, baseURL: url });
      const res = await client.chat.completions.create({
        model: "openai/gpt-4o-mini",
        messages: [{ role: "user", content: "Hi" }],
        max_tokens: 5,
      });
      console.log(`🎉 SUCCESS at ${url}:`, res.choices[0].message.content);
    } catch (err) {
      console.error(`❌ FAILED at ${url}:`, err.message);
    }
  }
}

testEndpoints();
