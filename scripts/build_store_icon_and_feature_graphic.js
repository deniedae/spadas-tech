const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

console.log('======================================================');
console.log('  Spadas AI — Google Play Icon & Feature Graphic Suite');
console.log('======================================================\n');

const rootDir = path.resolve(__dirname, '..');
const playKitDir = path.join(rootDir, 'store_packages', 'google_play_kit');
const publicDir = path.join(rootDir, 'public');
const downloadsDir = path.join(process.env.USERPROFILE || 'C:\\Users\\denie', 'Downloads', 'Google_Play_Screenshots');

if (!fs.existsSync(playKitDir)) {
  fs.mkdirSync(playKitDir, { recursive: true });
}
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
}

// -------------------------------------------------------------
// 1. GENERATE ULTRA-PREMIUM 512x512 APP ICON
// Full bleed square canvas (rx=0) as strictly required by Google Play
// -------------------------------------------------------------
async function generateAppIcon() {
  console.log('--- Generating 512x512 App Icon ---');
  const SIZE = 512;

  const iconSvg = Buffer.from(`
    <svg width="${SIZE}" height="${SIZE}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Background Radial Gradient (Obsidian to Deep Navy Void) -->
        <radialGradient id="bgGrad" cx="50%" cy="40%" r="70%">
          <stop offset="0%" stop-color="#0e1726"/>
          <stop offset="45%" stop-color="#070c16"/>
          <stop offset="100%" stop-color="#020408"/>
        </radialGradient>

        <!-- Outer Cyan Lens Glow -->
        <linearGradient id="ringCyan" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#38bdf8"/>
          <stop offset="40%" stop-color="#06b6d4"/>
          <stop offset="100%" stop-color="#2563eb"/>
        </linearGradient>

        <!-- Inner Amber Shutter Gradient -->
        <linearGradient id="amberCore" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fef08a"/>
          <stop offset="30%" stop-color="#fbbf24"/>
          <stop offset="70%" stop-color="#f59e0b"/>
          <stop offset="100%" stop-color="#d97706"/>
        </linearGradient>

        <!-- Metallic Titanium Bezel Ring -->
        <linearGradient id="metalBezel" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#475569"/>
          <stop offset="30%" stop-color="#1e293b"/>
          <stop offset="70%" stop-color="#334155"/>
          <stop offset="100%" stop-color="#0f172a"/>
        </linearGradient>

        <!-- Glass Sheen Linear Gradient -->
        <linearGradient id="glassGloss" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.22"/>
          <stop offset="40%" stop-color="#ffffff" stop-opacity="0.05"/>
          <stop offset="60%" stop-color="#ffffff" stop-opacity="0"/>
        </linearGradient>

        <!-- Glow Filters -->
        <filter id="glowCyan" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="16" result="blur"/>
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>
        <filter id="softGlowAmber" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="10" result="blur"/>
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>
        <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000000" flood-opacity="0.9"/>
        </filter>
      </defs>

      <!-- Full Bleed Square Canvas (Google Play dynamically applies 20% squircle mask) -->
      <rect width="512" height="512" fill="url(#bgGrad)"/>

      <!-- Subtle Cyber Optics Grid -->
      <g stroke="#1e293b" stroke-width="1" stroke-opacity="0.4">
        <line x1="0" y1="128" x2="512" y2="128"/>
        <line x1="0" y1="256" x2="512" y2="256"/>
        <line x1="0" y1="384" x2="512" y2="384"/>
        <line x1="128" y1="0" x2="128" y2="512"/>
        <line x1="256" y1="0" x2="256" y2="512"/>
        <line x1="384" y1="0" x2="384" y2="512"/>
      </g>

      <!-- Center Ambient Glow -->
      <circle cx="256" cy="256" r="180" fill="#0284c7" opacity="0.2" filter="url(#glowCyan)"/>
      <circle cx="256" cy="256" r="100" fill="#f59e0b" opacity="0.16" filter="url(#softGlowAmber)"/>

      <!-- Outer AR Reticle Brackets (High-Tech Viewfinder HUD) -->
      <g stroke="#38bdf8" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" opacity="0.95" filter="url(#glowCyan)">
        <!-- Top Left -->
        <path d="M 64,124 L 64,64 L 124,64"/>
        <!-- Top Right -->
        <path d="M 448,124 L 448,64 L 388,64"/>
        <!-- Bottom Left -->
        <path d="M 64,388 L 64,448 L 124,448"/>
        <!-- Bottom Right -->
        <path d="M 448,388 L 448,448 L 388,448"/>
      </g>

      <!-- Outer Optical Lens Ring (Heavy Titanium Chassis) -->
      <circle cx="256" cy="256" r="172" fill="none" stroke="url(#metalBezel)" stroke-width="12" filter="url(#dropShadow)"/>
      <circle cx="256" cy="256" r="162" fill="#070c16" stroke="url(#ringCyan)" stroke-width="6" filter="url(#glowCyan)"/>

      <!-- Precision Optical Tick Marks (360 Degree Dial) -->
      <g stroke="#0ea5e9" stroke-width="2" opacity="0.75">
        <line x1="256" y1="88" x2="256" y2="102"/>
        <line x1="256" y1="410" x2="256" y2="424"/>
        <line x1="88" y1="256" x2="102" y2="256"/>
        <line x1="410" y1="256" x2="424" y2="256"/>
        <!-- 45-degree ticks -->
        <line x1="138" y1="138" x2="148" y2="148"/>
        <line x1="374" y1="138" x2="364" y2="148"/>
        <line x1="138" y1="374" x2="148" y2="364"/>
        <line x1="374" y1="374" x2="364" y2="364"/>
      </g>
      <circle cx="256" cy="256" r="144" fill="none" stroke="#1e293b" stroke-width="2.5" stroke-dasharray="8 6"/>

      <!-- Camera Lens Barrel Dark Well -->
      <circle cx="256" cy="256" r="130" fill="#04070e" stroke="#334155" stroke-width="4"/>

      <!-- 6 Mechanical Camera Aperture Blades -->
      <g stroke="#0369a1" stroke-width="2.5" opacity="0.9">
        <line x1="256" y1="134" x2="338" y2="204"/>
        <line x1="362" y1="194" x2="338" y2="304"/>
        <line x1="362" y1="316" x2="256" y2="376"/>
        <line x1="256" y1="376" x2="174" y2="304"/>
        <line x1="150" y1="316" x2="174" y2="204"/>
        <line x1="150" y1="194" x2="256" y2="134"/>
      </g>

      <!-- Center Holographic Gold Shutter Core (Reseller Profit Ring) -->
      <circle cx="256" cy="256" r="88" fill="#080d19" stroke="url(#amberCore)" stroke-width="8" filter="url(#softGlowAmber)"/>
      <circle cx="256" cy="256" r="72" fill="#050811" stroke="#f59e0b" stroke-opacity="0.4" stroke-width="2"/>

      <!-- Central Lightning Spark Emblem (Instant Sourcing & Camera Speed) -->
      <g filter="url(#softGlowAmber)">
        <polygon points="268,198 232,258 262,258 244,314 290,246 260,246" fill="url(#amberCore)" stroke="#ffffff" stroke-width="2" stroke-linejoin="round"/>
      </g>

      <!-- Optical Glass Reflection / Specular Highlight (Lens Curve) -->
      <path d="M 110,210 C 140,140 196,110 256,110 C 316,110 372,140 402,210 C 330,230 260,240 180,230 Z" fill="url(#glassGloss)"/>
      <ellipse cx="256" cy="140" rx="90" ry="24" fill="#38bdf8" opacity="0.12"/>
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

  // Generate 192x192 icon as well for PWA manifest
  const icon192 = await sharp(iconBuffer).resize(192, 192).png().toBuffer();
  fs.writeFileSync(path.join(publicDir, 'icon-192.png'), icon192);
  fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), icon192);

  console.log('✓ Saved 512x512 App Icon to:');
  console.log('  •', iconPlayKit);
  console.log('  •', iconPublic);
  console.log('  •', iconDownloads);
}

// -------------------------------------------------------------
// 2. GENERATE ULTRA-PREMIUM 1024x500 FEATURE GRAPHIC
// Strictly 1024x500 24-bit RGB (No Alpha), zero debug banners
// -------------------------------------------------------------
async function generateFeatureGraphic() {
  console.log('\n--- Generating 1024x500 Feature Graphic ---');
  const WIDTH = 1024;
  const HEIGHT = 500;

  // We construct a clean smartphone UI showing the AR Viewfinder scanning
  // a high-margin thrift flip with 100% sanitized, professional UI (NO email, NO debug buttons).
  const featureSvg = Buffer.from(`
    <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 1024 500" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Deep Cinematic Dark Background -->
        <linearGradient id="featBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#060911"/>
          <stop offset="50%" stop-color="#0a1224"/>
          <stop offset="100%" stop-color="#03060c"/>
        </linearGradient>

        <!-- Ambient Cyan Glow Left -->
        <radialGradient id="leftGlow" cx="22%" cy="48%" r="65%">
          <stop offset="0%" stop-color="#0284c7" stop-opacity="0.36"/>
          <stop offset="45%" stop-color="#3b82f6" stop-opacity="0.14"/>
          <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
        </radialGradient>

        <!-- Ambient Emerald Glow behind Phone on Right -->
        <radialGradient id="rightGlow" cx="80%" cy="50%" r="55%">
          <stop offset="0%" stop-color="#10b981" stop-opacity="0.30"/>
          <stop offset="45%" stop-color="#06b6d4" stop-opacity="0.15"/>
          <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
        </radialGradient>

        <!-- Headline Cyan Gradient -->
        <linearGradient id="cyanTextGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#38bdf8"/>
          <stop offset="50%" stop-color="#22d3ee"/>
          <stop offset="100%" stop-color="#34d399"/>
        </linearGradient>

        <!-- Phone Drop Shadow -->
        <filter id="phoneShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="-14" dy="20" stdDeviation="24" flood-color="#000000" flood-opacity="0.9"/>
          <feDropShadow dx="0" dy="0" stdDeviation="28" flood-color="#06b6d4" flood-opacity="0.25"/>
        </filter>

        <!-- Card Glow Filter -->
        <filter id="cardGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="#000000" flood-opacity="0.75"/>
          <feDropShadow dx="0" dy="0" stdDeviation="10" flood-color="#10b981" flood-opacity="0.3"/>
        </filter>
      </defs>

      <!-- Backgrounds -->
      <rect width="1024" height="500" fill="url(#featBg)"/>
      <rect width="1024" height="500" fill="url(#leftGlow)"/>
      <rect width="1024" height="500" fill="url(#rightGlow)"/>

      <!-- Subtle Cyber Grid -->
      <g stroke="#1e293b" stroke-width="1" stroke-opacity="0.35">
        <line x1="0" y1="100" x2="1024" y2="100"/>
        <line x1="0" y1="200" x2="1024" y2="200"/>
        <line x1="0" y1="300" x2="1024" y2="300"/>
        <line x1="0" y1="400" x2="1024" y2="400"/>
        <line x1="160" y1="0" x2="160" y2="500"/>
        <line x1="320" y1="0" x2="320" y2="500"/>
        <line x1="480" y1="0" x2="480" y2="500"/>
        <line x1="640" y1="0" x2="640" y2="500"/>
      </g>

      <!-- ============================================== -->
      <!-- LEFT COLUMN: Brand, Headline, Feature Badges   -->
      <!-- ============================================== -->
      <g transform="translate(64, 0)">
        <!-- Brand Eyebrow Tag -->
        <g transform="translate(0, 52)">
          <rect width="295" height="34" rx="17" fill="#0f172a" stroke="#38bdf8" stroke-width="1.5"/>
          <circle cx="18" cy="17" r="5" fill="#38bdf8"/>
          <text x="32" y="22" font-size="12" font-weight="900" fill="#38bdf8" letter-spacing="1.2" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
            ⚡ RESELLER SCANNER · SPADAS LENS
          </text>
        </g>

        <!-- Big Bold Hero Title -->
        <text x="0" y="148" font-size="52" font-weight="900" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" letter-spacing="-1">
          Scan Thrift Aisles.
        </text>
        <text x="0" y="206" font-size="52" font-weight="900" fill="url(#cyanTextGrad)" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" letter-spacing="-1">
          Know Exact Profit.
        </text>

        <!-- Subtitle -->
        <text x="0" y="254" font-size="17" font-weight="500" fill="#94a3b8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
          Instant 60 FPS camera scanner with real eBay Australia sold comps,
        </text>
        <text x="0" y="278" font-size="17" font-weight="500" fill="#94a3b8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
          automated net profit deduction, and 1-click cross-listing.
        </text>

        <!-- Feature Highlight Badges -->
        <g transform="translate(0, 320)">
          <!-- Pill 1: 60 FPS Scanner -->
          <g transform="translate(0, 0)">
            <rect width="170" height="42" rx="12" fill="#0f172a" stroke="#0284c7" stroke-width="1.4"/>
            <text x="14" y="26" font-size="13" font-weight="800" fill="#38bdf8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
              ⚡ 60 FPS AR Vision
            </text>
          </g>

          <!-- Pill 2: Real eBay Comps -->
          <g transform="translate(182, 0)">
            <rect width="190" height="42" rx="12" fill="#0f172a" stroke="#059669" stroke-width="1.4"/>
            <text x="14" y="26" font-size="13" font-weight="800" fill="#34d399" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
              💰 Live eBay Sold Comps
            </text>
          </g>

          <!-- Pill 3: 1-Click Listing -->
          <g transform="translate(384, 0)">
            <rect width="176" height="42" rx="12" fill="#0f172a" stroke="#d97706" stroke-width="1.4"/>
            <text x="14" y="26" font-size="13" font-weight="800" fill="#fbbf24" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
              🚀 1-Click Cross-List
            </text>
          </g>
        </g>

        <!-- Social Proof Trust Footer -->
        <g transform="translate(0, 412)">
          <text x="0" y="24" font-size="20" fill="#fbbf24">★★★★★</text>
          <text x="96" y="22" font-size="13" font-weight="700" fill="#e2e8f0" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
            Rated 4.9/5 by Australian Resellers &amp; PowerSellers
          </text>
        </g>
      </g>

      <!-- ============================================== -->
      <!-- RIGHT COLUMN: Smartphone Chassis Mockup        -->
      <!-- ============================================== -->
      <g transform="translate(670, 24)" filter="url(#phoneShadow)">
        <!-- Outer Titanium Bezel -->
        <rect width="324" height="456" rx="34" fill="#0a0f1d" stroke="#334155" stroke-width="3"/>
        <rect x="2" y="2" width="320" height="452" rx="32" fill="none" stroke="#1e293b" stroke-width="1.5"/>

        <!-- Phone Inner Screen (304 x 436) -->
        <g transform="translate(10, 10)">
          <clipPath id="screenClip">
            <rect width="304" height="436" rx="24"/>
          </clipPath>

          <g clip-path="url(#screenClip)">
            <!-- Screen Background Viewfinder Feed -->
            <rect width="304" height="436" fill="#040812"/>

            <!-- Subtle Thrift Shelf / Item Silhouette in background -->
            <rect x="20" y="70" width="264" height="180" rx="16" fill="#0a1224" stroke="#1e293b" stroke-width="1.5"/>

            <!-- Authentic Clean Android Status Bar (No battery leak / no ugly icons) -->
            <rect width="304" height="28" fill="#040812" fill-opacity="0.95"/>
            <text x="18" y="19" font-size="11" font-weight="700" fill="#cbd5e1" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
              12:00
            </text>
            <text x="256" y="19" font-size="11" font-weight="700" fill="#94a3b8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
              5G  100%
            </text>

            <!-- Dynamic Island Notch -->
            <rect x="117" y="6" width="70" height="14" rx="7" fill="#000000" stroke="#1e293b" stroke-width="1"/>

            <!-- App Bar (Clean, Professional Spadas Lens Navigation) -->
            <g transform="translate(16, 36)">
              <rect width="130" height="26" rx="13" fill="#0f172a" stroke="#0ea5e9" stroke-width="1"/>
              <circle cx="13" cy="13" r="4" fill="#10b981"/>
              <text x="24" y="18" font-size="10" font-weight="800" fill="#38bdf8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
                SPADAS LENS AR
              </text>
              <!-- 60 FPS Badge -->
              <rect x="214" y="0" width="58" height="26" rx="13" fill="#0f172a" stroke="#334155" stroke-width="1"/>
              <text x="243" y="17" font-size="10" font-weight="700" fill="#34d399" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
                60 FPS
              </text>
            </g>

            <!-- AR Viewfinder Reticle Scanning Target Item -->
            <g transform="translate(42, 85)">
              <!-- Scanning Crosshairs -->
              <path d="M 0,25 L 0,0 L 25,0" fill="none" stroke="#22d3ee" stroke-width="3" stroke-linecap="round"/>
              <path d="M 220,25 L 220,0 L 195,0" fill="none" stroke="#22d3ee" stroke-width="3" stroke-linecap="round"/>
              <path d="M 0,115 L 0,140 L 25,140" fill="none" stroke="#22d3ee" stroke-width="3" stroke-linecap="round"/>
              <path d="M 220,115 L 220,140 L 195,140" fill="none" stroke="#22d3ee" stroke-width="3" stroke-linecap="round"/>

              <!-- Central Scanner Pulse Laser Line -->
              <line x1="10" y1="70" x2="210" y2="70" stroke="#06b6d4" stroke-width="2" stroke-opacity="0.8"/>
              <rect x="10" y="66" width="200" height="8" fill="#38bdf8" opacity="0.15"/>

              <!-- Detected Tag Label -->
              <rect x="50" y="10" width="120" height="22" rx="11" fill="#0f172a" fill-opacity="0.9" stroke="#10b981" stroke-width="1.2"/>
              <text x="110" y="25" font-size="10" font-weight="800" fill="#34d399" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
                🏷️ Thrift Tag: $18.00
              </text>
            </g>

            <!-- Floating High-Profit Valuation Card (MUST COP) -->
            <g transform="translate(14, 246)" filter="url(#cardGlow)">
              <rect width="276" height="136" rx="16" fill="#090f1d" stroke="#10b981" stroke-width="1.5"/>

              <!-- Top Row: Badge + Category -->
              <g transform="translate(12, 12)">
                <rect width="90" height="20" rx="10" fill="#065f46" stroke="#34d399" stroke-width="1"/>
                <text x="45" y="14" font-size="9" font-weight="900" fill="#a7f3d0" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
                  🔥 MUST COP
                </text>
                <text x="100" y="15" font-size="10" font-weight="700" fill="#38bdf8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
                  94% Sold Velocity
                </text>
              </g>

              <!-- Item Title -->
              <text x="12" y="52" font-size="13" font-weight="800" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
                Carhartt Detroit Jacket J97
              </text>

              <!-- Divider -->
              <line x1="12" y1="62" x2="264" y2="62" stroke="#1e293b" stroke-width="1"/>

              <!-- 3-Column Valuation Breakdown -->
              <g transform="translate(12, 78)">
                <text x="0" y="0" font-size="9" font-weight="700" fill="#94a3b8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">EST RESALE</text>
                <text x="0" y="18" font-size="14" font-weight="900" fill="#38bdf8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">$280.00</text>

                <text x="90" y="0" font-size="9" font-weight="700" fill="#94a3b8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">BUY COST</text>
                <text x="90" y="18" font-size="14" font-weight="900" fill="#fbbf24" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">$18.00</text>

                <text x="175" y="0" font-size="9" font-weight="700" fill="#34d399" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">NET PROFIT</text>
                <text x="175" y="18" font-size="15" font-weight="900" fill="#10b981" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">+$204.40</text>
              </g>

              <!-- Bottom Action Pill: +Add to Vault -->
              <g transform="translate(12, 106)">
                <rect width="252" height="22" rx="11" fill="#047857"/>
                <text x="126" y="15" font-size="10" font-weight="800" fill="#ffffff" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
                  ✓ Add To Reseller Vault &amp; Cross-List
                </text>
              </g>
            </g>

            <!-- Bottom Floating Action Shutter & Navigation -->
            <g transform="translate(0, 394)">
              <rect width="304" height="42" fill="#070c18" stroke="#1e293b" stroke-width="1"/>
              <!-- Camera Action Circle -->
              <circle cx="152" cy="18" r="16" fill="#f59e0b" stroke="#ffffff" stroke-width="2"/>
              <polygon points="155,10 147,19 152,19 149,26 157,17 152,17" fill="#050811"/>
            </g>
          </g>
        </g>
      </g>
    </svg>
  `);

  // Google Play strictly requires 24-bit RGB PNG or JPEG (no alpha) for feature graphic
  const baseFeature = await sharp(featureSvg)
    .removeAlpha()
    .png()
    .toBuffer();

  const jpgFeature = await sharp(featureSvg)
    .jpeg({ quality: 96, mozjpeg: true })
    .toBuffer();

  const featPlayKit = path.join(playKitDir, '2_feature_graphic_1024x500.png');
  const featPlayKitJpg = path.join(playKitDir, 'promo_1024x500.jpg');
  const featPublic = path.join(publicDir, 'store-feature-graphic-1024x500.png');
  const featDownloadsPng = path.join(downloadsDir, '2_feature_graphic_1024x500.png');
  const featDownloadsJpg = path.join(downloadsDir, '2_feature_graphic_1024x500.jpg');

  fs.writeFileSync(featPlayKit, baseFeature);
  fs.writeFileSync(featPlayKitJpg, jpgFeature);
  fs.writeFileSync(featPublic, baseFeature);
  fs.writeFileSync(featDownloadsPng, baseFeature);
  fs.writeFileSync(featDownloadsJpg, jpgFeature);

  console.log('✓ Saved Feature Graphic (1024x500) to:');
  console.log('  •', featPlayKit);
  console.log('  •', featPlayKitJpg);
  console.log('  •', featPublic);
  console.log('  •', featDownloadsPng);
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
