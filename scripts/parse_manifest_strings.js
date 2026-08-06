const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, '..', 'extracted_apk', 'AndroidManifest.xml');
const buffer = fs.readFileSync(manifestPath);
const str = buffer.toString('binary');

// Extract printable strings from binary AndroidManifest.xml
const strings = str.match(/[\x20-\x7E]{3,}/g) || [];
console.log('Extracted Manifest Strings:', strings.slice(0, 50));
