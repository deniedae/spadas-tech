const fs = require('fs');
const path = require('path');

const downloadsDir = path.join(process.env.USERPROFILE || 'C:\\Users\\denie', 'Downloads');
const srcApk = path.join(__dirname, '..', 'public', 'spadas-ai.apk');
const srcXapk = path.join(downloadsDir, 'Spadas-AI.xapk');

const cleanApk = path.join(downloadsDir, 'spadas.apk');
const cleanXapk = path.join(downloadsDir, 'spadas.xapk');

fs.copyFileSync(srcApk, cleanApk);
console.log('Created clean APK file (no spaces/dashes):', cleanApk);

if (fs.existsSync(srcXapk)) {
  fs.copyFileSync(srcXapk, cleanXapk);
  console.log('Created clean XAPK file (no spaces/dashes):', cleanXapk);
}
