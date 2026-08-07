process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

async function testEbayRss() {
  const query = "Nintendo Switch";
  const rssUrl = `https://www.ebay.com.au/sch/i.html?_nkw=${encodeURIComponent(query)}&_rss=1`;

  try {
    const res = await fetch(rssUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    console.log("Response status:", res.status);
    const xml = await res.text();
    console.log("XML Length:", xml.length);

    // Extract item titles, links, descriptions, prices
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match;
    const items = [];
    while ((match = itemRegex.exec(xml)) !== null) {
      const itemXml = match[1];
      const titleMatch = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/i) || itemXml.match(/<title>(.*?)<\/title>/i);
      const linkMatch = itemXml.match(/<link>(.*?)<\/link>/i);
      const imgMatch = itemXml.match(/src="(https:\/\/[^"]+)"/i);

      if (titleMatch && linkMatch) {
        items.push({
          title: titleMatch[1].replace(/<[^>]+>/g, "").trim(),
          link: linkMatch[1].trim(),
          image: imgMatch ? imgMatch[1] : "",
        });
      }
    }

    console.log("Extracted RSS items count:", items.length);
    console.log("First 3 items:", items.slice(0, 3));
  } catch (err) {
    console.error("Test failed:", err);
  }
}

testEbayRss();
