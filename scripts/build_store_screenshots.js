const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

console.log('======================================================');
console.log('  Spadas AI — Premium Google Play Screenshots Suite   ');
console.log('======================================================\n');

const outDir = path.join(__dirname, '..', 'store_packages', 'google_play_kit');
const publicDir = path.join(__dirname, '..', 'public');
const downloadsDir = path.join(process.env.USERPROFILE || 'C:\\Users\\denie', 'Downloads', 'Google_Play_Screenshots');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
}

function escapeXml(unsafe) {
  return String(unsafe).replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
    }
  });
}

const CANVAS_W = 1080;
const CANVAS_H = 1920;

const PHONE_W = 820;
const PHONE_H = 1530;
const PHONE_X = Math.round((CANVAS_W - PHONE_W) / 2); // 130
const PHONE_Y = 320;
const BEZEL_RADIUS = 46;
const SCREEN_PADDING = 12;

const SCREEN_W = PHONE_W - SCREEN_PADDING * 2; // 796
const SCREEN_H = PHONE_H - SCREEN_PADDING * 2; // 1506
const SCREEN_RADIUS = 36;

// ------------------------------------------------------------------
// HELPER: Generate Phone Inner Screen SVG for each specific screen
// ------------------------------------------------------------------
function renderPhoneScreenInner(screenId) {
  // Shared Android Top Status Bar (Clean 12:00, 5G, 100% Battery)
  const statusBarSvg = `
    <g transform="translate(0, 0)">
      <rect width="${SCREEN_W}" height="52" fill="#040711" fill-opacity="0.95"/>
      <text x="36" y="34" font-size="18" font-weight="700" fill="#e2e8f0" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">12:00</text>
      <text x="${SCREEN_W - 130}" y="34" font-size="16" font-weight="700" fill="#94a3b8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">5G  100%</text>
      <!-- Battery Icon -->
      <rect x="${SCREEN_W - 54}" y="18" width="26" height="15" rx="3" fill="none" stroke="#94a3b8" stroke-width="2"/>
      <rect x="${SCREEN_W - 51}" y="21" width="20" height="9" rx="1.5" fill="#10b981"/>
      <rect x="${SCREEN_W - 28}" y="22" width="3" height="7" rx="1" fill="#94a3b8"/>
    </g>
  `;

  // Shared Bottom Navigation Bar
  const bottomNavSvg = `
    <g transform="translate(0, ${SCREEN_H - 100})">
      <rect width="${SCREEN_W}" height="100" fill="#060a14" stroke="#1e293b" stroke-width="1.5"/>
      <!-- Nav Item 1: Home -->
      <g transform="translate(70, 32)">
        <circle cx="20" cy="14" r="10" fill="none" stroke="#64748b" stroke-width="2.5"/>
        <text x="20" y="44" font-size="12" font-weight="700" fill="#64748b" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">Home</text>
      </g>
      <!-- Nav Item 2: History -->
      <g transform="translate(210, 32)">
        <circle cx="20" cy="14" r="10" fill="none" stroke="#64748b" stroke-width="2.5"/>
        <line x1="20" y1="14" x2="20" y2="8" stroke="#64748b" stroke-width="2.5"/>
        <line x1="20" y1="14" x2="25" y2="14" stroke="#64748b" stroke-width="2.5"/>
        <text x="20" y="44" font-size="12" font-weight="700" fill="#64748b" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">History</text>
      </g>
      <!-- Center Main AR Button (Glowing Pill) -->
      <g transform="translate(${SCREEN_W / 2 - 45}, 16)">
        <circle cx="45" cy="28" r="32" fill="#0284c7" stroke="#38bdf8" stroke-width="3"/>
        <circle cx="45" cy="28" r="14" fill="none" stroke="#ffffff" stroke-width="3"/>
        <circle cx="45" cy="28" r="5" fill="#f59e0b"/>
        <text x="45" y="74" font-size="13" font-weight="900" fill="#38bdf8" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">Lens AR</text>
      </g>
      <!-- Nav Item 4: Vault -->
      <g transform="translate(${SCREEN_W - 250}, 32)">
        <rect x="8" y="2" width="24" height="24" rx="5" fill="none" stroke="#64748b" stroke-width="2.5"/>
        <text x="20" y="44" font-size="12" font-weight="700" fill="#64748b" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">Vault</text>
      </g>
      <!-- Nav Item 5: Settings -->
      <g transform="translate(${SCREEN_W - 110}, 32)">
        <circle cx="20" cy="14" r="10" fill="none" stroke="#64748b" stroke-width="2.5"/>
        <text x="20" y="44" font-size="12" font-weight="700" fill="#64748b" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">Settings</text>
      </g>
    </g>
  `;

  if (screenId === 1) {
    // -------------------------------------------------------------
    // SCREEN 1: 60 FPS Optical AR Camera Viewfinder
    // -------------------------------------------------------------
    return `
      <!-- Camera Feed Background (Dark Cinematic Viewfinder) -->
      <rect width="${SCREEN_W}" height="${SCREEN_H}" fill="#040813"/>

      <!-- Viewfinder Scene Mockup (Thrift Apparel Rack & Item) -->
      <g transform="translate(0, 52)">
        <!-- Viewfinder Canvas Area -->
        <rect x="20" y="20" width="${SCREEN_W - 40}" height="760" rx="24" fill="#080e1e" stroke="#1e293b" stroke-width="2"/>

        <!-- Top Camera Toolbar -->
        <g transform="translate(40, 42)">
          <rect width="200" height="42" rx="21" fill="#0f172a" fill-opacity="0.9" stroke="#0ea5e9" stroke-width="1.5"/>
          <circle cx="22" cy="21" r="6" fill="#10b981"/>
          <text x="36" y="27" font-size="14" font-weight="900" fill="#38bdf8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">SPADAS LENS AR</text>

          <rect x="${SCREEN_W - 220}" y="0" width="140" height="42" rx="21" fill="#0f172a" fill-opacity="0.9" stroke="#334155" stroke-width="1.5"/>
          <circle cx="${SCREEN_W - 200}" cy="21" r="5" fill="#f59e0b"/>
          <text x="${SCREEN_W - 185}" y="26" font-size="14" font-weight="800" fill="#fef08a" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">60 FPS STEADY</text>
        </g>

        <!-- Simulated Thrift Item Silhouette (Vintage Jacket / Grail) -->
        <g transform="translate(130, 160)">
          <!-- Target Frame Background Box -->
          <rect width="536" height="450" rx="20" fill="#0a1226" stroke="#1e293b" stroke-width="2"/>
          <circle cx="268" cy="225" r="150" fill="#0f1d38" opacity="0.6"/>

          <!-- High-Tech Holographic Scanning Grid -->
          <g stroke="#1e293b" stroke-width="1" stroke-dasharray="6 6" opacity="0.6">
            <line x1="80" y1="120" x2="456" y2="120"/>
            <line x1="80" y1="200" x2="456" y2="200"/>
            <line x1="80" y1="280" x2="456" y2="280"/>
            <line x1="160" y1="80" x2="160" y2="360"/>
            <line x1="268" y1="80" x2="268" y2="360"/>
            <line x1="376" y1="80" x2="376" y2="360"/>
          </g>

          <!-- Vintage Workwear Jacket Vector Silhouette -->
          <g transform="translate(178, 110)" opacity="0.9">
            <!-- Jacket Body -->
            <path d="M 40,30 L 70,10 L 110,10 L 140,30 L 175,70 L 155,100 L 135,80 L 135,210 L 45,210 L 45,80 L 25,100 L 5,70 Z"
                  fill="#111c33" stroke="#38bdf8" stroke-width="2.5" stroke-linejoin="round"/>
            <!-- Collar & Zip -->
            <path d="M 70,10 L 90,45 L 110,10" fill="none" stroke="#d97706" stroke-width="2.5"/>
            <line x1="90" y1="45" x2="90" y2="210" stroke="#f59e0b" stroke-width="2"/>
            <!-- Chest Pocket (Carhartt style) -->
            <rect x="55" y="65" width="28" height="24" rx="3" fill="#1e293b" stroke="#38bdf8" stroke-width="1.5"/>
            <!-- Carhartt Logo Patch -->
            <rect x="62" y="70" width="14" height="12" rx="2" fill="#d97706"/>
          </g>

          <!-- High-Tech AR Corner Reticles (Luminous Cyan) -->
          <path d="M 30,80 L 30,30 L 80,30" fill="none" stroke="#22d3ee" stroke-width="6" stroke-linecap="round"/>
          <path d="M 506,80 L 506,30 L 456,30" fill="none" stroke="#22d3ee" stroke-width="6" stroke-linecap="round"/>
          <path d="M 30,370 L 30,420 L 80,420" fill="none" stroke="#22d3ee" stroke-width="6" stroke-linecap="round"/>
          <path d="M 506,370 L 506,420 L 456,420" fill="none" stroke="#22d3ee" stroke-width="6" stroke-linecap="round"/>

          <!-- Laser Scan Line -->
          <line x1="40" y1="225" x2="496" y2="225" stroke="#38bdf8" stroke-width="3" stroke-dasharray="14 8"/>
          <rect x="40" y="217" width="456" height="16" fill="#38bdf8" opacity="0.12"/>

          <!-- Tag Detection Tag Indicator -->
          <g transform="translate(148, 50)">
            <rect width="240" height="40" rx="20" fill="#0f172a" fill-opacity="0.95" stroke="#10b981" stroke-width="2"/>
            <text x="120" y="26" font-size="15" font-weight="900" fill="#34d399" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
              🏷️ Thrift Tag Detected: $18.00
            </text>
          </g>

          <!-- Match Verified Badge -->
          <g transform="translate(138, 350)">
            <rect width="260" height="38" rx="19" fill="#065f46" stroke="#34d399" stroke-width="1.8"/>
            <text x="130" y="24" font-size="14" font-weight="900" fill="#ecfdf5" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
              ⚡ MATCH: CARHARTT DETROIT
            </text>
          </g>
        </g>

        <!-- Camera Viewfinder Controls Overlay -->
        <g transform="translate(${SCREEN_W / 2 - 100}, 690)">
          <rect width="200" height="42" rx="21" fill="#090f1e" stroke="#334155" stroke-width="1.5"/>
          <text x="35" y="26" font-size="15" font-weight="800" fill="#38bdf8">1x</text>
          <text x="100" y="26" font-size="15" font-weight="800" fill="#94a3b8">2x</text>
          <text x="165" y="26" font-size="15" font-weight="800" fill="#94a3b8">3x</text>
        </g>
      </g>

      <!-- FLOATING VALUATION PROFIT CARD (MUST COP) -->
      <g transform="translate(32, 850)">
        <rect width="${SCREEN_W - 64}" height="420" rx="28" fill="#0a1020" stroke="#10b981" stroke-width="2.5"/>

        <!-- Top Verdict Pill -->
        <g transform="translate(30, 28)">
          <rect width="180" height="44" rx="22" fill="#065f46" stroke="#34d399" stroke-width="1.5"/>
          <text x="90" y="29" font-size="17" font-weight="900" fill="#ffffff" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
            🔥 MUST COP
          </text>
          <text x="200" y="30" font-size="17" font-weight="800" fill="#38bdf8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
            94% Sold Velocity (Sells in 3 Days)
          </text>
        </g>

        <!-- Product Title -->
        <text x="30" y="118" font-size="28" font-weight="900" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
          Vintage 90s Carhartt Detroit Jacket J97
        </text>

        <!-- Divider -->
        <line x1="30" y1="144" x2="${SCREEN_W - 94}" y2="144" stroke="#1e293b" stroke-width="2"/>

        <!-- 3-Column Valuation Metric Box -->
        <g transform="translate(30, 185)">
          <!-- Col 1 -->
          <text x="0" y="0" font-size="15" font-weight="700" fill="#94a3b8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">EST. MARKET VALUE</text>
          <text x="0" y="40" font-size="34" font-weight="900" fill="#38bdf8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">$280.00 AUD</text>

          <!-- Col 2 -->
          <text x="250" y="0" font-size="15" font-weight="700" fill="#94a3b8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">THRIFT TAG</text>
          <text x="250" y="40" font-size="34" font-weight="900" fill="#fbbf24" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">$18.00 AUD</text>

          <!-- Col 3 -->
          <text x="480" y="0" font-size="15" font-weight="700" fill="#34d399" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">EST. NET PROFIT</text>
          <text x="480" y="40" font-size="36" font-weight="900" fill="#10b981" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">+$204.40</text>
        </g>

        <!-- Action Buttons -->
        <g transform="translate(30, 310)">
          <!-- Button 1: Add to Vault -->
          <rect width="${(SCREEN_W - 134) / 2}" height="64" rx="20" fill="#059669" stroke="#10b981" stroke-width="1.5"/>
          <text x="${(SCREEN_W - 134) / 4}" y="39" font-size="18" font-weight="900" fill="#ffffff" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
            ✓ Add To Vault (+Save)
          </text>

          <!-- Button 2: Sold Comps -->
          <g transform="translate(${(SCREEN_W - 134) / 2 + 16}, 0)">
            <rect width="${(SCREEN_W - 134) / 2}" height="64" rx="20" fill="#1e293b" stroke="#38bdf8" stroke-width="1.5"/>
            <text x="${(SCREEN_W - 134) / 4}" y="39" font-size="18" font-weight="800" fill="#38bdf8" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
              🔍 View 48 Sold Comps
            </text>
          </g>
        </g>
      </g>

      ${statusBarSvg}
      ${bottomNavSvg}
    `;
  } else if (screenId === 2) {
    // -------------------------------------------------------------
    // SCREEN 2: Deep Net Profit Calculator Breakdown
    // -------------------------------------------------------------
    return `
      <!-- Background -->
      <rect width="${SCREEN_W}" height="${SCREEN_H}" fill="#050914"/>

      <!-- App Header -->
      <g transform="translate(32, 70)">
        <rect width="200" height="42" rx="21" fill="#0f172a" stroke="#10b981" stroke-width="1.5"/>
        <circle cx="21" cy="21" r="6" fill="#10b981"/>
        <text x="36" y="27" font-size="15" font-weight="900" fill="#34d399" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
          NET PROFIT ENGINE
        </text>
        <text x="${SCREEN_W - 64}" y="30" font-size="18" font-weight="800" fill="#94a3b8" text-anchor="end" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
          AUD ($) · eBay AU
        </text>
      </g>

      <!-- Main High-Impact Profit Card -->
      <g transform="translate(32, 134)">
        <rect width="${SCREEN_W - 64}" height="260" rx="28" fill="#091122" stroke="#10b981" stroke-width="2"/>

        <g transform="translate(32, 32)">
          <text x="0" y="0" font-size="15" font-weight="800" fill="#34d399" letter-spacing="1">TOTAL NET IN-POCKET PROFIT</text>
          <text x="0" y="68" font-size="64" font-weight="900" fill="#10b981" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">+$204.40 AUD</text>
          <text x="0" y="112" font-size="18" font-weight="700" fill="#e2e8f0" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
            Profit Margin: <tspan fill="#34d399" font-weight="900">73.0%</tspan>  ·  ROI: <tspan fill="#38bdf8" font-weight="900">1,135%</tspan>
          </text>
        </g>

        <!-- Velocity Pill Bar inside Card -->
        <g transform="translate(32, 185)">
          <rect width="${SCREEN_W - 128}" height="48" rx="14" fill="#047857" fill-opacity="0.3" stroke="#059669" stroke-width="1.5"/>
          <text x="24" y="30" font-size="15" font-weight="900" fill="#a7f3d0" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
            ⚡ 94% Sell-Through Rate · Highly Liquid Asset (Sells ~3.2 Days)
          </text>
        </g>
      </g>

      <!-- Item Breakdown Table Card -->
      <g transform="translate(32, 424)">
        <rect width="${SCREEN_W - 64}" height="560" rx="28" fill="#0a1020" stroke="#1e293b" stroke-width="2"/>

        <g transform="translate(32, 36)">
          <text x="0" y="0" font-size="18" font-weight="900" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
            Comprehensive Fee &amp; Cost Breakdown
          </text>
          <text x="0" y="24" font-size="14" font-weight="500" fill="#94a3b8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
            Item: Vintage 90s Carhartt Detroit Jacket J97 (Large)
          </text>
        </g>

        <line x1="32" y1="92" x2="${SCREEN_W - 96}" y2="92" stroke="#1e293b" stroke-width="1.5"/>

        <!-- Row 1: Gross Resale -->
        <g transform="translate(32, 130)">
          <text x="0" y="0" font-size="18" font-weight="700" fill="#e2e8f0" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">Gross Market Resale Price</text>
          <text x="${SCREEN_W - 128}" y="0" font-size="20" font-weight="900" fill="#38bdf8" text-anchor="end" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">+$280.00</text>
        </g>

        <!-- Row 2: Buy Cost -->
        <g transform="translate(32, 195)">
          <text x="0" y="0" font-size="18" font-weight="700" fill="#e2e8f0" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">Thrift Store Buy Cost (COGS)</text>
          <text x="${SCREEN_W - 128}" y="0" font-size="20" font-weight="900" fill="#fbbf24" text-anchor="end" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">-$18.00</text>
        </g>

        <!-- Row 3: eBay Final Value Fee -->
        <g transform="translate(32, 260)">
          <text x="0" y="0" font-size="18" font-weight="700" fill="#e2e8f0" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">eBay Final Value Fee (13.4% + $0.30)</text>
          <text x="${SCREEN_W - 128}" y="0" font-size="20" font-weight="900" fill="#f87171" text-anchor="end" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">-$37.82</text>
        </g>

        <!-- Row 4: Payment Processing -->
        <g transform="translate(32, 325)">
          <text x="0" y="0" font-size="18" font-weight="700" fill="#e2e8f0" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">Managed Payment Processing (2.6%)</text>
          <text x="${SCREEN_W - 128}" y="0" font-size="20" font-weight="900" fill="#f87171" text-anchor="end" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">-$7.28</text>
        </g>

        <!-- Row 5: Tracked Postage -->
        <g transform="translate(32, 390)">
          <text x="0" y="0" font-size="18" font-weight="700" fill="#e2e8f0" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">Tracked Parcel Post (AusPost Medium)</text>
          <text x="${SCREEN_W - 128}" y="0" font-size="20" font-weight="900" fill="#f87171" text-anchor="end" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">-$12.50</text>
        </g>

        <line x1="32" y1="430" x2="${SCREEN_W - 96}" y2="430" stroke="#10b981" stroke-width="2"/>

        <!-- Final Row: Net Profit -->
        <g transform="translate(32, 485)">
          <text x="0" y="0" font-size="22" font-weight="900" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">CLEAN NET PROFIT</text>
          <text x="${SCREEN_W - 128}" y="0" font-size="28" font-weight="900" fill="#10b981" text-anchor="end" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">+$204.40 AUD</text>
        </g>
      </g>

      <!-- Bottom Action CTA Button -->
      <g transform="translate(32, 1016)">
        <rect width="${SCREEN_W - 64}" height="70" rx="22" fill="#047857" stroke="#10b981" stroke-width="2"/>
        <text x="${(SCREEN_W - 64) / 2}" y="43" font-size="20" font-weight="900" fill="#ffffff" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
          ⚡ 1-Click Export to Cross-Lister &amp; eBay
        </text>
      </g>

      ${statusBarSvg}
      ${bottomNavSvg}
    `;
  } else if (screenId === 3) {
    // -------------------------------------------------------------
    // SCREEN 3: 100% Verified Real Sold Comps
    // -------------------------------------------------------------
    return `
      <!-- Background -->
      <rect width="${SCREEN_W}" height="${SCREEN_H}" fill="#050914"/>

      <!-- Header & Search Input -->
      <g transform="translate(32, 70)">
        <rect width="${SCREEN_W - 64}" height="56" rx="28" fill="#0e172a" stroke="#38bdf8" stroke-width="1.8"/>
        <circle cx="36" cy="28" r="8" fill="none" stroke="#38bdf8" stroke-width="2.5"/>
        <line x1="42" y1="34" x2="50" y2="42" stroke="#38bdf8" stroke-width="2.5"/>
        <text x="64" y="35" font-size="17" font-weight="700" fill="#e2e8f0" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
          Carhartt Detroit Jacket J97 MOS Large
        </text>
        <rect x="${SCREEN_W - 160}" y="8" width="86" height="40" rx="20" fill="#0284c7"/>
        <text x="${SCREEN_W - 117}" y="33" font-size="14" font-weight="800" fill="#ffffff" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
          Filter
        </text>
      </g>

      <!-- Comps Summary Banner -->
      <g transform="translate(32, 148)">
        <rect width="${SCREEN_W - 64}" height="90" rx="22" fill="#0c1426" stroke="#1e293b" stroke-width="2"/>
        <g transform="translate(28, 30)">
          <text x="0" y="0" font-size="13" font-weight="700" fill="#94a3b8">AVG SOLD PRICE</text>
          <text x="0" y="32" font-size="26" font-weight="900" fill="#38bdf8">$274.50</text>

          <text x="240" y="0" font-size="13" font-weight="700" fill="#94a3b8">TOTAL SOLD (90D)</text>
          <text x="240" y="32" font-size="26" font-weight="900" fill="#e2e8f0">48 Items</text>

          <text x="470" y="0" font-size="13" font-weight="700" fill="#34d399">SELL-THROUGH RATE</text>
          <text x="470" y="32" font-size="26" font-weight="900" fill="#10b981">92.3%</text>
        </g>
      </g>

      <!-- Section Title -->
      <g transform="translate(36, 266)">
        <text x="0" y="0" font-size="18" font-weight="900" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
          Verified Completed Marketplace Sales
        </text>
        <text x="0" y="24" font-size="14" font-weight="600" fill="#34d399" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
          ✅ Verified real eBay sold transactions (zero asking price fluff)
        </text>
      </g>

      <!-- Comp Card 1 -->
      <g transform="translate(32, 314)">
        <rect width="${SCREEN_W - 64}" height="145" rx="20" fill="#091020" stroke="#1e293b" stroke-width="1.8"/>
        <!-- Thumbnail placeholder -->
        <rect x="20" y="20" width="105" height="105" rx="14" fill="#1e293b"/>
        <text x="72" y="80" font-size="28" fill="#38bdf8" text-anchor="middle">🧥</text>

        <g transform="translate(145, 38)">
          <text x="0" y="0" font-size="17" font-weight="800" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
            Vintage Carhartt J97 Detroit Moss Green (L)
          </text>
          <text x="0" y="26" font-size="14" font-weight="600" fill="#94a3b8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
            Sold: Yesterday · 18 Bids · eBay Australia
          </text>
          <rect x="0" y="42" width="120" height="24" rx="12" fill="#065f46"/>
          <text x="60" y="58" font-size="11" font-weight="900" fill="#a7f3d0" text-anchor="middle">VERIFIED SALE</text>
        </g>

        <!-- Sold Price Tag -->
        <text x="${SCREEN_W - 96}" y="65" font-size="28" font-weight="900" fill="#10b981" text-anchor="end" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
          $295.00
        </text>
      </g>

      <!-- Comp Card 2 -->
      <g transform="translate(32, 480)">
        <rect width="${SCREEN_W - 64}" height="145" rx="20" fill="#091020" stroke="#1e293b" stroke-width="1.8"/>
        <rect x="20" y="20" width="105" height="105" rx="14" fill="#1e293b"/>
        <text x="72" y="80" font-size="28" fill="#38bdf8" text-anchor="middle">🧥</text>

        <g transform="translate(145, 38)">
          <text x="0" y="0" font-size="17" font-weight="800" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
            90s Carhartt J97 Detroit Work Canvas Jacket
          </text>
          <text x="0" y="26" font-size="14" font-weight="600" fill="#94a3b8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
            Sold: 2 days ago · Buy It Now · eBay AU
          </text>
          <rect x="0" y="42" width="120" height="24" rx="12" fill="#065f46"/>
          <text x="60" y="58" font-size="11" font-weight="900" fill="#a7f3d0" text-anchor="middle">VERIFIED SALE</text>
        </g>

        <text x="${SCREEN_W - 96}" y="65" font-size="28" font-weight="900" fill="#10b981" text-anchor="end" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
          $280.00
        </text>
      </g>

      <!-- Comp Card 3 -->
      <g transform="translate(32, 646)">
        <rect width="${SCREEN_W - 64}" height="145" rx="20" fill="#091020" stroke="#1e293b" stroke-width="1.8"/>
        <rect x="20" y="20" width="105" height="105" rx="14" fill="#1e293b"/>
        <text x="72" y="80" font-size="28" fill="#38bdf8" text-anchor="middle">🧥</text>

        <g transform="translate(145, 38)">
          <text x="0" y="0" font-size="17" font-weight="800" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
            Carhartt Blanket Lined Detroit Jacket Distressed
          </text>
          <text x="0" y="26" font-size="14" font-weight="600" fill="#94a3b8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
            Sold: 4 days ago · Best Offer Accepted · eBay AU
          </text>
          <rect x="0" y="42" width="120" height="24" rx="12" fill="#065f46"/>
          <text x="60" y="58" font-size="11" font-weight="900" fill="#a7f3d0" text-anchor="middle">VERIFIED SALE</text>
        </g>

        <text x="${SCREEN_W - 96}" y="65" font-size="28" font-weight="900" fill="#10b981" text-anchor="end" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
          $265.00
        </text>
      </g>

      <!-- Comp Card 4 -->
      <g transform="translate(32, 812)">
        <rect width="${SCREEN_W - 64}" height="145" rx="20" fill="#091020" stroke="#1e293b" stroke-width="1.8"/>
        <rect x="20" y="20" width="105" height="105" rx="14" fill="#1e293b"/>
        <text x="72" y="80" font-size="28" fill="#38bdf8" text-anchor="middle">🧥</text>

        <g transform="translate(145, 38)">
          <text x="0" y="0" font-size="17" font-weight="800" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
            Vintage Carhartt Blanket Lined Workwear Coat
          </text>
          <text x="0" y="26" font-size="14" font-weight="600" fill="#94a3b8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
            Sold: 6 days ago · Buy It Now · eBay AU
          </text>
          <rect x="0" y="42" width="120" height="24" rx="12" fill="#065f46"/>
          <text x="60" y="58" font-size="11" font-weight="900" fill="#a7f3d0" text-anchor="middle">VERIFIED SALE</text>
        </g>

        <text x="${SCREEN_W - 96}" y="65" font-size="28" font-weight="900" fill="#10b981" text-anchor="end" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
          $270.00
        </text>
      </g>

      <!-- View More Comps Button -->
      <g transform="translate(32, 980)">
        <rect width="${SCREEN_W - 64}" height="64" rx="20" fill="#1e293b" stroke="#38bdf8" stroke-width="1.5"/>
        <text x="${(SCREEN_W - 64) / 2}" y="39" font-size="18" font-weight="800" fill="#38bdf8" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
          Load 44 More Sold Comps
        </text>
      </g>

      ${statusBarSvg}
      ${bottomNavSvg}
    `;
  } else if (screenId === 4) {
    // -------------------------------------------------------------
    // SCREEN 4: 1-Click Cross-Listing & Reseller Vault
    // -------------------------------------------------------------
    return `
      <!-- Background -->
      <rect width="${SCREEN_W}" height="${SCREEN_H}" fill="#050914"/>

      <!-- Top Header & Vault Stats -->
      <g transform="translate(32, 70)">
        <rect width="${SCREEN_W - 64}" height="140" rx="26" fill="#0c1324" stroke="#d97706" stroke-width="2"/>
        <g transform="translate(32, 34)">
          <text x="0" y="0" font-size="14" font-weight="900" fill="#fbbf24" letter-spacing="1">RESELLER VAULT · 54 ITEMS</text>
          <text x="0" y="38" font-size="34" font-weight="900" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">$4,850 Total Value</text>
          <text x="0" y="68" font-size="16" font-weight="700" fill="#34d399" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
            Invested: $420  ·  Projected Net: +$3,680 AUD
          </text>
        </g>
        <!-- 1-Click Cross-List Header Action -->
        <g transform="translate(${SCREEN_W - 250}, 45)">
          <rect width="154" height="48" rx="24" fill="#f59e0b"/>
          <text x="77" y="30" font-size="15" font-weight="900" fill="#090d16" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
            ⚡ Cross-List
          </text>
        </g>
      </g>

      <!-- Section Title -->
      <g transform="translate(36, 238)">
        <text x="0" y="0" font-size="18" font-weight="900" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
          Ready For Cross-Listing &amp; Marketplace Sync
        </text>
      </g>

      <!-- Item Row 1 -->
      <g transform="translate(32, 260)">
        <rect width="${SCREEN_W - 64}" height="155" rx="20" fill="#091020" stroke="#1e293b" stroke-width="1.8"/>
        <!-- Item Emoji Thumbnail -->
        <rect x="20" y="20" width="115" height="115" rx="16" fill="#1e293b"/>
        <text x="77" y="85" font-size="34" text-anchor="middle">🧥</text>

        <g transform="translate(155, 36)">
          <text x="0" y="0" font-size="18" font-weight="900" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
            Carhartt Detroit Jacket J97 MOS (L)
          </text>
          <text x="0" y="26" font-size="15" font-weight="700" fill="#94a3b8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
            Cost: $18.00  →  List: $280.00
          </text>
          <!-- Profit Badge -->
          <rect x="0" y="42" width="140" height="26" rx="13" fill="#065f46"/>
          <text x="70" y="59" font-size="12" font-weight="900" fill="#a7f3d0" text-anchor="middle">+ $204.40 PROFIT</text>
        </g>

        <!-- Cross-List Action Pill -->
        <g transform="translate(${SCREEN_W - 200}, 55)">
          <rect width="110" height="44" rx="22" fill="#0284c7" stroke="#38bdf8" stroke-width="1.2"/>
          <text x="55" y="27" font-size="14" font-weight="900" fill="#ffffff" text-anchor="middle">eBay · Depop</text>
        </g>
      </g>

      <!-- Item Row 2 -->
      <g transform="translate(32, 435)">
        <rect width="${SCREEN_W - 64}" height="155" rx="20" fill="#091020" stroke="#1e293b" stroke-width="1.8"/>
        <rect x="20" y="20" width="115" height="115" rx="16" fill="#1e293b"/>
        <text x="77" y="85" font-size="34" text-anchor="middle">🎮</text>

        <g transform="translate(155, 36)">
          <text x="0" y="0" font-size="18" font-weight="900" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
            Nintendo Game Boy Advance SP Onyx
          </text>
          <text x="0" y="26" font-size="15" font-weight="700" fill="#94a3b8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
            Cost: $15.00  →  List: $165.00
          </text>
          <rect x="0" y="42" width="140" height="26" rx="13" fill="#065f46"/>
          <text x="70" y="59" font-size="12" font-weight="900" fill="#a7f3d0" text-anchor="middle">+ $126.80 PROFIT</text>
        </g>

        <g transform="translate(${SCREEN_W - 200}, 55)">
          <rect width="110" height="44" rx="22" fill="#0284c7" stroke="#38bdf8" stroke-width="1.2"/>
          <text x="55" y="27" font-size="14" font-weight="900" fill="#ffffff" text-anchor="middle">eBay · Depop</text>
        </g>
      </g>

      <!-- Item Row 3 -->
      <g transform="translate(32, 610)">
        <rect width="${SCREEN_W - 64}" height="155" rx="20" fill="#091020" stroke="#1e293b" stroke-width="1.8"/>
        <rect x="20" y="20" width="115" height="115" rx="16" fill="#1e293b"/>
        <text x="77" y="85" font-size="34" text-anchor="middle">📻</text>

        <g transform="translate(155, 36)">
          <text x="0" y="0" font-size="18" font-weight="900" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
            Sony Walkman Sports WM-F45 Vintage
          </text>
          <text x="0" y="26" font-size="15" font-weight="700" fill="#94a3b8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
            Cost: $6.00  →  List: $140.00
          </text>
          <rect x="0" y="42" width="140" height="26" rx="13" fill="#065f46"/>
          <text x="70" y="59" font-size="12" font-weight="900" fill="#a7f3d0" text-anchor="middle">+ $112.50 PROFIT</text>
        </g>

        <g transform="translate(${SCREEN_W - 200}, 55)">
          <rect width="110" height="44" rx="22" fill="#0284c7" stroke="#38bdf8" stroke-width="1.2"/>
          <text x="55" y="27" font-size="14" font-weight="900" fill="#ffffff" text-anchor="middle">eBay · Depop</text>
        </g>
      </g>

      <!-- Item Row 4 -->
      <g transform="translate(32, 785)">
        <rect width="${SCREEN_W - 64}" height="155" rx="20" fill="#091020" stroke="#1e293b" stroke-width="1.8"/>
        <rect x="20" y="20" width="115" height="115" rx="16" fill="#1e293b"/>
        <text x="77" y="85" font-size="34" text-anchor="middle">👟</text>

        <g transform="translate(155, 36)">
          <text x="0" y="0" font-size="18" font-weight="900" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
            Vintage Nike Center Swoosh Hoodie (M)
          </text>
          <text x="0" y="26" font-size="15" font-weight="700" fill="#94a3b8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
            Cost: $10.00  →  List: $135.00
          </text>
          <rect x="0" y="42" width="140" height="26" rx="13" fill="#065f46"/>
          <text x="70" y="59" font-size="12" font-weight="900" fill="#a7f3d0" text-anchor="middle">+ $104.20 PROFIT</text>
        </g>

        <g transform="translate(${SCREEN_W - 200}, 55)">
          <rect width="110" height="44" rx="22" fill="#0284c7" stroke="#38bdf8" stroke-width="1.2"/>
          <text x="55" y="27" font-size="14" font-weight="900" fill="#ffffff" text-anchor="middle">eBay · Depop</text>
        </g>
      </g>

      <!-- Bottom Full Width Cross-List Button -->
      <g transform="translate(32, 970)">
        <rect width="${SCREEN_W - 64}" height="68" rx="22" fill="#d97706" stroke="#fbbf24" stroke-width="2"/>
        <text x="${(SCREEN_W - 64) / 2}" y="42" font-size="20" font-weight="900" fill="#090d16" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
          🚀 1-Click Sync All 54 Items To Marketplaces
        </text>
      </g>

      ${statusBarSvg}
      ${bottomNavSvg}
    `;
  } else if (screenId === 5) {
    // -------------------------------------------------------------
    // SCREEN 5: Reseller Social Proof & PowerSeller Reviews
    // -------------------------------------------------------------
    return `
      <!-- Background -->
      <rect width="${SCREEN_W}" height="${SCREEN_H}" fill="#050914"/>

      <!-- Top Rating Header Banner (No notch overlap) -->
      <g transform="translate(32, 70)">
        <rect width="${SCREEN_W - 64}" height="100" rx="24" fill="#0d1424" stroke="#eab308" stroke-width="1.8"/>
        <g transform="translate(32, 34)">
          <text x="0" y="0" font-size="28" fill="#fbbf24">★★★★★</text>
          <text x="140" y="-3" font-size="24" font-weight="900" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
            4.9 / 5.0 Star Rating
          </text>
          <text x="0" y="32" font-size="15" font-weight="700" fill="#94a3b8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
            Trusted by 10,000+ Australian Resellers, Flippers &amp; Antique Dealers
          </text>
        </g>
      </g>

      <!-- Review Card 1 -->
      <g transform="translate(32, 190)">
        <rect width="${SCREEN_W - 64}" height="255" rx="24" fill="#0a1020" stroke="#1e293b" stroke-width="2"/>
        <g transform="translate(32, 28)">
          <text x="0" y="0" font-size="24" fill="#fbbf24">★★★★★</text>
          <text x="0" y="34" font-size="16" font-weight="500" fill="#cbd5e1" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
            <tspan x="0" dy="0">&quot;Spadas Lens AR camera scanner cut my sourcing research</tspan>
            <tspan x="0" dy="25">time by 75%. I can scan a whole rack of vintage jackets</tspan>
            <tspan x="0" dy="25">in 30 seconds and know instantly what has serious margin.&quot;</tspan>
          </text>

          <g transform="translate(0, 130)">
            <circle cx="20" cy="20" r="20" fill="#1e293b"/>
            <text x="20" y="27" font-size="16" fill="#38bdf8" text-anchor="middle">🛍️</text>
            <text x="52" y="18" font-size="17" font-weight="900" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
              Alex M.
            </text>
            <text x="52" y="38" font-size="14" font-weight="600" fill="#94a3b8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
              eBay Top Rated PowerSeller · Sydney
            </text>
            <rect x="${SCREEN_W - 250}" y="6" width="120" height="28" rx="14" fill="#0284c7" fill-opacity="0.3"/>
            <text x="${SCREEN_W - 190}" y="25" font-size="12" font-weight="800" fill="#38bdf8" text-anchor="middle">$18K/mo volume</text>
          </g>
        </g>
      </g>

      <!-- Review Card 2 -->
      <g transform="translate(32, 465)">
        <rect width="${SCREEN_W - 64}" height="255" rx="24" fill="#0a1020" stroke="#1e293b" stroke-width="2"/>
        <g transform="translate(32, 28)">
          <text x="0" y="0" font-size="24" fill="#fbbf24">★★★★★</text>
          <text x="0" y="34" font-size="16" font-weight="500" fill="#cbd5e1" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
            <tspan x="0" dy="0">&quot;The automated net profit calculator saved me from hundreds</tspan>
            <tspan x="0" dy="25">of dollars in bad buys. It deducts postage and marketplace</tspan>
            <tspan x="0" dy="25">fees before I even reach the checkout.&quot;</tspan>
          </text>

          <g transform="translate(0, 130)">
            <circle cx="20" cy="20" r="20" fill="#1e293b"/>
            <text x="20" y="27" font-size="16" fill="#38bdf8" text-anchor="middle">👗</text>
            <text x="52" y="18" font-size="17" font-weight="900" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
              Sarah T.
            </text>
            <text x="52" y="38" font-size="14" font-weight="600" fill="#94a3b8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
              Depop Verified Top Seller · Melbourne
            </text>
            <rect x="${SCREEN_W - 250}" y="6" width="120" height="28" rx="14" fill="#059669" fill-opacity="0.3"/>
            <text x="${SCREEN_W - 190}" y="25" font-size="12" font-weight="800" fill="#34d399" text-anchor="middle">1,200+ sales</text>
          </g>
        </g>
      </g>

      <!-- Review Card 3 -->
      <g transform="translate(32, 740)">
        <rect width="${SCREEN_W - 64}" height="255" rx="24" fill="#0a1020" stroke="#1e293b" stroke-width="2"/>
        <g transform="translate(32, 28)">
          <text x="0" y="0" font-size="24" fill="#fbbf24">★★★★★</text>
          <text x="0" y="34" font-size="16" font-weight="500" fill="#cbd5e1" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
            <tspan x="0" dy="0">&quot;Having real 100% verified eBay sold comps right in the</tspan>
            <tspan x="0" dy="25">camera viewfinder completely changed garage sale mornings.</tspan>
            <tspan x="0" dy="25">You spot high-margin grails in seconds.&quot;</tspan>
          </text>

          <g transform="translate(0, 130)">
            <circle cx="20" cy="20" r="20" fill="#1e293b"/>
            <text x="20" y="27" font-size="16" fill="#38bdf8" text-anchor="middle">📦</text>
            <text x="52" y="18" font-size="17" font-weight="900" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
              Marcus K.
            </text>
            <text x="52" y="38" font-size="14" font-weight="600" fill="#94a3b8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
              Multi-Platform Reseller · Brisbane
            </text>
            <rect x="${SCREEN_W - 250}" y="6" width="120" height="28" rx="14" fill="#d97706" fill-opacity="0.3"/>
            <text x="${SCREEN_W - 190}" y="25" font-size="12" font-weight="800" fill="#fbbf24" text-anchor="middle">50+ items/wk</text>
          </g>
        </g>
      </g>

      <!-- Social Proof Footer Action -->
      <g transform="translate(32, 1015)">
        <rect width="${SCREEN_W - 64}" height="64" rx="20" fill="#0284c7" stroke="#38bdf8" stroke-width="1.8"/>
        <text x="${(SCREEN_W - 64) / 2}" y="39" font-size="18" font-weight="900" fill="#ffffff" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
          Join 10,000+ Resellers Using Spadas Lens
        </text>
      </g>

      ${statusBarSvg}
      ${bottomNavSvg}
    `;
  }
}

// ------------------------------------------------------------------
// Config for the 5 Store Screenshots
// ------------------------------------------------------------------
const screens = [
  {
    id: 1,
    filename: 'screen_1_lens_scanner_1080.png',
    badge: '⚡ 60 FPS OPTICAL AR SOURCING',
    headline: 'Scan in 0.4s. Spot Flips Instantly.',
    subtitle: 'Point at thrift shelves, racks or tags to know value before you touch',
    accentColor: '#06b6d4',
    accentColor2: '#3b82f6',
  },
  {
    id: 2,
    filename: 'screen_2_valuation_profit_1080.png',
    badge: '💰 REAL-TIME NET PROFIT CALCULATOR',
    headline: 'Never Buy a Bad Flip Again',
    subtitle: 'Auto-calculates eBay fees, buy cost & postage before you pay',
    accentColor: '#10b981',
    accentColor2: '#059669',
  },
  {
    id: 3,
    filename: 'screen_3_sold_comps_analysis_1080.png',
    badge: '🔍 100% VERIFIED SOLD COMPS',
    headline: 'Real Sold Data. Zero Asking Fluff.',
    subtitle: 'Filters out fake comps, junk listings & unrealistic asking prices',
    accentColor: '#38bdf8',
    accentColor2: '#8b5cf6',
  },
  {
    id: 4,
    filename: 'screen_4_cross_listing_inventory_1080.png',
    badge: '🚀 1-CLICK CROSS-LISTING',
    headline: 'From Scan to Live Listing in Seconds',
    subtitle: 'Auto-generates SEO titles, condition tags & syncs to eBay and Depop',
    accentColor: '#f59e0b',
    accentColor2: '#ea580c',
  },
  {
    id: 5,
    filename: 'screen_5_reseller_reviews_1080.png',
    badge: '⭐️ TRUSTED BY TOP RESELLERS',
    headline: 'Double Your Sourcing Speed',
    subtitle: 'Used by pro thrift & garage sale flippers moving 50+ items a week',
    accentColor: '#eab308',
    accentColor2: '#f97316',
  },
];

async function generateScreenshots() {
  for (const s of screens) {
    console.log(`Processing Screenshot ${s.id}: ${s.headline}...`);

    // Render the inner phone screen SVG
    const innerScreenSvg = `
      <svg width="${SCREEN_W}" height="${SCREEN_H}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <clipPath id="screenCornerClip">
            <rect width="${SCREEN_W}" height="${SCREEN_H}" rx="${SCREEN_RADIUS}"/>
          </clipPath>
        </defs>
        <g clip-path="url(#screenCornerClip)">
          ${renderPhoneScreenInner(s.id)}
        </g>
      </svg>
    `;

    const roundedScreenBuffer = await sharp(Buffer.from(innerScreenSvg))
      .png()
      .toBuffer();

    // Render overall canvas with typography header and phone frame
    const canvasSvg = Buffer.from(`
      <svg width="${CANVAS_W}" height="${CANVAS_H}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <!-- Background Gradient -->
          <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#060912"/>
            <stop offset="40%" stop-color="#091120"/>
            <stop offset="100%" stop-color="#04070e"/>
          </linearGradient>

          <!-- Ambient Glow Radial Gradient -->
          <radialGradient id="ambientGlow" cx="50%" cy="30%" r="65%">
            <stop offset="0%" stop-color="${s.accentColor}" stop-opacity="0.25"/>
            <stop offset="50%" stop-color="${s.accentColor2}" stop-opacity="0.10"/>
            <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
          </radialGradient>

          <!-- Badge Border Gradient -->
          <linearGradient id="badgeBorder" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="${s.accentColor}"/>
            <stop offset="100%" stop-color="${s.accentColor2}"/>
          </linearGradient>

          <!-- Drop Shadow for Phone -->
          <filter id="phoneShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="25" stdDeviation="32" flood-color="#000000" flood-opacity="0.88"/>
            <feDropShadow dx="0" dy="0" stdDeviation="24" flood-color="${s.accentColor}" flood-opacity="0.28"/>
          </filter>
        </defs>

        <!-- Background -->
        <rect width="${CANVAS_W}" height="${CANVAS_H}" fill="url(#bgGrad)"/>
        <rect width="${CANVAS_W}" height="${CANVAS_H}" fill="url(#ambientGlow)"/>

        <!-- Header Section -->
        <g transform="translate(0, 0)">
          <!-- Pill Badge -->
          <g transform="translate(540, 72)">
            <rect x="-210" y="0" width="420" height="42" rx="21"
                  fill="#0f172a" fill-opacity="0.9" stroke="url(#badgeBorder)" stroke-width="1.8"/>
            <text x="0" y="27" font-size="14" font-weight="900" fill="${s.accentColor}"
                  text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                  letter-spacing="1.5">
              ${escapeXml(s.badge)}
            </text>
          </g>

          <!-- Main Headline -->
          <text x="540" y="180" font-size="44" font-weight="900" fill="#ffffff"
                text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                letter-spacing="-0.5">
            ${escapeXml(s.headline)}
          </text>

          <!-- Subtitle -->
          <text x="540" y="230" font-size="22" font-weight="500" fill="#94a3b8"
                text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
            ${escapeXml(s.subtitle)}
          </text>
        </g>

        <!-- Phone Chassis Frame -->
        <g transform="translate(${PHONE_X}, ${PHONE_Y})" filter="url(#phoneShadow)">
          <!-- Outer Titanium Bezel Body -->
          <rect x="0" y="0" width="${PHONE_W}" height="${PHONE_H}" rx="${BEZEL_RADIUS}"
                fill="#0a0f1d" stroke="#334155" stroke-width="3"/>

          <!-- Metallic Edge Highlight Ring -->
          <rect x="3" y="3" width="${PHONE_W - 6}" height="${PHONE_H - 6}" rx="${BEZEL_RADIUS - 2}"
                fill="none" stroke="#1e293b" stroke-width="2"/>
        </g>
      </svg>
    `);

    const baseCanvas = await sharp(canvasSvg).png().toBuffer();

    // Composite phone inner screen + Dynamic Island
    const finalScreenshot = await sharp(baseCanvas)
      .composite([
        {
          input: roundedScreenBuffer,
          left: PHONE_X + SCREEN_PADDING,
          top: PHONE_Y + SCREEN_PADDING,
        },
        // Re-composite dynamic island on top of screen
        {
          input: Buffer.from(`
            <svg width="120" height="26" xmlns="http://www.w3.org/2000/svg">
              <rect width="120" height="26" rx="13" fill="#000000" stroke="#1e293b" stroke-width="1.2"/>
              <circle cx="90" cy="13" r="5" fill="#070b14"/>
              <circle cx="90" cy="13" r="2" fill="#1e293b"/>
            </svg>
          `),
          left: Math.round((CANVAS_W - 120) / 2),
          top: PHONE_Y + SCREEN_PADDING + 14,
        },
      ])
      .png({ quality: 96, compressionLevel: 8 })
      .toBuffer();

    // Save PNG & JPEG to Play Kit and Downloads
    const outPngPath = path.join(outDir, s.filename);
    const outJpgPath = path.join(outDir, s.filename.replace('.png', '.jpg'));
    const downloadsPngPath = path.join(downloadsDir, s.filename);

    fs.writeFileSync(outPngPath, finalScreenshot);
    fs.writeFileSync(downloadsPngPath, finalScreenshot);

    await sharp(finalScreenshot)
      .jpeg({ quality: 94, mozjpeg: true })
      .toFile(outJpgPath);

    console.log(`✓ Generated ${s.filename} (1080x1920)`);
  }

  // Mirror primary Google Play Kit slots (3, 4, 5) & public/
  console.log('\n--- Mirroring primary store slots (3, 4, 5) & public folder ---');
  fs.copyFileSync(path.join(outDir, 'screen_1_lens_scanner_1080.png'), path.join(outDir, '3_screenshot_lens_scanner.png'));
  fs.copyFileSync(path.join(outDir, 'screen_2_valuation_profit_1080.png'), path.join(outDir, '4_screenshot_inventory_dashboard.png'));
  fs.copyFileSync(path.join(outDir, 'screen_4_cross_listing_inventory_1080.png'), path.join(outDir, '5_screenshot_ai_listing_generator.png'));

  fs.copyFileSync(path.join(outDir, 'screen_1_lens_scanner_1080.png'), path.join(publicDir, 'screenshot-lens.png'));
  fs.copyFileSync(path.join(outDir, 'screen_2_valuation_profit_1080.png'), path.join(publicDir, 'screenshot-dashboard.png'));
  fs.copyFileSync(path.join(outDir, 'screen_4_cross_listing_inventory_1080.png'), path.join(publicDir, 'screenshot-generator.png'));

  console.log('✓ Mirrored to store_packages/google_play_kit/ (3, 4, 5)');
  console.log('✓ Mirrored to public/ (screenshot-lens.png, screenshot-dashboard.png, screenshot-generator.png)');
  console.log('✓ Mirrored all assets to Downloads/Google_Play_Screenshots');
  console.log('\n🎉 ALL 5 HIGH-CONVERTING SCREENSHOTS COMPLETED SUCCESSFULLY!\n');
}

generateScreenshots().catch((err) => {
  console.error('Fatal screenshot error:', err);
  process.exit(1);
});
