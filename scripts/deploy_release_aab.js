const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const srcAab = path.join(rootDir, 'scratch', 'twa_build', 'app', 'build', 'outputs', 'bundle', 'release', 'app-release.aab');
const target1 = path.join(rootDir, 'store_packages', 'google_play_kit', 'Spadas_AI.aab');
const target2 = path.join(rootDir, 'store_packages', 'Spadas_AI_Release.aab');
const downloadsDir = path.join(process.env.USERPROFILE || 'C:\\Users\\denie', 'Downloads');
const targetDownloads = path.join(downloadsDir, 'Spadas_AI_Release.aab');

if (!fs.existsSync(srcAab)) {
  console.error('Source AAB not found at:', srcAab);
  process.exit(1);
}

fs.copyFileSync(srcAab, target1);
fs.copyFileSync(srcAab, target2);
console.log('✓ Copied to target 1:', target1);
console.log('✓ Copied to target 2:', target2);

if (fs.existsSync(downloadsDir)) {
  fs.copyFileSync(srcAab, targetDownloads);
  console.log('✓ Copied to Downloads:', targetDownloads);
}

const jarsigner = '"C:\\Program Files\\Eclipse Adoptium\\jdk-17.0.20.101-hotspot\\bin\\jarsigner.exe"';
const verifyOut = execSync(`${jarsigner} -verify "${target1}"`, { encoding: 'utf8' });
console.log('\nJarsigner Verification:\n', verifyOut.trim());

// Verify versionCode inside target1
const jarExe = '"C:\\Program Files\\Eclipse Adoptium\\jdk-17.0.20.101-hotspot\\bin\\jar.exe"';
const tempDir = path.join(rootDir, 'scratch', 'verify_deploy_manifest');
if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
fs.mkdirSync(tempDir, { recursive: true });

execSync(`${jarExe} xf "${target1}" base/manifest/AndroidManifest.xml`, { cwd: tempDir });
const manifestBuf = fs.readFileSync(path.join(tempDir, 'base', 'manifest', 'AndroidManifest.xml'));
const vcIdx = manifestBuf.indexOf('versionCode');
if (vcIdx !== -1) {
  const hexStr = manifestBuf.slice(vcIdx, vcIdx + 32).toString('hex');
  const asciiStr = manifestBuf.slice(vcIdx, vcIdx + 16).toString('ascii');
  console.log('\nManifest versionCode offset:', vcIdx);
  console.log('Manifest ASCII slice:', asciiStr);
  console.log('Manifest Hex slice:  ', hexStr);
  if (asciiStr.includes('12')) {
    console.log('🎉 VERIFICATION CONFIRMED: AndroidManifest.xml contains versionCode 12!');
  }
}
fs.rmSync(tempDir, { recursive: true, force: true });
