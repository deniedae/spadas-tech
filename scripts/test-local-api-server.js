const fs = require('fs');
const path = require('path');
const http = require('http');

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

async function testGenerateRoute() {
  const samplePayload = JSON.stringify({
    product: "Sony PlayStation 5 Console Disc Edition"
  });

  console.log("\nSending POST request to http://localhost:3000/api/generate...");

  const req = http.request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/generate',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(samplePayload)
    }
  }, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      console.log(`HTTP Status: ${res.statusCode}`);
      console.log(`Response Body: ${data}`);
    });
  });

  req.on('error', (e) => {
    console.error(`Request failed: ${e.message}`);
  });

  req.write(samplePayload);
  req.end();
}

testGenerateRoute();
