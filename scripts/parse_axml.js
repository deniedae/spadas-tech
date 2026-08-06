const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, '..', 'extracted_apk', 'AndroidManifest.xml');
const buffer = fs.readFileSync(manifestPath);

function readStringPool(buf) {
  let offset = 8;
  const stringCount = buf.readInt32LE(16);
  const stringsStart = buf.readInt32LE(28);
  console.log('String count in AXML:', stringCount);
  
  const pool = [];
  const stringOffsets = [];
  for (let i = 0; i < stringCount; i++) {
    stringOffsets.push(buf.readInt32LE(36 + i * 4));
  }
  
  const poolBase = 36 + stringCount * 4;
  for (let i = 0; i < stringCount; i++) {
    const strOffset = poolBase + stringOffsets[i];
    const len = buf.readUInt16LE(strOffset);
    let s = '';
    for (let j = 0; j < len; j++) {
      const charCode = buf.readUInt16LE(strOffset + 2 + j * 2);
      if (charCode > 0) s += String.fromCharCode(charCode);
    }
    if (s) pool.push(s);
  }
  return pool;
}

try {
  const strings = readStringPool(buffer);
  console.log('Sample Manifest Strings:', strings.filter(s => s.length > 2).slice(0, 40));
} catch (e) {
  console.error('Error reading string pool:', e.message);
}
