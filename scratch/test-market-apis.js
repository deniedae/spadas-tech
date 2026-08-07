process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

async function testMarketApis() {
  const query = "Nintendo Switch";

  const endpoints = [
    `https://api.sold-comps.com/v1/scrape?keyword=${encodeURIComponent(query)}&ebaySite=ebay.com.au&page=1&count=8&daysToScrape=30&sortOrder=endedRecently`,
    `https://dummyjson.com/products/search?q=${encodeURIComponent(query)}`,
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Authorization: "Bearer sc_live_f893a2e791b34c02911b",
        },
      });
      console.log(`Endpoint: ${url} -> Status: ${res.status}`);
      if (res.ok) {
        const text = await res.text();
        console.log(`Response length: ${text.length}`);
        console.log("Snippet:", text.substring(0, 300));
      }
    } catch (e) {
      console.error(`Error fetching ${url}:`, e);
    }
  }
}

testMarketApis();
