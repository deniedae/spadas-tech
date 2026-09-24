const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

console.log('======================================================');
console.log('  Spadas AI — Viral Social Slideshows Generator Suite ');
console.log('  Format: 1080x1920 (TikTok / IG Slideshows / Shorts) ');
console.log('======================================================\n');

const outDir = path.join(__dirname, '..', 'store_packages', 'social_slideshows');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
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

const slideshowSets = [
  {
    setId: 'set_1_goodwill_thrift_flip',
    title: 'Goodwill Thrift Flip',
    slides: [
      {
        slideNum: 1,
        category: '🚨 GOODWILL SOURCING FIND',
        headline: 'Found this for $3.99 at Goodwill...',
        subheadline: 'Leave it on the shelf, or flip it for cash?',
        tagline: 'SWIPE TO REVEAL SOLD COMPS 👉',
        accentColor: '#f59e0b',
        accentColor2: '#ef4444',
        cardTitle: 'Vintage Yashica Camera Tag',
        cardPrice: 'Thrift Tag: $3.99',
        cardBadge: 'UNCHECKED SHELF FIND',
        cardNotes: 'No box, clean lens, original strap attached'
      },
      {
        slideNum: 2,
        category: '⚡ INSTANT OPTICAL SCAN',
        headline: 'Scanned in 0.5s with Spadas Lens',
        subheadline: 'Live eBay Australia & US Sold Comps Analyzed',
        tagline: 'SWIPE FOR NET PROFIT BREAKDOWN 👉',
        accentColor: '#06b6d4',
        accentColor2: '#3b82f6',
        cardTitle: 'Yashica Electro 35 GTN',
        cardPrice: 'eBay Sold Average: $89.00',
        cardBadge: '14 RECENT VERIFIED SALES',
        cardNotes: 'Sell-Through Rate: 84% • 9 sales in past 30 days'
      },
      {
        slideNum: 3,
        category: '💰 FINAL NET PROFIT',
        headline: '+$68.45 Pure Profit in Pocket',
        subheadline: 'Auto-deducted buy cost, eBay 13.25% fee & $10.50 shipping',
        tagline: 'START FREE → SPADAS.AI',
        accentColor: '#10b981',
        accentColor2: '#059669',
        cardTitle: '10 Free Daily Scans',
        cardPrice: 'Net ROI: +1,715%',
        cardBadge: 'READY TO CROSS-LIST IN 1 TAP',
        cardNotes: 'Download free at spadas.ai • Works on iOS & Android'
      }
    ]
  },
  {
    setId: 'set_2_reseller_myth_comps',
    title: 'The Sold Comps Truth',
    slides: [
      {
        slideNum: 1,
        category: '❌ THE BIGGEST RESELLER MISTAKE',
        headline: 'Stop checking eBay asking prices.',
        subheadline: 'Asking prices are fantasy. Sold comps are cash.',
        tagline: 'SWIPE TO SEE HOW WE SPOT FAKES 👉',
        accentColor: '#ef4444',
        accentColor2: '#f97316',
        cardTitle: 'Why 90% of Flippers Lose Money',
        cardPrice: 'Listed for $200 ≠ Worth $200',
        cardBadge: 'UNREALISTIC ASKING PRICES',
        cardNotes: 'Items sit for 18 months because sellers look at active listings'
      },
      {
        slideNum: 2,
        category: '🔍 AI COMPARABLE AUDIT',
        headline: 'Spadas Filters Out The Outlier Junk',
        subheadline: 'Instantly ignores replacement boxes, manual-only & broken lots',
        tagline: 'SWIPE TO SEE HOW WE SCAN IN 0.5s 👉',
        accentColor: '#8b5cf6',
        accentColor2: '#6366f1',
        cardTitle: 'True Market Value Extraction',
        cardPrice: 'Real Median Sold Price: $62.50',
        cardBadge: 'TRUE CONVERTING PRICE',
        cardNotes: 'Calculates exact velocity so you never hold dead inventory'
      },
      {
        slideNum: 3,
        category: '🚀 1-CLICK WORKFLOW',
        headline: 'From Thrift Shelf to Live Listing',
        subheadline: 'Generates SEO titles, condition notes & cross-lists in seconds',
        tagline: '10 FREE SCANS DAILY AT SPADAS.AI',
        accentColor: '#38bdf8',
        accentColor2: '#0284c7',
        cardTitle: 'Double Your Hourly Sourcing Rate',
        cardPrice: 'Zero Guesswork. Pure Data.',
        cardBadge: 'IOS • ANDROID • WEB PWA',
        cardNotes: 'Try it right now on your phone — no card required'
      }
    ]
  }
];

async function generateSlide(slideData, outputPath) {
  const W = 1080;
  const H = 1920;

  const svg = `
    <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Background Gradient -->
        <linearGradient id="bgGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#07090e" />
          <stop offset="50%" stop-color="#0b101b" />
          <stop offset="100%" stop-color="#05070a" />
        </linearGradient>

        <!-- Dynamic Accent Gradient -->
        <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${slideData.accentColor}" />
          <stop offset="100%" stop-color="${slideData.accentColor2}" />
        </linearGradient>

        <!-- Glass Card Gradient -->
        <linearGradient id="cardGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#141c2e" stop-opacity="0.9" />
          <stop offset="100%" stop-color="#0c111c" stop-opacity="0.95" />
        </linearGradient>

        <!-- Top Glow -->
        <radialGradient id="topGlow" cx="50%" cy="15%" r="60%">
          <stop offset="0%" stop-color="${slideData.accentColor}" stop-opacity="0.32" />
          <stop offset="100%" stop-color="${slideData.accentColor}" stop-opacity="0" />
        </radialGradient>
      </defs>

      <!-- Background -->
      <rect width="${W}" height="${H}" fill="url(#bgGradient)" />
      <rect width="${W}" height="${H}" fill="url(#topGlow)" />

      <!-- Decorative Grid Lines -->
      <line x1="80" y1="0" x2="80" y2="${H}" stroke="#ffffff" stroke-opacity="0.04" stroke-width="1" />
      <line x1="${W - 80}" y1="0" x2="${W - 80}" y2="${H}" stroke="#ffffff" stroke-opacity="0.04" stroke-width="1" />
      <line x1="0" y1="280" x2="${W}" y2="280" stroke="#ffffff" stroke-opacity="0.04" stroke-width="1" />
      <line x1="0" y1="${H - 240}" x2="${W}" y2="${H - 240}" stroke="#ffffff" stroke-opacity="0.04" stroke-width="1" />

      <!-- Top Header Brand -->
      <g transform="translate(80, 140)">
        <!-- Brand Icon -->
        <rect x="0" y="0" width="56" height="56" rx="14" fill="#0f172a" stroke="${slideData.accentColor}" stroke-width="2" />
        <circle cx="28" cy="28" r="14" fill="none" stroke="${slideData.accentColor}" stroke-width="3" />
        <circle cx="28" cy="28" r="5" fill="${slideData.accentColor}" />

        <!-- Brand Name -->
        <text x="72" y="32" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="800" fill="#ffffff" letter-spacing="1">
          SPADAS LENS
        </text>
        <text x="72" y="52" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="600" fill="#94a3b8" letter-spacing="0.5">
          Reseller Scanner &amp; Net Profit Copilot
        </text>

        <!-- Slide Number Indicator -->
        <rect x="${W - 250}" y="10" width="90" height="38" rx="19" fill="#1e293b" stroke="#334155" stroke-width="1.5" />
        <text x="${W - 205}" y="35" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="700" fill="#ffffff">
          ${slideData.slideNum} / 3
        </text>
      </g>

      <!-- Category Pill -->
      <g transform="translate(80, 290)">
        <rect x="0" y="0" width="460" height="46" rx="23" fill="${slideData.accentColor}" fill-opacity="0.16" stroke="${slideData.accentColor}" stroke-width="1.5" />
        <text x="24" y="30" font-family="system-ui, -apple-system, sans-serif" font-size="19" font-weight="800" fill="${slideData.accentColor}" letter-spacing="1.5">
          ${escapeXml(slideData.category)}
        </text>
      </g>

      <!-- Main Headline -->
      <g transform="translate(80, 420)">
        <text x="0" y="0" font-family="system-ui, -apple-system, sans-serif" font-size="56" font-weight="900" fill="#ffffff" letter-spacing="-1">
          ${escapeXml(slideData.headline)}
        </text>
        <text x="0" y="70" font-family="system-ui, -apple-system, sans-serif" font-size="30" font-weight="500" fill="#94a3b8">
          ${escapeXml(slideData.subheadline)}
        </text>
      </g>

      <!-- Center Hero Glass Card -->
      <g transform="translate(80, 680)">
        <!-- Card Background -->
        <rect x="0" y="0" width="920" height="740" rx="36" fill="url(#cardGrad)" stroke="#334155" stroke-width="2" />
        <rect x="2" y="2" width="916" height="12" rx="6" fill="url(#accentGrad)" />

        <!-- Card Header Badge -->
        <rect x="48" y="56" width="360" height="42" rx="21" fill="#0f172a" stroke="${slideData.accentColor}" stroke-width="1" />
        <text x="68" y="83" font-family="system-ui, -apple-system, sans-serif" font-size="17" font-weight="800" fill="${slideData.accentColor}" letter-spacing="1">
          ${escapeXml(slideData.cardBadge)}
        </text>

        <!-- Card Title -->
        <text x="48" y="165" font-family="system-ui, -apple-system, sans-serif" font-size="44" font-weight="800" fill="#ffffff">
          ${escapeXml(slideData.cardTitle)}
        </text>

        <!-- Primary Value Stat -->
        <rect x="48" y="220" width="824" height="230" rx="24" fill="#070a12" stroke="#1e293b" stroke-width="1.5" />
        
        <text x="88" y="310" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="700" fill="#64748b" letter-spacing="1">
          ESTIMATED VALUE &amp; VERIFIED OUTCOME
        </text>

        <text x="88" y="395" font-family="system-ui, -apple-system, sans-serif" font-size="58" font-weight="900" fill="url(#accentGrad)" letter-spacing="-1">
          ${escapeXml(slideData.cardPrice)}
        </text>

        <!-- Card Notes -->
        <g transform="translate(48, 510)">
          <circle cx="20" cy="20" r="14" fill="${slideData.accentColor}" fill-opacity="0.2" />
          <path d="M14 20 L18 24 L26 16" fill="none" stroke="${slideData.accentColor}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
          <text x="50" y="27" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="600" fill="#cbd5e1">
            ${escapeXml(slideData.cardNotes)}
          </text>
        </g>

        <!-- Live Platform Indicators -->
        <g transform="translate(48, 620)">
          <text x="0" y="26" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="700" fill="#475569">
            REAL-TIME DATA FROM:
          </text>
          <text x="250" y="26" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="800" fill="#ffffff">
            eBay • Poshmark • Depop • Mercari
          </text>
        </g>
      </g>

      <!-- Bottom Interactive Swipe Tagline -->
      <g transform="translate(80, 1540)">
        <rect x="0" y="0" width="920" height="96" rx="28" fill="url(#accentGrad)" />
        <text x="460" y="60" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="900" fill="#ffffff" letter-spacing="1.5">
          ${escapeXml(slideData.tagline)}
        </text>
      </g>

      <!-- Footer Micro Trust Note -->
      <text x="${W / 2}" y="1740" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="500" fill="#64748b">
        Spadas Lens • 10 Free Daily Scans • Zero Card Required • spadas.ai
      </text>
    </svg>
  `;

  const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
  fs.writeFileSync(outputPath, buffer);
  console.log(`✓ Generated: ${path.basename(outputPath)}`);
}

async function run() {
  console.log('Starting slideshow generation...\n');

  for (const set of slideshowSets) {
    console.log(`Processing Set: "${set.title}" (${set.setId})`);
    for (const slide of set.slides) {
      const filename = `${set.setId}_slide_${slide.slideNum}.png`;
      const outPath = path.join(outDir, filename);
      await generateSlide(slide, outPath);
    }
    console.log('');
  }

  console.log('🎉 ALL VIRAL SLIDESHOW SETS GENERATED IN:');
  console.log('   ' + outDir + '\n');
}

run().catch((err) => {
  console.error('Error generating slideshows:', err);
  process.exit(1);
});
