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

// 24-bit RGB PNG generator (no alpha channel, 100% compliant with APKPure)
function create24BitRgbPng(width, height, pixelFn) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 2; // RGB (24-bit)
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdr = makeChunk("IHDR", ihdrData);

  const rowSize = 1 + width * 3;
  const scanlines = Buffer.alloc(height * rowSize);

  for (let y = 0; y < height; y++) {
    const offset = y * rowSize;
    scanlines[offset] = 0; // Filter type 0
    for (let x = 0; x < width; x++) {
      const px = offset + 1 + x * 3;
      const [r, g, b] = pixelFn(x, y, width, height);
      scanlines[px] = r;
      scanlines[px + 1] = g;
      scanlines[px + 2] = b;
    }
  }

  const idatData = zlib.deflateSync(scanlines);
  const idat = makeChunk("IDAT", idatData);
  const iend = makeChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([sig, ihdr, idat, iend]);
}

// 1. Feature Graphic Pixel Function (1024x500 Banner)
function featureGraphicPixel(x, y, w, h) {
  const ratio = (x + y) / (w + h);
  // Rich blue-indigo gradient (#0f172a -> #1e40af -> #0284c7)
  const r = Math.round(15 + ratio * (30 - 15));
  const g = Math.round(23 + ratio * (130 - 23));
  const b = Math.round(42 + ratio * (235 - 42));

  // Central glowing lens emblem
  const cx = w * 0.25;
  const cy = h * 0.5;
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < 80) {
    return [255, 255, 255];
  } else if (dist < 110) {
    return [59, 130, 246];
  }

  // Right card mockup preview background
  if (x > w * 0.55 && x < w * 0.9 && y > h * 0.15 && y < h * 0.85) {
    const cardBorder = x < w * 0.55 + 4 || x > w * 0.9 - 4 || y < h * 0.15 + 4 || y > h * 0.85 - 4;
    if (cardBorder) return [56, 189, 248];
    return [30, 41, 59];
  }

  return [r, g, b];
}

// 2. Mobile Screenshot 1 Pixel Function (720x1280 Scanner view)
function screenshot1Pixel(x, y, w, h) {
  if (y < 90) return [15, 23, 42]; // Header
  if (y > h - 110) return [15, 23, 42]; // Footer

  // Scanner reticle
  if (x > 80 && x < w - 80 && y > 200 && y < 850) {
    if (x < 90 || x > w - 90 || y < 210 || y > 840) {
      return [37, 99, 235]; // Glowing reticle
    }
    return [24, 33, 58];
  }
  return [9, 13, 22];
}

// 3. Mobile Screenshot 2 Pixel Function (720x1280 Analytics view)
function screenshot2Pixel(x, y, w, h) {
  if (y < 90) return [15, 23, 42];
  if (y > h - 110) return [15, 23, 42];

  // Analytics Cards
  if (y > 150 && y < 400 && x > 40 && x < w - 40) {
    return [30, 41, 59];
  }
  if (y > 450 && y < 850 && x > 40 && x < w - 40) {
    return [24, 33, 58];
  }
  return [9, 13, 22];
}

const publicDir = path.join(__dirname, "..", "public");

console.log("Generating 24-bit RGB Feature Graphic and Screenshots for APKPure...");

// Feature Graphic (1024x500)
fs.writeFileSync(path.join(publicDir, "store-feature-graphic-1024x500.png"), create24BitRgbPng(1024, 500, featureGraphicPixel));
console.log("Created store-feature-graphic-1024x500.png");

// Screenshot 1 (720x1280)
fs.writeFileSync(path.join(publicDir, "store-screenshot-1.png"), create24BitRgbPng(720, 1280, screenshot1Pixel));
console.log("Created store-screenshot-1.png");

// Screenshot 2 (720x1280)
fs.writeFileSync(path.join(publicDir, "store-screenshot-2.png"), create24BitRgbPng(720, 1280, screenshot2Pixel));
console.log("Created store-screenshot-2.png");

console.log("All store graphics generated successfully!");
