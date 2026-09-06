const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const sharp = require("sharp");

const rootDir = path.join(__dirname, "..");
const publicDir = path.join(rootDir, "public");
const extractedResDir = path.join(rootDir, "extracted_apk", "res");
const apkPath = path.join(publicDir, "spadas-ai.apk");

function createSvgIcon(isMaskable = false) {
  return `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#070b14"/>
      <stop offset="45%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e1b4b"/>
    </linearGradient>

    <linearGradient id="neonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="50%" stop-color="#2563eb"/>
      <stop offset="100%" stop-color="#4f46e5"/>
    </linearGradient>

    <linearGradient id="whiteGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#f0f9ff"/>
    </linearGradient>

    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#10b981"/>
      <stop offset="100%" stop-color="#06b6d4"/>
    </linearGradient>

    <radialGradient id="glowRing" cx="50%" cy="50%" r="50%">
      <stop offset="40%" stop-color="#2563eb" stop-opacity="0.45"/>
      <stop offset="75%" stop-color="#38bdf8" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>

    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="5" stdDeviation="7" flood-color="#0284c7" flood-opacity="0.6"/>
    </filter>
  </defs>

  ${
    isMaskable
      ? `<rect width="512" height="512" fill="url(#bgGrad)"/>`
      : `<rect width="512" height="512" rx="115" fill="url(#bgGrad)" stroke="#2563eb" stroke-width="5"/>`
  }

  <!-- Ambient Glow Ring -->
  <circle cx="256" cy="256" r="175" fill="url(#glowRing)"/>

  <!-- Outer Camera / Lens Reticle Ring (Cyan) -->
  <circle cx="256" cy="256" r="146" fill="none" stroke="#0284c7" stroke-width="3" stroke-dasharray="16 8" opacity="0.7"/>

  <!-- 4 Corner Target Brackets (AR Lens Scanner HUD) -->
  <!-- Top-Left -->
  <path d="M 172 198 L 172 172 L 198 172" fill="none" stroke="#38bdf8" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
  <!-- Top-Right -->
  <path d="M 314 172 L 340 172 L 340 198" fill="none" stroke="#38bdf8" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
  <!-- Bottom-Left -->
  <path d="M 172 314 L 172 340 L 198 340" fill="none" stroke="#38bdf8" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
  <!-- Bottom-Right -->
  <path d="M 314 340 L 340 340 L 340 314" fill="none" stroke="#38bdf8" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>

  <!-- Central Camera Aperture Core Circle -->
  <circle cx="256" cy="256" r="84" fill="#0f172a" stroke="url(#neonGrad)" stroke-width="6" filter="url(#shadow)"/>

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
  <circle cx="256" cy="256" r="4.5" fill="#38bdf8"/>
</svg>
`;
}

async function patchApkIcons() {
  console.log("==================================================");
  console.log(" 🚀 Patching High-Contrast App Icons into APK & PWA ");
  console.log("==================================================");

  const standardSvg = Buffer.from(createSvgIcon(false));
  const maskableSvg = Buffer.from(createSvgIcon(true));

  // 1. Update Public PWA Assets
  console.log("\n1. Updating public PWA web icons...");
  await sharp(standardSvg).resize(512, 512).png().toFile(path.join(publicDir, "icon-512.png"));
  await sharp(standardSvg).resize(192, 192).png().toFile(path.join(publicDir, "icon-192.png"));
  await sharp(maskableSvg).resize(512, 512).png().toFile(path.join(publicDir, "maskable-512.png"));
  await sharp(maskableSvg).resize(192, 192).png().toFile(path.join(publicDir, "maskable-192.png"));
  await sharp(standardSvg).resize(512, 512).png().toFile(path.join(publicDir, "store-icon-512.png"));
  console.log("✓ Updated all public icon PNGs");

  // 2. Patch APK resource files inside extracted_apk/res/
  if (fs.existsSync(extractedResDir)) {
    console.log("\n2. Patching APK internal icon drawables in extracted_apk/res/...");

    const apkIconTargets = [
      // Standard icons (ic_launcher)
      { file: "9w.png", size: 48, maskable: false },
      { file: "yn.png", size: 72, maskable: false },
      { file: "FS.png", size: 96, maskable: false },
      { file: "RJ.png", size: 48, maskable: false },
      { file: "o-.png", size: 192, maskable: false },

      // Adaptive / Maskable icons (ic_maskable)
      { file: "ex.png", size: 82, maskable: true },
      { file: "Rm.png", size: 123, maskable: true },
      { file: "ky.png", size: 164, maskable: true },
      { file: "-N.png", size: 246, maskable: true },
      { file: "QI.png", size: 328, maskable: true },
    ];

    for (const target of apkIconTargets) {
      const destPath = path.join(extractedResDir, target.file);
      const svg = target.maskable ? maskableSvg : standardSvg;
      await sharp(svg).resize(target.size, target.size).png().toFile(destPath);
      console.log(`✓ Patched APK res/${target.file} (${target.size}x${target.size})`);
    }

    // 3. Repackage into public/spadas-ai.apk using jar tool
    console.log("\n3. Repackaging updated APK...");
    const extractedDir = path.join(rootDir, "extracted_apk");
    
    // Remove old signatures before resigning
    const metaInfDir = path.join(extractedDir, "META-INF");
    if (fs.existsSync(metaInfDir)) {
      const metaFiles = fs.readdirSync(metaInfDir);
      for (const mf of metaFiles) {
        if (mf.endsWith(".SF") || mf.endsWith(".RSA") || mf.endsWith(".DSA")) {
          fs.unlinkSync(path.join(metaInfDir, mf));
          console.log(`✓ Removed old signature file: META-INF/${mf}`);
        }
      }
    }

    // Repack zip
    const tempZip = path.join(publicDir, "temp_repack.zip");
    if (fs.existsSync(tempZip)) fs.unlinkSync(tempZip);
    
    // Use powershell Compress-Archive to repack
    const psCmd = `powershell -Command "Compress-Archive -Path '${extractedDir}\\*' -DestinationPath '${tempZip}' -Force"`;
    console.log("Repacking archive via powershell...");
    execSync(psCmd, { stdio: "inherit" });

    // Move to public/spadas-ai.apk
    if (fs.existsSync(apkPath)) fs.unlinkSync(apkPath);
    fs.renameSync(tempZip, apkPath);
    console.log("✓ Repackaged public/spadas-ai.apk with crisp icons!");
  } else {
    console.warn("extracted_apk directory not found, skipping internal APK res patch.");
  }

  // 4. Align & Sign with Release Keystore
  console.log("\n4. Running release alignment & signing...");
  const signScript = path.join(__dirname, "build_and_sign_release_apk.js");
  execSync(`node "${signScript}"`, { stdio: "inherit" });

  console.log("\n🎉 SUCCESS: Crisp, high-contrast app icon is fully installed in APK and signed for release!");
}

patchApkIcons().catch((err) => {
  console.error("Error patching APK icons:", err);
  process.exit(1);
});
