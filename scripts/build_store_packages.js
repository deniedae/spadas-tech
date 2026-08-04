const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("==========================================");
console.log("  Spadas AI — Cross-Platform Build Suite ");
console.log("==========================================");

const rootDir = path.join(__dirname, "..");
const distDir = path.join(rootDir, "store_packages");

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

console.log("\n1. Verifying Web App Manifest & Assets...");
const manifestPath = path.join(rootDir, "public", "manifest.json");
if (fs.existsSync(manifestPath)) {
  console.log(" ✓ manifest.json verified");
} else {
  console.error(" ✗ manifest.json missing!");
  process.exit(1);
}

console.log("\n2. Checking Google Play (Android TWA) Config...");
const twaPath = path.join(rootDir, "twa-manifest.json");
if (fs.existsSync(twaPath)) {
  console.log(" ✓ twa-manifest.json ready for Google Play");
}

console.log("\n3. Checking Microsoft Store (Windows MSIX) Config...");
const winPath = path.join(rootDir, "windows-appx.json");
if (fs.existsSync(winPath)) {
  console.log(" ✓ windows-appx.json ready for Microsoft Store");
}

console.log("\n------------------------------------------");
console.log("How to package your app for stores:");
console.log("------------------------------------------");
console.log("📱 Google Play Store (Android):");
console.log("   Option A (PWABuilder): Visit https://www.pwabuilder.com, enter your app URL, click 'Build My PWA' -> 'Android' -> Download .aab package.");
console.log("   Option B (CLI): Run `npx @bubblewrap/cli build` in this directory to generate your signed .aab / .apk package.");
console.log("\n💻 Microsoft Store (Windows):");
console.log("   Option A (PWABuilder): Visit https://www.pwabuilder.com, enter your app URL, click 'Build My PWA' -> 'Windows' -> Download .msix package.");
console.log("   Option B (CLI): Use PWABuilder CLI or PWA2MSIX with `windows-appx.json`.");
console.log("==========================================\n");
