/**
 * Spadas Technology — Swoopa Chrome Extension Content Script
 * Automatically parses active Facebook Marketplace listing cards and syncs them to Spadas Radar!
 */

console.log("⚡ [SPADAS_SWOOPA_EXTENSION] Content Script Loaded on Facebook Marketplace!");

let syncedIds = new Set();

function parseAndSyncMarketplaceListings() {
  const listings = [];
  const itemLinks = document.querySelectorAll('a[href*="/marketplace/item/"]');

  itemLinks.forEach((anchor) => {
    const rawHref = anchor.href;
    if (!rawHref || !rawHref.includes("/marketplace/item/")) return;

    const itemId = rawHref.split("/marketplace/item/")[1]?.split("/")[0]?.split("?")[0];
    if (!itemId || syncedIds.has(itemId)) return;

    const canonicalUrl = `https://www.facebook.com/marketplace/item/${itemId}/`;
    const cardContainer = anchor.closest('div[role="article"]') || anchor.closest('div[style*="border-radius"]') || anchor.parentElement;
    const fullText = cardContainer ? cardContainer.innerText : anchor.innerText;
    const lines = fullText.split("\n").map((l) => l.trim()).filter(Boolean);

    // Extract price
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
      syncedIds.add(itemId);
      listings.push({
        id: itemId,
        title,
        price,
        imageUrl,
        itemUrl: canonicalUrl,
      });
    }
  });

  if (listings.length > 0) {
    console.log(`⚡ [SPADAS_SWOOPA] Syncing ${listings.length} live listings to Spadas Radar...`, listings);

    fetch("https://spadas-tech.vercel.app/api/radar/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listings }),
    })
      .then((r) => r.json())
      .then((data) => {
        console.log("✅ [SPADAS_SWOOPA] Sync complete!", data);
      })
      .catch((err) => console.warn("Spadas Swoopa Extension Sync Notice:", err));
  }
}

// Initial parse
setTimeout(parseAndSyncMarketplaceListings, 2000);

// Auto parse on scroll
window.addEventListener("scroll", () => {
  clearTimeout(window.__spadasDebounce);
  window.__spadasDebounce = setTimeout(parseAndSyncMarketplaceListings, 1500);
});
