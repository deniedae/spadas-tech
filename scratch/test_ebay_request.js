const https = require('https');

// Test 1: URL with unencoded scope & prompt=login (our old code)
const oldUrl = "https://auth.ebay.com/oauth2/authorize?client_id=mathewsp-SpadasTe-PRD-3a4b27176-16d3ec44&response_type=code&redirect_uri=mathew_spada-mathewsp-Spadas-nfyqlyy&scope=https://api.ebay.com/oauth/api_scope%20https://api.ebay.com/oauth/api_scope/sell.inventory%20https://api.ebay.com/oauth/api_scope/sell.fulfillment&state=test&prompt=login";

// Test 2: Standard URLSearchParams properly encoded without prompt=login
const params = new URLSearchParams({
  client_id: "mathewsp-SpadasTe-PRD-3a4b27176-16d3ec44",
  response_type: "code",
  redirect_uri: "mathew_spada-mathewsp-Spadas-nfyqlyy",
  scope: "https://api.ebay.com/oauth/api_scope https://api.ebay.com/oauth/api_scope/sell.inventory https://api.ebay.com/oauth/api_scope/sell.fulfillment",
  state: "test"
});
const newUrl = `https://auth.ebay.com/oauth2/authorize?${params.toString()}`;

function check(url, label) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`=== ${label} (Status ${res.statusCode}) ===`);
        console.log("Headers:", res.headers.location || "(no redirect)");
        console.log("Body snippet:", data.slice(0, 300));
        resolve();
      });
    });
  });
}

async function run() {
  await check(oldUrl, "OLD URL (with unencoded scope + prompt=login)");
  await check(newUrl, "NEW URL (URLSearchParams encoded without prompt)");
}
run();
