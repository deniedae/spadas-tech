const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const apkPath = path.join(__dirname, '..', 'public', 'spadas-ai.apk');
const zipPath = path.join(__dirname, '..', 'public', 'spadas-ai.zip');
const outDir = path.join(__dirname, '..', 'extracted_apk');

fs.copyFileSync(apkPath, zipPath);
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

try {
  const psCmd = `Expand-Archive -Path "${zipPath}" -DestinationPath "${outDir}" -Force`;
  execSync(`powershell -Command "${psCmd}"`);
  console.log('Extracted APK files to:', outDir);
  const files = fs.readdirSync(outDir);
  console.log('Extracted root files:', files);
} catch (e) {
  console.error('Extraction error:', e.message);
}
