const https = require('https');

function fetchFollow(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 302 && res.headers.location) {
          console.log(`Redirected (302) to: ${res.headers.location}`);
          resolve(fetchFollow(res.headers.location));
        } else {
          console.log(`Final Status: ${res.statusCode}`);
          console.log("Body snippet:", data.slice(0, 500));
          resolve();
        }
      });
    });
  });
}

const params = new URLSearchParams({
  client_id: "mathewsp-SpadasTe-PRD-3a4b27176-16d3ec44",
  response_type: "code",
  redirect_uri: "mathew_spada-mathewsp-Spadas-nfyqlyy",
  scope: "https://api.ebay.com/oauth/api_scope https://api.ebay.com/oauth/api_scope/sell.inventory https://api.ebay.com/oauth/api_scope/sell.fulfillment",
  state: "test"
});

console.log("Testing full redirect chain for properly formatted URL...");
fetchFollow(`https://auth.ebay.com/oauth2/authorize?${params.toString()}`);
