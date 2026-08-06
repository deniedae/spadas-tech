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

function createStoreIcon(w, h) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(w, 0);
  ihdrData.writeUInt32BE(h, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdr = makeChunk("IHDR", ihdrData);

  const rowSize = 1 + w * 4;
  const scanlines = Buffer.alloc(h * rowSize);

  const cx = w / 2;
  const cy = h / 2;

  for (let y = 0; y < h; y++) {
    const offset = y * rowSize;
    scanlines[offset] = 0;
    for (let x = 0; x < w; x++) {
      const px = offset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Vibrant Gradient Background (#2563eb to #1d4ed8)
      const ratio = (x + y) / (w + h);
      const r = Math.round(37 + ratio * 20);
      const g = Math.round(99 + ratio * 30);
      const b = Math.round(235 + ratio * 20);

      // Central glowing lens emblem
      if (dist < w * 0.22) {
        scanlines[px] = 255;
        scanlines[px + 1] = 255;
        scanlines[px + 2] = 255;
        scanlines[px + 3] = 255;
      } else if (dist < w * 0.32) {
        scanlines[px] = 59;
        scanlines[px + 1] = 130;
        scanlines[px + 2] = 246;
        scanlines[px + 3] = 255;
      } else {
        scanlines[px] = r;
        scanlines[px + 1] = g;
        scanlines[px + 2] = b;
        scanlines[px + 3] = 255;
      }
    }
  }

  const idatData = zlib.deflateSync(scanlines);
  const idat = makeChunk("IDAT", idatData);
  const iend = makeChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([sig, ihdr, idat, iend]);
}

const publicDir = path.join(__dirname, "..", "public");
fs.writeFileSync(path.join(publicDir, "store-icon-512.png"), createStoreIcon(512, 512));
console.log("Created store-icon-512.png");
