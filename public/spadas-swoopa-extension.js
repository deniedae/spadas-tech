/**
 * Spadas Technology — Swoopa-Style Live Facebook Marketplace Extension & DOM Sourcer
 * Runs directly inside logged-in Facebook Marketplace browser tabs to extract real-time active listings!
 */
(function () {
  console.log("⚡ Spadas Swoopa Live Marketplace Sourcer Initialized!");

  function extractLiveFacebookMarketplaceListings() {
    const listings = [];
    const itemLinks = document.querySelectorAll('a[href*="/marketplace/item/"]');

    itemLinks.forEach((anchor) => {
      const href = anchor.href;
      const cardContainer = anchor.closest('div[role="article"]') || anchor.parentElement;
      const fullText = cardContainer ? cardContainer.innerText : anchor.innerText;
      const lines = fullText.split("\n").map(l => l.trim()).filter(Boolean);

      // Extract price (e.g. $150 or A$150)
      let price = 0;
      let title = "Facebook Marketplace Deal";
      const priceLine = lines.find(l => l.includes("$"));
      if (priceLine) {
        const match = priceLine.replace(/[^0-9.]/g, "");
        if (match) price = parseFloat(match);
      }

      // Extract title line
      const titleLine = lines.find(l => !l.includes("$") && l.length > 5 && !l.toLowerCase().includes("miles") && !l.toLowerCase().includes("km"));
      if (titleLine) {
        title = titleLine;
      }

      // Extract thumbnail image
      const img = anchor.querySelector("img");
      const imageUrl = img ? img.src : "";

      if (href && (title || price)) {
        listings.push({
          id: href.split("/marketplace/item/")[1]?.split("/")[0] || Math.random().toString(),
          title,
          price,
          url: href,
          imageUrl,
        });
      }
    });

    return listings;
  }

  const liveListings = extractLiveFacebookMarketplaceListings();

  if (liveListings.length > 0) {
    alert(`🎉 Spadas Swoopa Sourcer successfully captured ${liveListings.length} REAL active Facebook Marketplace listings from your logged-in session!\n\nTop Item: ${liveListings[0].title} ($${liveListings[0].price})`);
    console.log("Live Facebook Listings Extracted:", liveListings);
  } else {
    alert("⚡ Spadas Swoopa Sourcer is active! Scroll down on Facebook Marketplace to auto-capture active listings.");
  }
})();
