const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const downloadsDir = path.join(process.env.USERPROFILE || 'C:\\Users\\denie', 'Downloads');
const apkPath = path.join(__dirname, '..', 'public', 'spadas-ai.apk');
const iconPath = path.join(__dirname, '..', 'public', 'icon-512.png');
const xapkDir = path.join(__dirname, '..', 'scratch_xapk');
const tempZip = path.join(downloadsDir, 'Spadas-AI.zip');
const outputXapk = path.join(downloadsDir, 'Spadas-AI.xapk');

if (!fs.existsSync(xapkDir)) fs.mkdirSync(xapkDir, { recursive: true });
if (fs.existsSync(tempZip)) fs.unlinkSync(tempZip);
if (fs.existsSync(outputXapk)) fs.unlinkSync(outputXapk);

// 1. Copy APK as com.spadas.ai.apk
fs.copyFileSync(apkPath, path.join(xapkDir, 'com.spadas.ai.apk'));

// 2. Copy Icon as icon.png
if (fs.existsSync(iconPath)) {
  fs.copyFileSync(iconPath, path.join(xapkDir, 'icon.png'));
}

// 3. Create XAPK manifest.json
const manifest = {
  xapk_version: 1,
  package_name: "com.spadas.ai",
  name: "Spadas AI",
  version_code: "1",
  version_name: "1.0.0",
  min_sdk_version: "21",
  target_sdk_version: "34",
  permissions: [
    "android.permission.INTERNET",
    "android.permission.CAMERA",
    "android.permission.ACCESS_NETWORK_STATE"
  ],
  icon: "icon.png",
  split_apks: []
};

fs.writeFileSync(path.join(xapkDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log('Created XAPK manifest.json');

// 4. Create ZIP archive and rename to .xapk
try {
  const psCmd = `Compress-Archive -Path "${xapkDir}\\*" -DestinationPath "${tempZip}" -Force`;
  execSync(`powershell -Command "${psCmd}"`);
  fs.renameSync(tempZip, outputXapk);
  console.log('✓ Successfully created XAPK bundle at:', outputXapk);
} catch (e) {
  console.error('Error creating XAPK:', e.message);
}
