/**
 * Spadas Technology — Swoopa Chrome Extension Background Service Worker
 * Handles cross-origin background fetch requests from Facebook Marketplace tab to Spadas Radar API!
 */

console.log("⚡ [SPADAS_SWOOPA_BACKGROUND] Service Worker Loaded!");

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SYNC_LISTINGS" && Array.isArray(message.listings)) {
    console.log(`⚡ [SPADAS_SWOOPA_BG] Background Service Worker posting ${message.listings.length} listings to Spadas Radar...`);

    fetch("https://spadas-tech.vercel.app/api/radar/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ listings: message.listings }),
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("✅ [SPADAS_SWOOPA_BG] Background Sync Success:", data);
        sendResponse({ success: true, data });
      })
      .catch((err) => {
        console.warn("⚠️ [SPADAS_SWOOPA_BG] Background Sync Notice:", err);
        sendResponse({ success: false, error: err.toString() });
      });

    return true; // Keep message channel open for async response
  }
});
