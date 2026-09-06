const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const publicDir = path.join(__dirname, "..", "public");

function createSvgIcon(isMaskable = false) {
  // 512x512 viewBox
  // Safe zone for maskable icon is center 338x338 (radius ~169 from center 256, 256)
  
  return `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#090d16"/>
      <stop offset="50%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e1b4b"/>
    </linearGradient>

    <linearGradient id="neonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="50%" stop-color="#2563eb"/>
      <stop offset="100%" stop-color="#4f46e5"/>
    </linearGradient>

    <linearGradient id="whiteGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#e0f2fe"/>
    </linearGradient>

    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#10b981"/>
      <stop offset="100%" stop-color="#06b6d4"/>
    </linearGradient>

    <radialGradient id="glowRing" cx="50%" cy="50%" r="50%">
      <stop offset="40%" stop-color="#2563eb" stop-opacity="0.35"/>
      <stop offset="80%" stop-color="#38bdf8" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>

    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#0284c7" flood-opacity="0.5"/>
    </filter>
  </defs>

  ${
    isMaskable
      ? `<rect width="512" height="512" fill="url(#bgGrad)"/>`
      : `<rect width="512" height="512" rx="115" fill="url(#bgGrad)" stroke="#2563eb" stroke-width="4"/>`
  }

  <!-- Ambient Glow Ring -->
  <circle cx="256" cy="256" r="180" fill="url(#glowRing)"/>

  <!-- Outer Camera / Lens Reticle Ring (Thin Cyan) -->
  <circle cx="256" cy="256" r="148" fill="none" stroke="#0284c7" stroke-width="2.5" stroke-dasharray="16 8" opacity="0.6"/>

  <!-- 4 Corner Target Brackets (AR Lens Scanner HUD) -->
  <!-- Top-Left -->
  <path d="M 170 200 L 170 170 L 200 170" fill="none" stroke="#38bdf8" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
  <!-- Top-Right -->
  <path d="M 312 170 L 342 170 L 342 200" fill="none" stroke="#38bdf8" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
  <!-- Bottom-Left -->
  <path d="M 170 312 L 170 342 L 200 342" fill="none" stroke="#38bdf8" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
  <!-- Bottom-Right -->
  <path d="M 312 342 L 342 342 L 342 312" fill="none" stroke="#38bdf8" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>

  <!-- Central Camera Aperture Core Circle -->
  <circle cx="256" cy="256" r="85" fill="#0f172a" stroke="url(#neonGrad)" stroke-width="5" filter="url(#shadow)"/>

  <!-- Razor-Sharp White SPADAS 'S' Monogram & Lightning Glyph -->
  <path d="
    M 285 195
    C 285 195 240 190 226 210
    C 212 230 220 244 246 250
    L 266 254
    C 292 260 300 274 286 295
    C 272 316 226 313 226 313
    L 220 326
    C 220 326 278 332 298 304
    C 318 276 304 256 276 248
    L 256 244
    C 232 238 226 228 238 212
    C 250 196 292 201 292 201
    Z
  " fill="url(#whiteGrad)" filter="url(#shadow)"/>

  <!-- High-Velocity Dynamic Laser Accent (Lightning Bolt Center) -->
  <polygon points="262,230 236,268 254,268 244,286 276,248 258,248" fill="url(#accentGrad)"/>

  <!-- Scanning Reticle Center Point -->
  <circle cx="256" cy="256" r="4" fill="#38bdf8"/>
</svg>
`;
}

async function buildAllIcons() {
  console.log("🎨 Generating high-contrast vector icons for Spadas AI...");

  const standardSvg = Buffer.from(createSvgIcon(false));
  const maskableSvg = Buffer.from(createSvgIcon(true));

  // 1. icon-512.png (standard)
  await sharp(standardSvg).resize(512, 512).png().toFile(path.join(publicDir, "icon-512.png"));
  console.log("✓ Created public/icon-512.png (512x512)");

  // 2. icon-192.png (standard)
  await sharp(standardSvg).resize(192, 192).png().toFile(path.join(publicDir, "icon-192.png"));
  console.log("✓ Created public/icon-192.png (192x192)");

  // 3. maskable-512.png (adaptive icon)
  await sharp(maskableSvg).resize(512, 512).png().toFile(path.join(publicDir, "maskable-512.png"));
  console.log("✓ Created public/maskable-512.png (512x512 maskable)");

  // 4. maskable-192.png (adaptive icon)
  await sharp(maskableSvg).resize(192, 192).png().toFile(path.join(publicDir, "maskable-192.png"));
  console.log("✓ Created public/maskable-192.png (192x192 maskable)");

  // 5. store-icon-512.png (Play store / store kits)
  await sharp(standardSvg).resize(512, 512).png().toFile(path.join(publicDir, "store-icon-512.png"));
  console.log("✓ Created public/store-icon-512.png (512x512 store icon)");

  // 6. icon-1024.png
  await sharp(standardSvg).resize(1024, 1024).png().toFile(path.join(publicDir, "icon-1024.png"));
  console.log("✓ Created public/icon-1024.png (1024x1024 master icon)");

  console.log("\n🎉 All high-contrast Spadas AI icons successfully generated!");
}

buildAllIcons().catch((err) => {
  console.error("Error generating icons:", err);
  process.exit(1);
});
