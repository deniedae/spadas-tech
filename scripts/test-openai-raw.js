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

const openAiKey = process.env.OPENAI_API_KEY;
console.log("Testing OPENAI_API_KEY:", openAiKey ? `${openAiKey.slice(0, 15)}...` : "MISSING");

async function probeOpenAiKey() {
  try {
    const client = new OpenAI({ apiKey: openAiKey });
    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "Hi" }],
      max_tokens: 5,
    });
    console.log("🎉 OPENAI_API_KEY WORKS 100%! Response:", res.choices[0].message.content);
  } catch (err) {
    console.error("❌ OPENAI_API_KEY FAILED:", err.message);
  }
}

probeOpenAiKey();
