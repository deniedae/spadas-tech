const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const srcAab = path.join(rootDir, 'store_packages', 'google_play_kit', 'Spadas_AI.aab');
const target2 = path.join(rootDir, 'store_packages', 'Spadas_AI_Release.aab');
const downloadsDir = path.join(process.env.USERPROFILE || 'C:\\Users\\denie', 'Downloads');
const targetDownloads = path.join(downloadsDir, 'Spadas_AI_Release.aab');

if (!fs.existsSync(srcAab)) {
  console.error('Source AAB not found at:', srcAab);
  process.exit(1);
}

fs.copyFileSync(srcAab, target2);
console.log('✓ Copied to target 2:', target2);

if (fs.existsSync(downloadsDir)) {
  fs.copyFileSync(srcAab, targetDownloads);
  console.log('✓ Copied to Downloads:', targetDownloads);
}

const jarsigner = '"C:\\Program Files\\Eclipse Adoptium\\jdk-17.0.20.101-hotspot\\bin\\jarsigner.exe"';
const verifyOut = execSync(`${jarsigner} -verify "${srcAab}"`, { encoding: 'utf8' });
console.log('\nJarsigner Verification:\n', verifyOut.trim());

// Verify versionCode inside srcAab
const jarExe = '"C:\\Program Files\\Eclipse Adoptium\\jdk-17.0.20.101-hotspot\\bin\\jar.exe"';
const tempDir = path.join(rootDir, 'scratch', 'verify_deploy_manifest');
if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
fs.mkdirSync(tempDir, { recursive: true });

execSync(`${jarExe} xf "${srcAab}" base/manifest/AndroidManifest.xml`, { cwd: tempDir });
const manifestBuf = fs.readFileSync(path.join(tempDir, 'base', 'manifest', 'AndroidManifest.xml'));
const vcIdx = manifestBuf.indexOf('versionCode');
if (vcIdx !== -1) {
  const hexStr = manifestBuf.slice(vcIdx, vcIdx + 32).toString('hex');
  const asciiStr = manifestBuf.slice(vcIdx, vcIdx + 16).toString('ascii');
  console.log('\nManifest versionCode offset:', vcIdx);
  console.log('Manifest ASCII slice:', asciiStr);
  console.log('Manifest Hex slice:  ', hexStr);
  if (asciiStr.includes('13')) {
    console.log('🎉 VERIFICATION CONFIRMED: AndroidManifest.xml contains versionCode 13!');
  }
}

const minIdx = manifestBuf.indexOf('minSdkVersion');
if (minIdx !== -1) {
  const minAscii = manifestBuf.slice(minIdx, minIdx + 20).toString('ascii');
  console.log('Manifest minSdk ASCII slice:', minAscii);
  if (minAscii.includes('24')) {
    console.log('🎉 VERIFICATION CONFIRMED: AndroidManifest.xml contains minSdkVersion 24 (Play Automatic Protection Compliant)!');
  }
}
fs.rmSync(tempDir, { recursive: true, force: true });
