const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

function crc32(buf) {
  let c = 0xffffffff;
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let k = n;
    for (let i = 0; i < 8; i++) {
      k = k & 1 ? 0xedb88320 ^ (k >>> 1) : k >>> 1;
    }
    table[n] = k;
  }
  for (let i = 0; i < buf.length; i++) {
    c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function createPngImage(width, height, pixelFn) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdr = makeChunk("IHDR", ihdrData);

  const rowSize = 1 + width * 4;
  const scanlines = Buffer.alloc(height * rowSize);

  for (let y = 0; y < height; y++) {
    const offset = y * rowSize;
    scanlines[offset] = 0; // Filter type 0
    for (let x = 0; x < width; x++) {
      const px = offset + 1 + x * 4;
      const [r, g, b, a] = pixelFn(x, y, width, height);
      scanlines[px] = r;
      scanlines[px + 1] = g;
      scanlines[px + 2] = b;
      scanlines[px + 3] = a;
    }
  }

  const idatData = zlib.deflateSync(scanlines);
  const idat = makeChunk("IDAT", idatData);
  const iend = makeChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([sig, ihdr, idat, iend]);
}

// Ensure target directories exist
const publicDir = path.join(__dirname, "..", "public");
const screenshotsDir = path.join(publicDir, "screenshots");
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

// 1. App Icon Pixel Function (Standard - rounded emblem with Spadas AI brand colors)
function iconPixel(x, y, w, h, isMaskable = false) {
  const cx = w / 2;
  const cy = h / 2;
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (isMaskable) {
    // Maskable icons fill entire safe area with gradient background
    const gradientRatio = (x + y) / (w + h);
    const r = Math.round(15 + gradientRatio * (37 - 15));
    const g = Math.round(23 + gradientRatio * (99 - 23));
    const b = Math.round(42 + gradientRatio * (235 - 42));
    
    // Draw central 'S' or AI lens circle in safe area
    if (dist < w * 0.28) {
      const innerRatio = dist / (w * 0.28);
      return [
        Math.round(37 + innerRatio * (99 - 37)),
        Math.round(99 + innerRatio * (102 - 99)),
        Math.round(235 + innerRatio * (241 - 235)),
        255
      ];
    }
    return [r, g, b, 255];
  } else {
    // Standard icon: Rounded brand emblem with transparent background
    const rOuter = w * 0.44;
    if (dist <= rOuter) {
      const ratio = dist / rOuter;
      const r = Math.round(37 + ratio * (20 - 37));
      const g = Math.round(99 + ratio * (40 - 99));
      const b = Math.round(235 + ratio * (180 - 235));
      return [r, g, b, 255];
    }
    return [0, 0, 0, 0];
  }
}

// 2. Desktop Screenshot Pixel Function (1280x720 dark mode dashboard layout)
function desktopScreenshotPixel(x, y, w, h) {
  // Sidebar (left 220px)
  if (x < 220) {
    if (y < 60) return [15, 23, 42, 255]; // Header
    return [11, 17, 32, 255]; // Sidebar body
  }
  // Top Navbar (top 60px)
  if (y < 60) {
    return [15, 23, 42, 255];
  }
  // Main content body (Dark sleek UI cards)
  const margin = 20;
  const cardWidth = (w - 220 - margin * 4) / 3;
  const relX = x - 220;
  const cardY = y - 60;
  
  if (cardY > 20 && cardY < 180) {
    const cardIdx = Math.floor((relX - margin) / (cardWidth + margin));
    const inCardX = (relX - margin) % (cardWidth + margin);
    if (cardIdx >= 0 && cardIdx < 3 && inCardX < cardWidth) {
      return [24, 33, 58, 255]; // Card background
    }
  }
  
  // Large chart/lens area below
  if (cardY > 200 && cardY < 620 && relX > 20 && relX < w - 240) {
    return [18, 26, 47, 255];
  }
  
  return [9, 13, 22, 255]; // Background #090d16
}

// 3. Mobile Screenshot Pixel Function (750x1334 portrait scanner UI)
function mobileScreenshotPixel(x, y, w, h) {
  // Header bar
  if (y < 90) return [15, 23, 42, 255];
  // Bottom navigation bar
  if (y > h - 110) return [15, 23, 42, 255];
  
  // Camera view frame with overlay box
  const frameMarginX = 80;
  const frameYStart = 200;
  const frameYEnd = 900;
  if (x > frameMarginX && x < w - frameMarginX && y > frameYStart && y < frameYEnd) {
    // Camera feed background gradient
    const camRatio = y / h;
    const r = Math.round(20 + camRatio * 30);
    const g = Math.round(30 + camRatio * 40);
    const b = Math.round(50 + camRatio * 60);
    
    // Scanner reticle border
    if (x < frameMarginX + 10 || x > w - frameMarginX - 10 || y < frameYStart + 10 || y > frameYEnd - 10) {
      return [37, 99, 235, 255]; // Blue glowing reticle
    }
    return [r, g, b, 255];
  }

  return [9, 13, 22, 255];
}

console.log("Generating PWA PNG icons and screenshots...");

// Write 192x192 standard icon
fs.writeFileSync(path.join(publicDir, "icon-192.png"), createPngImage(192, 192, (x, y, w, h) => iconPixel(x, y, w, h, false)));
console.log("Created icon-192.png");

// Write 512x512 standard icon
fs.writeFileSync(path.join(publicDir, "icon-512.png"), createPngImage(512, 512, (x, y, w, h) => iconPixel(x, y, w, h, false)));
console.log("Created icon-512.png");

// Write 192x192 maskable icon
fs.writeFileSync(path.join(publicDir, "maskable-192.png"), createPngImage(192, 192, (x, y, w, h) => iconPixel(x, y, w, h, true)));
console.log("Created maskable-192.png");

// Write 512x512 maskable icon
fs.writeFileSync(path.join(publicDir, "maskable-512.png"), createPngImage(512, 512, (x, y, w, h) => iconPixel(x, y, w, h, true)));
console.log("Created maskable-512.png");

// Write desktop screenshot
fs.writeFileSync(path.join(screenshotsDir, "desktop.png"), createPngImage(1280, 720, desktopScreenshotPixel));
console.log("Created screenshots/desktop.png");

// Write mobile screenshot
fs.writeFileSync(path.join(screenshotsDir, "mobile.png"), createPngImage(750, 1334, mobileScreenshotPixel));
console.log("Created screenshots/mobile.png");

console.log("All PWA assets generated successfully!");
