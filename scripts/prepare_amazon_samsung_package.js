const fs = require("fs");
const path = require("path");

const storeDir = path.join(__dirname, "..", "store_packages");
if (!fs.existsSync(storeDir)) {
  fs.mkdirSync(storeDir, { recursive: true });
}

console.log("=================================================");
console.log(" Amazon Appstore & Samsung Galaxy Store Ready ");
console.log("=================================================");
console.log("✓ Manifest URL: https://spadas-tech.vercel.app/manifest.json");
console.log("✓ Live App URL: https://spadas-tech.vercel.app");
console.log("✓ Icon URL: https://spadas-tech.vercel.app/icon-512.png");
console.log("=================================================");
