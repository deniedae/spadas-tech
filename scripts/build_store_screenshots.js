const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

console.log('======================================================');
console.log('  Spadas AI — Premium Google Play Screenshots Suite   ');
console.log('======================================================\n');

const rawDir = path.join(__dirname, '..', 'scratch', 'raw_screenshots');
const outDir = path.join(__dirname, '..', 'store_packages', 'google_play_kit');
const publicDir = path.join(__dirname, '..', 'public');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

function escapeXml(unsafe) {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
    }
  });
}

// Config for the 5 screens
const screens = [
  {
    id: 1,
    source: 'media_1788866120506.jpg',
    filename: 'screen_1_lens_scanner_1080.png',
    badge: '⚡ 60 FPS AR HARDWARE SCANNER',
    headline: 'Point & Scan Thrift Aisles',
    subtitle: 'Instant AI focus detects profitable flips in milliseconds',
    accentColor: '#06b6d4',
    accentColor2: '#3b82f6',
    crop: { left: 0, top: 116, width: 472, height: 848 },
  },
  {
    id: 2,
    source: 'media_1788866120491.jpg',
    filename: 'screen_2_valuation_profit_1080.png',
    badge: '💰 REAL-TIME PROFIT CALCULATOR',
    headline: 'Calculate Net Profit Before Buying',
    subtitle: 'Auto-factors thrift tag cost, eBay fees & shipping',
    accentColor: '#10b981',
    accentColor2: '#059669',
    crop: { left: 0, top: 116, width: 472, height: 848 },
  },
  {
    id: 3,
    source: 'media_1788866120513.jpg',
    filename: 'screen_3_sold_comps_analysis_1080.png',
    badge: '🔍 ACCURATE SOLD COMPARABLES',
    headline: 'Real eBay Australia Sold Data',
    subtitle: 'Filters bundle noise, replacement cases & guides',
    accentColor: '#38bdf8',
    accentColor2: '#8b5cf6',
    crop: { left: 0, top: 116, width: 472, height: 848 },
  },
  {
    id: 4,
    source: 'media_1788866100222.jpg',
    filename: 'screen_4_cross_listing_inventory_1080.png',
    badge: '🚀 1-CLICK CROSS-LISTING',
    headline: 'Publish to eBay & Depop in 1 Tap',
    subtitle: 'Track sell-through velocity & manage active inventory',
    accentColor: '#f59e0b',
    accentColor2: '#ea580c',
    crop: { left: 0, top: 40, width: 472, height: 924 },
  },
  {
    id: 5,
    source: 'media_1788866104019.jpg',
    filename: 'screen_5_reseller_reviews_1080.png',
    badge: '⭐️ 5-STAR RESELLER COMMUNITY',
    headline: 'Built by Resellers, for Resellers',
    subtitle: 'Cutting sourcing research time in half for power sellers',
    accentColor: '#eab308',
    accentColor2: '#f97316',
    crop: { left: 0, top: 40, width: 472, height: 924 },
  },
];

async function generateScreenshots() {
  const CANVAS_W = 1080;
  const CANVAS_H = 1920;

  // Phone Mockup Dimensions
  const PHONE_W = 760;
  const PHONE_H = 1530;
  const PHONE_X = Math.round((CANVAS_W - PHONE_W) / 2); // 160
  const PHONE_Y = 320;
  const BEZEL_RADIUS = 44;
  const SCREEN_PADDING = 12;

  const SCREEN_W = PHONE_W - SCREEN_PADDING * 2; // 736
  const SCREEN_H = PHONE_H - SCREEN_PADDING * 2; // 1506
  const SCREEN_RADIUS = 34;

  for (const s of screens) {
    console.log(`Processing Screenshot ${s.id}: ${s.headline}...`);
    const rawPath = path.join(rawDir, s.source);

    // 1. Crop raw screenshot and resize to phone screen size
    const croppedBuffer = await sharp(rawPath)
      .extract(s.crop)
      .resize(SCREEN_W, SCREEN_H, {
        fit: 'cover',
        position: 'top',
        kernel: sharp.kernel.lanczos3,
      })
      // Apply subtle sharpening for crisp UI on high-res displays
      .sharpen({ sigma: 0.8, m1: 1.0, m2: 2.0 })
      .toBuffer();

    // 2. Create SVG rounded mask for the inner screen
    const maskSvg = Buffer.from(`
      <svg width="${SCREEN_W}" height="${SCREEN_H}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${SCREEN_W}" height="${SCREEN_H}" rx="${SCREEN_RADIUS}" ry="${SCREEN_RADIUS}" fill="#ffffff"/>
      </svg>
    `);

    // Mask the screen with rounded corners
    const roundedScreen = await sharp(croppedBuffer)
      .composite([{ input: maskSvg, blend: 'dest-in' }])
      .png()
      .toBuffer();

    // 3. Render the overall canvas background and typography header
    const headerSvg = Buffer.from(`
      <svg width="${CANVAS_W}" height="${CANVAS_H}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <!-- Background Gradient -->
          <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#070b14"/>
            <stop offset="40%" stop-color="#0b111e"/>
            <stop offset="100%" stop-color="#05080e"/>
          </linearGradient>

          <!-- Ambient Glow Radial Gradient -->
          <radialGradient id="ambientGlow" cx="50%" cy="35%" r="60%">
            <stop offset="0%" stop-color="${s.accentColor}" stop-opacity="0.22"/>
            <stop offset="50%" stop-color="${s.accentColor2}" stop-opacity="0.08"/>
            <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
          </radialGradient>

          <!-- Badge Border Gradient -->
          <linearGradient id="badgeBorder" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="${s.accentColor}"/>
            <stop offset="100%" stop-color="${s.accentColor2}"/>
          </linearGradient>

          <!-- Drop Shadow for Phone -->
          <filter id="phoneShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="25" stdDeviation="30" flood-color="#000000" flood-opacity="0.8"/>
            <feDropShadow dx="0" dy="0" stdDeviation="20" flood-color="${s.accentColor}" flood-opacity="0.25"/>
          </filter>
        </defs>

        <!-- Background -->
        <rect width="${CANVAS_W}" height="${CANVAS_H}" fill="url(#bgGrad)"/>
        <rect width="${CANVAS_W}" height="${CANVAS_H}" fill="url(#ambientGlow)"/>

        <!-- Header Section -->
        <g transform="translate(0, 0)">
          <!-- Pill Badge -->
          <g transform="translate(540, 75)">
            <rect x="-190" y="0" width="380" height="42" rx="21" ry="21"
                  fill="#0f172a" fill-opacity="0.85" stroke="url(#badgeBorder)" stroke-width="1.8"/>
            <text x="0" y="27" font-size="14" font-weight="800" fill="${s.accentColor}"
                  text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
                  letter-spacing="1.5">
              ${escapeXml(s.badge)}
            </text>
          </g>

          <!-- Main Headline -->
          <text x="540" y="185" font-size="44" font-weight="900" fill="#ffffff"
                text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
                letter-spacing="-0.5">
            ${escapeXml(s.headline)}
          </text>

          <!-- Subtitle -->
          <text x="540" y="235" font-size="22" font-weight="500" fill="#94a3b8"
                text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif">
            ${escapeXml(s.subtitle)}
          </text>
        </g>

        <!-- Phone Chassis Frame -->
        <g transform="translate(${PHONE_X}, ${PHONE_Y})" filter="url(#phoneShadow)">
          <!-- Outer Bezel Body -->
          <rect x="0" y="0" width="${PHONE_W}" height="${PHONE_H}" rx="${BEZEL_RADIUS}" ry="${BEZEL_RADIUS}"
                fill="#0a0f1d" stroke="#334155" stroke-width="3"/>

          <!-- Metallic Edge Highlight Ring -->
          <rect x="3" y="3" width="${PHONE_W - 6}" height="${PHONE_H - 6}" rx="${BEZEL_RADIUS - 2}" ry="${BEZEL_RADIUS - 2}"
                fill="none" stroke="#1e293b" stroke-width="2"/>
        </g>

        <!-- Phone Hardware Dynamic Island / Camera Notch (drawn over screen) -->
        <g transform="translate(${CANVAS_W / 2}, ${PHONE_Y + SCREEN_PADDING + 14})">
          <rect x="-55" y="0" width="110" height="24" rx="12" ry="12" fill="#000000" stroke="#1e293b" stroke-width="1"/>
          <!-- Camera Sensor Dot -->
          <circle cx="28" cy="12" r="5" fill="#090d16"/>
        </g>
      </svg>
    `);

    // 4. Composite everything together
    const baseCanvas = await sharp(headerSvg).png().toBuffer();

    const finalScreenshot = await sharp(baseCanvas)
      .composite([
        {
          input: roundedScreen,
          left: PHONE_X + SCREEN_PADDING,
          top: PHONE_Y + SCREEN_PADDING,
        },
        // Re-composite dynamic island on top of screen
        {
          input: Buffer.from(`
            <svg width="110" height="24" xmlns="http://www.w3.org/2000/svg">
              <rect width="110" height="24" rx="12" ry="12" fill="#000000" stroke="#1e293b" stroke-width="1.2"/>
              <circle cx="82" cy="12" r="5" fill="#070b14"/>
              <circle cx="82" cy="12" r="2" fill="#1e293b"/>
            </svg>
          `),
          left: Math.round((CANVAS_W - 110) / 2),
          top: PHONE_Y + SCREEN_PADDING + 14,
        },
      ])
      .png({ quality: 95, compressionLevel: 8 })
      .toBuffer();

    // 5. Save outputs
    const outPngPath = path.join(outDir, s.filename);
    const outJpgPath = path.join(outDir, s.filename.replace('.png', '.jpg'));
    fs.writeFileSync(outPngPath, finalScreenshot);

    await sharp(finalScreenshot)
      .jpeg({ quality: 92, mozjpeg: true })
      .toFile(outJpgPath);

    console.log(`✓ Generated ${s.filename} (1080x1920)`);
  }

  // Also update primary Google Play Kit slots (3, 4, 5) and public/ screenshots
  console.log('\n--- Mirroring primary store slots (3, 4, 5) & public folder ---');
  fs.copyFileSync(path.join(outDir, 'screen_1_lens_scanner_1080.png'), path.join(outDir, '3_screenshot_lens_scanner.png'));
  fs.copyFileSync(path.join(outDir, 'screen_4_cross_listing_inventory_1080.png'), path.join(outDir, '4_screenshot_inventory_dashboard.png'));
  fs.copyFileSync(path.join(outDir, 'screen_2_valuation_profit_1080.png'), path.join(outDir, '5_screenshot_ai_listing_generator.png'));

  fs.copyFileSync(path.join(outDir, 'screen_1_lens_scanner_1080.png'), path.join(publicDir, 'screenshot-lens.png'));
  fs.copyFileSync(path.join(outDir, 'screen_4_cross_listing_inventory_1080.png'), path.join(publicDir, 'screenshot-dashboard.png'));
  fs.copyFileSync(path.join(outDir, 'screen_2_valuation_profit_1080.png'), path.join(publicDir, 'screenshot-generator.png'));

  console.log('✓ Mirrored to store_packages/google_play_kit/ (3, 4, 5)');
  console.log('✓ Mirrored to public/ (screenshot-lens.png, screenshot-dashboard.png, screenshot-generator.png)');
  console.log('\n🎉 ALL 5 PREMIUM GOOGLE PLAY SCREENSHOTS COMPLETED SUCCESSFULLY!\n');
}

generateScreenshots().catch((err) => {
  console.error('Fatal screenshot error:', err);
  process.exit(1);
});
