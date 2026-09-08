const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

console.log('======================================================');
console.log('  Spadas AI — Google Play Icon & Feature Graphic Suite');
console.log('======================================================\n');

const rootDir = path.resolve(__dirname, '..');
const playKitDir = path.join(rootDir, 'store_packages', 'google_play_kit');
const publicDir = path.join(rootDir, 'public');
const rawDir = path.join(rootDir, 'scratch', 'raw_screenshots');
const downloadsDir = path.join(process.env.USERPROFILE || 'C:\\Users\\denie', 'Downloads', 'Google_Play_Screenshots');

if (!fs.existsSync(playKitDir)) {
  fs.mkdirSync(playKitDir, { recursive: true });
}
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
}

// -------------------------------------------------------------
// 1. GENERATE ULTRA-PREMIUM 512x512 APP ICON
// -------------------------------------------------------------
async function generateAppIcon() {
  console.log('--- Generating 512x512 App Icon ---');
  const SIZE = 512;

  const iconSvg = Buffer.from(`
    <svg width="${SIZE}" height="${SIZE}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Background Obsidian Gradient -->
        <linearGradient id="bgObsidian" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0b1120"/>
          <stop offset="50%" stop-color="#060911"/>
          <stop offset="100%" stop-color="#020408"/>
        </linearGradient>

        <!-- Outer Ring Cyan Glow Gradient -->
        <linearGradient id="ringCyan" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#38bdf8"/>
          <stop offset="50%" stop-color="#06b6d4"/>
          <stop offset="100%" stop-color="#2563eb"/>
        </linearGradient>

        <!-- Amber Core Shutter Gradient -->
        <linearGradient id="amberCore" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fbbf24"/>
          <stop offset="50%" stop-color="#f59e0b"/>
          <stop offset="100%" stop-color="#ea580c"/>
        </linearGradient>

        <!-- Glass Gloss Sheen -->
        <linearGradient id="glassGloss" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.18"/>
          <stop offset="45%" stop-color="#ffffff" stop-opacity="0.04"/>
          <stop offset="50%" stop-color="#ffffff" stop-opacity="0"/>
        </linearGradient>

        <!-- Glow Filter -->
        <filter id="glowFilter" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="16" result="blur"/>
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>
        <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" result="blur"/>
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>
      </defs>

      <!-- App Icon Squircle Base (Google Play rounded squircle standard) -->
      <rect x="0" y="0" width="512" height="512" rx="115" ry="115" fill="url(#bgObsidian)"/>
      <rect x="2" y="2" width="508" height="508" rx="113" ry="113" fill="none" stroke="#1e293b" stroke-width="4"/>
      <rect x="6" y="6" width="500" height="500" rx="109" ry="109" fill="none" stroke="#0ea5e9" stroke-opacity="0.2" stroke-width="2"/>

      <!-- Ambient Glow Behind Aperture -->
      <circle cx="256" cy="256" r="160" fill="#0284c7" opacity="0.18" filter="url(#glowFilter)"/>
      <circle cx="256" cy="256" r="90" fill="#f59e0b" opacity="0.12" filter="url(#glowFilter)"/>

      <!-- Outer AR Viewfinder Corner Reticles -->
      <path d="M 80,140 L 80,80 L 140,80" fill="none" stroke="#38bdf8" stroke-width="8" stroke-linecap="round"/>
      <path d="M 432,140 L 432,80 L 372,80" fill="none" stroke="#38bdf8" stroke-width="8" stroke-linecap="round"/>
      <path d="M 80,372 L 80,432 L 140,432" fill="none" stroke="#38bdf8" stroke-width="8" stroke-linecap="round"/>
      <path d="M 432,372 L 432,432 L 372,432" fill="none" stroke="#38bdf8" stroke-width="8" stroke-linecap="round"/>

      <!-- Outer Optical Lens Ring -->
      <circle cx="256" cy="256" r="158" fill="#090e1a" stroke="url(#ringCyan)" stroke-width="8" filter="url(#softGlow)"/>
      <circle cx="256" cy="256" r="142" fill="none" stroke="#1e293b" stroke-width="3" stroke-dasharray="12 8"/>

      <!-- Intermediate Lens Ring with Metallic Chamfer -->
      <circle cx="256" cy="256" r="124" fill="#0c1322" stroke="#334155" stroke-width="4"/>
      <circle cx="256" cy="256" r="110" fill="#070c16"/>

      <!-- Glowing Cyan Camera Aperture Blades (6 Blades) -->
      <g stroke="#0369a1" stroke-width="2" opacity="0.85">
        <line x1="256" y1="146" x2="330" y2="210"/>
        <line x1="351" y1="201" x2="330" y2="300"/>
        <line x1="351" y1="311" x2="256" y2="366"/>
        <line x1="256" y1="366" x2="182" y2="300"/>
        <line x1="161" y1="311" x2="182" y2="210"/>
        <line x1="161" y1="201" x2="256" y2="146"/>
      </g>

      <!-- Center Holographic Shutter Ring -->
      <circle cx="256" cy="256" r="76" fill="url(#bgObsidian)" stroke="url(#amberCore)" stroke-width="6" filter="url(#softGlow)"/>
      <circle cx="256" cy="256" r="62" fill="#050811" stroke="#f59e0b" stroke-opacity="0.4" stroke-width="2"/>

      <!-- Central Lightning Flash Bolt (Instant Sourcing & Camera Speed Emblem) -->
      <g filter="url(#softGlow)">
        <polygon points="266,206 234,258 260,258 246,306 284,248 258,248" fill="url(#amberCore)" stroke="#fef08a" stroke-width="2" stroke-linejoin="round"/>
      </g>

      <!-- Optical Lens Glass Reflection (Top Half Sheen) -->
      <path d="M 100,200 C 130,130 190,100 256,100 C 322,100 382,130 412,200 C 350,220 280,230 200,220 Z" fill="url(#glassGloss)"/>

      <!-- Subtle SPADAS Brand Wordmark at Bottom of Emblem -->
      <text x="256" y="475" font-size="24" font-weight="900" fill="#38bdf8" text-anchor="middle" letter-spacing="7" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" opacity="0.9">
        SPADAS
      </text>
    </svg>
  `);

  const iconBuffer = await sharp(iconSvg)
    .png({ quality: 100, compressionLevel: 9 })
    .toBuffer();

  const iconPlayKit = path.join(playKitDir, '1_app_icon_512x512.png');
  const iconPublic = path.join(publicDir, 'store-icon-512.png');
  const iconPublicStandard = path.join(publicDir, 'icon-512.png');
  const iconDownloads = path.join(downloadsDir, '1_app_icon_512x512.png');

  fs.writeFileSync(iconPlayKit, iconBuffer);
  fs.writeFileSync(iconPublic, iconBuffer);
  fs.writeFileSync(iconPublicStandard, iconBuffer);
  fs.writeFileSync(iconDownloads, iconBuffer);

  console.log('✓ Saved App Icon (512x512) to:');
  console.log('  •', iconPlayKit);
  console.log('  •', iconPublic);
  console.log('  •', iconDownloads);
}

// -------------------------------------------------------------
// 2. GENERATE ULTRA-PREMIUM 1024x500 FEATURE GRAPHIC
// -------------------------------------------------------------
async function generateFeatureGraphic() {
  console.log('\n--- Generating 1024x500 Feature Graphic ---');
  const WIDTH = 1024;
  const HEIGHT = 500;

  // Prepare device preview on right side using real Christian Dior Valuation scan
  const diorScreenshotPath = path.join(rawDir, 'media_1788866120491.jpg');
  const MOCKUP_W = 320;
  const MOCKUP_H = 430;

  let phoneScreenBuffer = null;
  if (fs.existsSync(diorScreenshotPath)) {
    const croppedScreen = await sharp(diorScreenshotPath)
      .extract({ left: 0, top: 116, width: 472, height: 848 })
      .resize(MOCKUP_W - 16, MOCKUP_H - 16, { fit: 'cover', position: 'top' })
      .sharpen({ sigma: 0.8, m1: 1.0, m2: 2.0 })
      .toBuffer();

    const phoneMask = Buffer.from(`
      <svg width="${MOCKUP_W - 16}" height="${MOCKUP_H - 16}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${MOCKUP_W - 16}" height="${MOCKUP_H - 16}" rx="24" ry="24" fill="#ffffff"/>
      </svg>
    `);

    phoneScreenBuffer = await sharp(croppedScreen)
      .composite([{ input: phoneMask, blend: 'dest-in' }])
      .png()
      .toBuffer();
  }

  const featureSvg = Buffer.from(`
    <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 1024 500" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Deep Cinematic Dark Background -->
        <linearGradient id="featBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#060911"/>
          <stop offset="45%" stop-color="#09101f"/>
          <stop offset="100%" stop-color="#04070d"/>
        </linearGradient>

        <!-- Ambient Cyan/Indigo Glow on Left -->
        <radialGradient id="leftGlow" cx="25%" cy="50%" r="60%">
          <stop offset="0%" stop-color="#0284c7" stop-opacity="0.32"/>
          <stop offset="50%" stop-color="#3b82f6" stop-opacity="0.12"/>
          <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
        </radialGradient>

        <!-- Ambient Amber/Emerald Glow behind Phone on Right -->
        <radialGradient id="rightGlow" cx="78%" cy="50%" r="55%">
          <stop offset="0%" stop-color="#10b981" stop-opacity="0.25"/>
          <stop offset="45%" stop-color="#06b6d4" stop-opacity="0.15"/>
          <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
        </radialGradient>

        <!-- Brand Text Cyan Gradient -->
        <linearGradient id="cyanTextGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#38bdf8"/>
          <stop offset="50%" stop-color="#22d3ee"/>
          <stop offset="100%" stop-color="#34d399"/>
        </linearGradient>

        <!-- Gold Pill Gradient -->
        <linearGradient id="goldPill" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#f59e0b"/>
          <stop offset="100%" stop-color="#ea580c"/>
        </linearGradient>

        <!-- Phone Drop Shadow -->
        <filter id="phoneShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="-10" dy="18" stdDeviation="22" flood-color="#000000" flood-opacity="0.85"/>
          <feDropShadow dx="0" dy="0" stdDeviation="25" flood-color="#06b6d4" flood-opacity="0.3"/>
        </filter>
      </defs>

      <!-- Backgrounds -->
      <rect width="1024" height="500" fill="url(#featBg)"/>
      <rect width="1024" height="500" fill="url(#leftGlow)"/>
      <rect width="1024" height="500" fill="url(#rightGlow)"/>

      <!-- Grid Overlay Lines (Tech Cyber Vibe) -->
      <g stroke="#1e293b" stroke-width="1" stroke-opacity="0.35">
        <line x1="0" y1="100" x2="1024" y2="100"/>
        <line x1="0" y1="200" x2="1024" y2="200"/>
        <line x1="0" y1="300" x2="1024" y2="300"/>
        <line x1="0" y1="400" x2="1024" y2="400"/>
        <line x1="150" y1="0" x2="150" y2="500"/>
        <line x1="300" y1="0" x2="300" y2="500"/>
        <line x1="450" y1="0" x2="450" y2="500"/>
        <line x1="600" y1="0" x2="600" y2="500"/>
      </g>

      <!-- LEFT COLUMN: Brand, Headline, Value Props -->
      <g transform="translate(60, 0)">
        <!-- Brand Eyebrow Tag -->
        <g transform="translate(0, 58)">
          <rect width="250" height="34" rx="17" ry="17" fill="#0f172a" stroke="#38bdf8" stroke-width="1.5"/>
          <circle cx="18" cy="17" r="5" fill="#38bdf8"/>
          <text x="32" y="22" font-size="12" font-weight="900" fill="#38bdf8" letter-spacing="1.5" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
            SPADAS LENS AR 2.0
          </text>
        </g>

        <!-- Big Bold Hero Title -->
        <text x="0" y="152" font-size="52" font-weight="900" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" letter-spacing="-1">
          Scan Thrift Aisles.
        </text>
        <text x="0" y="210" font-size="52" font-weight="900" fill="url(#cyanTextGrad)" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" letter-spacing="-1">
          Know Exact Profit.
        </text>

        <!-- Subtitle -->
        <text x="0" y="258" font-size="18" font-weight="500" fill="#94a3b8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
          Instant 60 FPS camera scanner with real eBay Australia sold comps,
        </text>
        <text x="0" y="284" font-size="18" font-weight="500" fill="#94a3b8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
          automated profit deduction, and 1-click cross-listing.
        </text>

        <!-- Feature Highlight Badges / Pills -->
        <g transform="translate(0, 328)">
          <!-- Pill 1: 60 FPS Scanner -->
          <g transform="translate(0, 0)">
            <rect width="168" height="40" rx="12" ry="12" fill="#0f172a" stroke="#0284c7" stroke-width="1.2"/>
            <text x="14" y="25" font-size="13" font-weight="800" fill="#38bdf8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
              ⚡ 60 FPS AR Vision
            </text>
          </g>

          <!-- Pill 2: Real eBay Comps -->
          <g transform="translate(180, 0)">
            <rect width="186" height="40" rx="12" ry="12" fill="#0f172a" stroke="#059669" stroke-width="1.2"/>
            <text x="14" y="25" font-size="13" font-weight="800" fill="#34d399" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
              💰 Live eBay Sold Comps
            </text>
          </g>

          <!-- Pill 3: 1-Click Listing -->
          <g transform="translate(378, 0)">
            <rect width="176" height="40" rx="12" ry="12" fill="#0f172a" stroke="#d97706" stroke-width="1.2"/>
            <text x="14" y="25" font-size="13" font-weight="800" fill="#fbbf24" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
              🚀 1-Click Cross-List
            </text>
          </g>
        </g>

        <!-- Trust / Rating Footer -->
        <g transform="translate(0, 412)">
          <text x="0" y="24" font-size="20" fill="#fbbf24">★★★★★</text>
          <text x="95" y="22" font-size="13" font-weight="700" fill="#e2e8f0" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
            Rated 4.9/5 by Australian Resellers &amp; PowerSellers
          </text>
        </g>
      </g>

      <!-- RIGHT COLUMN: Smartphone Chassis Mockup -->
      <g transform="translate(660, 35)" filter="url(#phoneShadow)">
        <!-- Outer Titanium Bezel -->
        <rect width="${MOCKUP_W}" height="${MOCKUP_H}" rx="32" ry="32" fill="#0a0f1d" stroke="#334155" stroke-width="3"/>
        <rect x="2" y="2" width="${MOCKUP_W - 4}" height="${MOCKUP_H - 4}" rx="30" ry="30" fill="none" stroke="#1e293b" stroke-width="1.5"/>
      </g>
    </svg>
  `);

  const baseFeature = await sharp(featureSvg).png().toBuffer();

  // Composite real device screen onto phone chassis if available
  let finalFeatureBuffer = baseFeature;
  if (phoneScreenBuffer) {
    finalFeatureBuffer = await sharp(baseFeature)
      .composite([
        {
          input: phoneScreenBuffer,
          left: 668,
          top: 43,
        },
        // Overlay Camera Punch-hole Notch
        {
          input: Buffer.from(`
            <svg width="80" height="18" xmlns="http://www.w3.org/2000/svg">
              <rect width="80" height="18" rx="9" ry="9" fill="#000000" stroke="#1e293b" stroke-width="1"/>
              <circle cx="58" cy="9" r="4" fill="#070b14"/>
            </svg>
          `),
          left: 660 + Math.round((MOCKUP_W - 80) / 2),
          top: 43 + 8,
        },
      ])
      .png({ quality: 95 })
      .toBuffer();
  }

  // 1. Google Play 24-bit RGB PNG (1024x500, no alpha for strict Google Play store requirements)
  const featPlayKit = path.join(playKitDir, '2_feature_graphic_1024x500.png');
  const featPlayKitJpg = path.join(playKitDir, 'promo_1024x500.jpg');
  const featPublic = path.join(publicDir, 'store-feature-graphic-1024x500.png');
  const featDownloadsPng = path.join(downloadsDir, '2_feature_graphic_1024x500.png');
  const featDownloadsJpg = path.join(downloadsDir, '2_feature_graphic_1024x500.jpg');

  // Convert to 24-bit RGB (remove alpha channel)
  const rgbFeature = await sharp(finalFeatureBuffer)
    .removeAlpha()
    .png()
    .toBuffer();

  const jpgFeature = await sharp(finalFeatureBuffer)
    .jpeg({ quality: 94, mozjpeg: true })
    .toBuffer();

  fs.writeFileSync(featPlayKit, rgbFeature);
  fs.writeFileSync(featPlayKitJpg, jpgFeature);
  fs.writeFileSync(featPublic, rgbFeature);
  fs.writeFileSync(featDownloadsPng, rgbFeature);
  fs.writeFileSync(featDownloadsJpg, jpgFeature);

  console.log('✓ Saved Feature Graphic (1024x500) to:');
  console.log('  •', featPlayKit);
  console.log('  •', featPlayKitJpg);
  console.log('  •', featPublic);
  console.log('  •', featDownloadsPng);
  console.log('  •', featDownloadsJpg);
}

async function main() {
  await generateAppIcon();
  await generateFeatureGraphic();
  console.log('\n🎉 ALL STORE BRANDING GRAPHICS GENERATED & MIRRORED SUCCESSFULLY!\n');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
