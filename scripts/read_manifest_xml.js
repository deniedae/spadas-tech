const fs = require('fs');
const path = require('path');

const apkPath = path.join(__dirname, '..', 'public', 'spadas-ai.apk');
const buffer = fs.readFileSync(apkPath);

// Search string for package name in AndroidManifest.xml
const content = buffer.toString('binary');
const match = content.match(/com\.[a-zA-Z0-9_\.]+/g);
console.log('Detected Package Names in APK binary:', [...new Set(match)]);
