/**
 * Spadas Technology — Swoopa-Grade Live Facebook Marketplace Payload Injector & Sync Engine
 * Captures real-time active listings directly from active logged-in browser sessions on facebook.com/marketplace
 * and syncs genuine raw listing objects to Spadas Radar!
 */
(function () {
  console.log("⚡ Spadas Swoopa Live Marketplace Payload Injector Initialized!");

  function extractLiveFacebookMarketplaceListings() {
    const listings = [];
    const itemLinks = document.querySelectorAll('a[href*="/marketplace/item/"]');
    const seenIds = new Set();

    itemLinks.forEach((anchor) => {
      const rawHref = anchor.href;
      if (!rawHref || !rawHref.includes("/marketplace/item/")) return;

      const itemId = rawHref.split("/marketplace/item/")[1]?.split("/")[0]?.split("?")[0];
      if (!itemId || seenIds.has(itemId)) return;
      seenIds.add(itemId);

      const canonicalUrl = `https://www.facebook.com/marketplace/item/${itemId}/`;
      const cardContainer = anchor.closest('div[role="article"]') || anchor.closest('div[style*="border-radius"]') || anchor.parentElement;
      const fullText = cardContainer ? cardContainer.innerText : anchor.innerText;
      const lines = fullText.split("\n").map((l) => l.trim()).filter(Boolean);

      // Extract raw price
      let price = 0;
      const priceLine = lines.find((l) => l.includes("$") || l.includes("A$") || l.includes("£") || l.includes("€"));
      if (priceLine) {
        const match = priceLine.replace(/[^0-9.]/g, "");
        if (match) price = parseFloat(match);
      }

      // Extract genuine title line
      let title = "";
      const titleLine = lines.find(
        (l) => !l.includes("$") && !l.includes("A$") && l.length > 3 && !l.toLowerCase().includes("miles") && !l.toLowerCase().includes("km") && !l.toLowerCase().includes("listed")
      );
      if (titleLine) {
        title = titleLine;
      }

      // Extract genuine fbcdn.net photo URI
      const img = cardContainer ? cardContainer.querySelector("img[src*='fbcdn.net']") || anchor.querySelector("img") : anchor.querySelector("img");
      const imageUrl = img ? img.src : "";

      if (title && price > 0) {
        listings.push({
          id: itemId,
          title,
          price,
          imageUrl,
          itemUrl: canonicalUrl,
        });
      }
    });

    return listings;
  }

  const liveListings = extractLiveFacebookMarketplaceListings();

  if (liveListings.length > 0) {
    console.log("⚡ [SWOOPA_INJECTOR] Captured Live Listings:", liveListings);

    // Sync to Spadas Radar API
    const syncTarget = window.location.hostname.includes("spadas-tech")
      ? "/api/radar/sync"
      : "https://spadas-tech.vercel.app/api/radar/sync";

    fetch(syncTarget, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listings: liveListings }),
    })
      .then((r) => r.json())
      .then((data) => {
        alert(
          `🎉 Spadas Swoopa captured ${liveListings.length} REAL active listings directly from your browser session!\n\n` +
          `Top Captured Item: "${liveListings[0].title}" ($${liveListings[0].price})\n\n` +
          `Synced to Spadas Radar feed!`
        );
      })
      .catch((err) => {
        console.warn("Spadas Swoopa Sync Notice:", err);
        alert(`⚡ Swoopa captured ${liveListings.length} REAL listings! (Check browser console for raw JSON objects).`);
      });
  } else {
    alert("⚡ Spadas Swoopa Scraper active! Scroll down on Facebook Marketplace to auto-capture active listings.");
  }
})();
