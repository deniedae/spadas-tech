const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, '..', 'extracted_apk', 'AndroidManifest.xml');
const buf = fs.readFileSync(manifestPath);

for (let i = 0; i < buf.length - 4; i += 2) {
  const val = buf.readInt32LE(i);
  if (val === 10000 || val === 1 || val === 33 || val === 34 || val === 21) {
    // Check if near manifest header
  }
}

console.log('Manifest file length:', buf.length, 'bytes');
