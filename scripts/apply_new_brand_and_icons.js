const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { execSync } = require('child_process');

console.log('======================================================');
console.log('  Spadas Lens: Reseller Scanner — Brand & Icon Update ');
console.log('======================================================\n');

const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const srcAppDir = path.join(rootDir, 'src', 'app');
const kitDir = path.join(rootDir, 'store_packages', 'google_play_kit');
const downloadsDir = path.join(process.env.USERPROFILE || 'C:\\Users\\denie', 'Downloads', 'Google_Play_Screenshots');
const aabPath = path.join(kitDir, 'Spadas_AI.aab');
const ksPath = path.join(kitDir, 'signing.keystore');
const jarExe = '"C:\\Program Files\\Eclipse Adoptium\\jdk-17.0.20.101-hotspot\\bin\\jar.exe"';
const jarsignerExe = '"C:\\Program Files\\Eclipse Adoptium\\jdk-17.0.20.101-hotspot\\bin\\jarsigner.exe"';

// -------------------------------------------------------------
// 1. GENERATE ICON SUITE FROM APPROVED EMBLEM
// -------------------------------------------------------------
function getIconSvg(isMaskable = false) {
  return `
    <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgObsidian" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0b1120"/>
          <stop offset="50%" stop-color="#060911"/>
          <stop offset="100%" stop-color="#020408"/>
        </linearGradient>

        <linearGradient id="ringCyan" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#38bdf8"/>
          <stop offset="50%" stop-color="#06b6d4"/>
          <stop offset="100%" stop-color="#2563eb"/>
        </linearGradient>

        <linearGradient id="amberCore" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fbbf24"/>
          <stop offset="50%" stop-color="#f59e0b"/>
          <stop offset="100%" stop-color="#ea580c"/>
        </linearGradient>

        <linearGradient id="glassGloss" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.18"/>
          <stop offset="45%" stop-color="#ffffff" stop-opacity="0.04"/>
          <stop offset="50%" stop-color="#ffffff" stop-opacity="0"/>
        </linearGradient>

        <filter id="glowFilter" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="16" result="blur"/>
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>
        <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" result="blur"/>
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>
      </defs>

      ${
        isMaskable
          ? `<!-- Full Bleed Obsidian for Android Adaptive Masks -->
             <rect width="512" height="512" fill="url(#bgObsidian)"/>`
          : `<!-- Squircle Base for Google Play & PWA -->
             <rect x="0" y="0" width="512" height="512" rx="115" ry="115" fill="url(#bgObsidian)"/>
             <rect x="2" y="2" width="508" height="508" rx="113" ry="113" fill="none" stroke="#1e293b" stroke-width="4"/>
             <rect x="6" y="6" width="500" height="500" rx="109" ry="109" fill="none" stroke="#0ea5e9" stroke-opacity="0.2" stroke-width="2"/>`
      }

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
  `;
}

// Function to create a standard ICO buffer containing 16x16, 32x32, 48x48 PNGs
function createIco(pngBuffers) {
  // pngBuffers: array of { width, height, buffer }
  const numImages = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: 1 = ICO
  header.writeUInt16LE(numImages, 4);

  let offset = 6 + numImages * 16;
  const dirEntries = [];
  for (const img of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(img.width >= 256 ? 0 : img.width, 0);
    entry.writeUInt8(img.height >= 256 ? 0 : img.height, 1);
    entry.writeUInt8(0, 2); // color count
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // planes
    entry.writeUInt16LE(32, 6); // bit count
    entry.writeUInt32LE(img.buffer.length, 8); // bytes in resource
    entry.writeUInt32LE(offset, 12); // offset of image data
    dirEntries.push(entry);
    offset += img.buffer.length;
  }

  return Buffer.concat([header, ...dirEntries, ...pngBuffers.map(b => b.buffer)]);
}

async function generateAllIcons() {
  console.log('--- Step 1: Generating High-Resolution Icon Suite ---');
  const squircleSvg = Buffer.from(getIconSvg(false));
  const maskableSvg = Buffer.from(getIconSvg(true));

  // 1. Standard 512x512
  const icon512 = await sharp(squircleSvg).png({ quality: 100 }).toBuffer();
  fs.writeFileSync(path.join(publicDir, 'icon-512.png'), icon512);
  fs.writeFileSync(path.join(publicDir, 'store-icon-512.png'), icon512);
  fs.writeFileSync(path.join(kitDir, '1_app_icon_512x512.png'), icon512);
  if (fs.existsSync(downloadsDir)) {
    fs.writeFileSync(path.join(downloadsDir, '1_app_icon_512x512.png'), icon512);
  }
  console.log('✓ 512x512 Master App Icon generated');

  // 2. 192x192 Standard
  const icon192 = await sharp(squircleSvg).resize(192, 192).png({ quality: 100 }).toBuffer();
  fs.writeFileSync(path.join(publicDir, 'icon-192.png'), icon192);
  console.log('✓ 192x192 Standard Icon generated');

  // 3. 1024x1024 Master
  const icon1024 = await sharp(squircleSvg).resize(1024, 1024).png({ quality: 100 }).toBuffer();
  fs.writeFileSync(path.join(publicDir, 'icon-1024.png'), icon1024);
  console.log('✓ 1024x1024 Master Icon generated');

  // 4. Maskable 512x512 & 192x192
  const maskable512 = await sharp(maskableSvg).png({ quality: 100 }).toBuffer();
  const maskable192 = await sharp(maskableSvg).resize(192, 192).png({ quality: 100 }).toBuffer();
  fs.writeFileSync(path.join(publicDir, 'maskable-512.png'), maskable512);
  fs.writeFileSync(path.join(publicDir, 'maskable-192.png'), maskable192);
  console.log('✓ Maskable Icons (512x512 & 192x192) generated');

  // 5. Apple Touch Icon (180x180)
  const apple180 = await sharp(squircleSvg).resize(180, 180).png({ quality: 100 }).toBuffer();
  fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), apple180);
  fs.writeFileSync(path.join(srcAppDir, 'apple-icon.png'), apple180);
  console.log('✓ Apple Touch Icon (180x180) generated');

  // 6. SVG Icon for browser tabs
  fs.writeFileSync(path.join(srcAppDir, 'icon.svg'), squircleSvg);
  console.log('✓ SVG Tab Icon generated');

  // 7. Multi-resolution ICO (16x16, 32x32, 48x48)
  const ico16 = await sharp(squircleSvg).resize(16, 16).png().toBuffer();
  const ico32 = await sharp(squircleSvg).resize(32, 32).png().toBuffer();
  const ico48 = await sharp(squircleSvg).resize(48, 48).png().toBuffer();
  const icoBuffer = createIco([
    { width: 16, height: 16, buffer: ico16 },
    { width: 32, height: 32, buffer: ico32 },
    { width: 48, height: 48, buffer: ico48 },
  ]);
  fs.writeFileSync(path.join(srcAppDir, 'favicon.ico'), icoBuffer);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);
  console.log('✓ Multi-resolution Favicon.ico generated');

  return { squircleSvg, maskableSvg };
}

// -------------------------------------------------------------
// 2. UPDATE MANIFESTS AND METADATA
// -------------------------------------------------------------
function updateManifests() {
  console.log('\n--- Step 2: Updating Manifests & Project Config ---');

  const APP_NAME = 'Spadas Lens: Reseller Scanner';
  const SHORT_NAME = 'Spadas Lens';
  const DESCRIPTION = 'Instant optical scanner & AI reseller copilot. Scan shelves, detect flip margins, compare sold comps on eBay, Poshmark & Mercari, and check authenticity.';

  // 1. twa-manifest.json
  const twaPath = path.join(rootDir, 'twa-manifest.json');
  if (fs.existsSync(twaPath)) {
    const twa = JSON.parse(fs.readFileSync(twaPath, 'utf8'));
    twa.name = APP_NAME;
    twa.launcherName = SHORT_NAME;
    fs.writeFileSync(twaPath, JSON.stringify(twa, null, 2) + '\n');
    console.log('✓ Updated twa-manifest.json (name & launcherName)');
  }

  // 2. public/manifest.json
  const pubManPath = path.join(publicDir, 'manifest.json');
  if (fs.existsSync(pubManPath)) {
    const pubMan = JSON.parse(fs.readFileSync(pubManPath, 'utf8'));
    pubMan.name = APP_NAME;
    pubMan.short_name = SHORT_NAME;
    pubMan.description = DESCRIPTION;
    fs.writeFileSync(pubManPath, JSON.stringify(pubMan, null, 2) + '\n');
    console.log('✓ Updated public/manifest.json');
  }

  // 3. windows-appx.json
  const winPath = path.join(rootDir, 'windows-appx.json');
  if (fs.existsSync(winPath)) {
    const win = JSON.parse(fs.readFileSync(winPath, 'utf8'));
    win.name = APP_NAME;
    fs.writeFileSync(winPath, JSON.stringify(win, null, 2) + '\n');
    console.log('✓ Updated windows-appx.json');
  }
}

// -------------------------------------------------------------
// 3. INJECT INTO PRODUCTION RELEASE AAB
// -------------------------------------------------------------
async function updateAabBundle(squircleSvg, maskableSvg) {
  console.log('\n--- Step 3: Updating Android Release Bundle (AAB) ---');

  if (!fs.existsSync(aabPath)) {
    console.warn('⚠️ AAB not found at:', aabPath);
    return;
  }

  // Generate density mipmaps
  const densities = [
    { name: 'mdpi', launcher: 48, maskable: 82 },
    { name: 'hdpi', launcher: 72, maskable: 123 },
    { name: 'xhdpi', launcher: 96, maskable: 164 },
    { name: 'xxhdpi', launcher: 144, maskable: 246 },
    { name: 'xxxhdpi', launcher: 192, maskable: 328 },
  ];

  const tempBaseDir = path.join(rootDir, 'base');
  const resDir = path.join(tempBaseDir, 'res');

  for (const d of densities) {
    const mipmapDir = path.join(resDir, `mipmap-${d.name}-v4`);
    fs.mkdirSync(mipmapDir, { recursive: true });

    const launcherBuf = await sharp(squircleSvg).resize(d.launcher, d.launcher).png().toBuffer();
    const maskableBuf = await sharp(maskableSvg).resize(d.maskable, d.maskable).png().toBuffer();

    fs.writeFileSync(path.join(mipmapDir, 'ic_launcher.png'), launcherBuf);
    fs.writeFileSync(path.join(mipmapDir, 'ic_maskable.png'), maskableBuf);
  }
  console.log('✓ Generated all density mipmaps (mdpi to xxxhdpi)');

  // Update raw/web_app_manifest.json inside AAB
  const rawDir = path.join(resDir, 'raw');
  fs.mkdirSync(rawDir, { recursive: true });
  const pubMan = JSON.parse(fs.readFileSync(path.join(publicDir, 'manifest.json'), 'utf8'));
  fs.writeFileSync(path.join(rawDir, 'web_app_manifest.json'), JSON.stringify(pubMan));
  console.log('✓ Prepared updated web_app_manifest.json for AAB');

  // Repack all updated files into AAB
  for (const d of densities) {
    execSync(`${jarExe} uf "${aabPath}" base/res/mipmap-${d.name}-v4/ic_launcher.png base/res/mipmap-${d.name}-v4/ic_maskable.png`, {
      cwd: rootDir,
      stdio: 'ignore',
    });
  }
  execSync(`${jarExe} uf "${aabPath}" base/res/raw/web_app_manifest.json`, {
    cwd: rootDir,
    stdio: 'ignore',
  });
  console.log('✓ Repacked mipmaps & web_app_manifest.json into Spadas_AI.aab');

  // Cleanup temp base folder
  try {
    fs.rmSync(tempBaseDir, { recursive: true, force: true });
  } catch {}

  // Run official build:aab to patch manifest versions, re-sign, verify and mirror copies
  console.log('\n--- Step 4: Signing and Verifying Release AAB ---');
  execSync('node scripts/build_production_release_aab.js', { cwd: rootDir, stdio: 'inherit' });
}

// Run Main Flow
(async () => {
  try {
    const { squircleSvg, maskableSvg } = await generateAllIcons();
    updateManifests();
    await updateAabBundle(squircleSvg, maskableSvg);
    console.log('🎉 Brand & Icon Update Complete!');
  } catch (err) {
    console.error('✗ Error updating brand & icons:', err);
    process.exit(1);
  }
})();
