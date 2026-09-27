const fs = require("fs");
const path = require("path");

console.log("==========================================");
console.log(" 📦 Spadas AI — Google Play Publishing Kit ");
console.log("==========================================\n");

const rootDir = path.join(__dirname, "..");
const publicDir = path.join(rootDir, "public");
const outDir = path.join(rootDir, "store_packages", "google_play_kit");
const downloadsDir = path.join(process.env.USERPROFILE || 'C:\\Users\\denie', 'Downloads', 'Google_Play_Screenshots');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
}

// 1. Copy Store Icon (512x512)
const iconSrc = path.join(publicDir, "store-icon-512.png");
const iconDest = path.join(outDir, "1_app_icon_512x512.png");
if (fs.existsSync(iconSrc)) {
  fs.copyFileSync(iconSrc, iconDest);
  fs.copyFileSync(iconSrc, path.join(downloadsDir, "1_app_icon_512x512.png"));
  console.log("✓ Copied App Icon: 1_app_icon_512x512.png (512x512, Full Bleed Square)");
}

// 2. Copy Feature Graphic (1024x500)
const featSrc = path.join(publicDir, "store-feature-graphic-1024x500.png");
const featDest = path.join(outDir, "2_feature_graphic_1024x500.png");
if (fs.existsSync(featSrc)) {
  fs.copyFileSync(featSrc, featDest);
  fs.copyFileSync(featSrc, path.join(downloadsDir, "2_feature_graphic_1024x500.png"));
  console.log("✓ Copied Feature Graphic: 2_feature_graphic_1024x500.png (1024x500, 24-bit RGB)");
}

// 3. Copy All 5 Phone Screenshots (1080x1920)
const screenshots = [
  { file: "screen_1_lens_scanner_1080.png", slot: "3_screenshot_lens_scanner.png" },
  { file: "screen_2_valuation_profit_1080.png", slot: "4_screenshot_net_profit_calculator.png" },
  { file: "screen_3_sold_comps_analysis_1080.png", slot: "5_screenshot_sold_comps.png" },
  { file: "screen_4_cross_listing_inventory_1080.png", slot: "6_screenshot_inventory_vault.png" },
  { file: "screen_5_reseller_reviews_1080.png", slot: "7_screenshot_reseller_reviews.png" },
];

screenshots.forEach((s) => {
  const sPath = path.join(outDir, s.file);
  if (fs.existsSync(sPath)) {
    fs.copyFileSync(sPath, path.join(outDir, s.slot));
    fs.copyFileSync(sPath, path.join(downloadsDir, s.slot));
    console.log(`✓ Copied Screenshot: ${s.slot} (1080x1920)`);
  }
});

// 4. Generate Metadata Text for Play Store Listing
const metadataText = `# Spadas AI — Google Play Store Listing Copy

## App Title (Max 30 chars):
Reseller Scanner - Spadas Lens

## Short Description (Max 80 chars):
Instant barcode scanner, real eBay sold comps & net profit calculator.

## Full Description:
Supercharge your thrift, garage sale, and retail arbitrage flips with Spadas AI!

⚡ ULTRA-FAST HARDWARE SCANNER
• Scan 60 FPS barcodes and item labels in rapid succession with Turbo Batch Mode.
• Built-in camera flashlight control to illuminate dim thrift store shelves.
• Audio and tactile haptic scan feedback.

💰 REAL-TIME EBAY PRICE COMPS & VALUE APPRAISAL
• Instant estimated resale prices, net profit calculations, and ROI metrics.
• Live sales velocity indicators (Sell-through rate, fast-flip vs slow-burner tags).
• Grail detector alerts for high-value collectibles and rare vintage items.

📸 1-CLICK AI LISTING CREATOR
• Generate optimized eBay, Poshmark, and Mercari titles, item specifics, and descriptions from photos.
• Auto-enhancement & contrast tuning for high-accuracy product matching.

📊 COMPLETE INVENTORY & PROFIT TRACKER
• Track cost of goods (COGS), active inventory value, and monthly net profit.
• Android Home Screen Widget with live stats & 1-tap scan shortcut.
• Quick Settings drop-down tile to scan from anywhere on your phone.

---
## Required Store Info:
• Category: Business / Shopping
• Privacy Policy URL: https://spadas-tech.vercel.app/privacy
• Support Email: support@spadas.tech (or your email)
• Target Audience: 13+
`;

fs.writeFileSync(path.join(outDir, "PLAY_STORE_LISTING_METADATA.txt"), metadataText, "utf8");
fs.writeFileSync(path.join(downloadsDir, "PLAY_STORE_LISTING_METADATA.txt"), metadataText, "utf8");
console.log("✓ Created PLAY_STORE_LISTING_METADATA.txt");

console.log("\n🎉 Google Play Store Kit is ready at:");
console.log("  • Workspace: store_packages/google_play_kit/");
console.log("  • Windows Downloads: C:\\Users\\denie\\Downloads\\Google_Play_Screenshots\n");
