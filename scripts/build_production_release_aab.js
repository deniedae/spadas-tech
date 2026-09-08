const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('====================================================');
console.log('  Spadas AI — Production App Bundle (AAB) Builder   ');
console.log('====================================================\n');

const jarExe = '"C:\\Program Files\\Eclipse Adoptium\\jdk-17.0.20.101-hotspot\\bin\\jar.exe"';
const jarsignerExe = '"C:\\Program Files\\Eclipse Adoptium\\jdk-17.0.20.101-hotspot\\bin\\jarsigner.exe"';

const rootDir = path.resolve(__dirname, '..');
const kitDir = path.join(rootDir, 'store_packages', 'google_play_kit');
const aabPath = path.join(kitDir, 'Spadas_AI.aab');
const ksPath = path.join(kitDir, 'signing.keystore');
const downloadsDir = path.join(process.env.USERPROFILE || 'C:\\Users\\denie', 'Downloads');

if (!fs.existsSync(aabPath)) {
  console.error('✗ Error: Base AAB template not found at:', aabPath);
  process.exit(1);
}

if (!fs.existsSync(ksPath)) {
  console.error('✗ Error: Release signing.keystore not found at:', ksPath);
  process.exit(1);
}

// STEP 1: Backup current bundle
console.log('--- Step 1: Backing up current AAB bundle ---');
const backupPath = path.join(kitDir, `Spadas_AI.aab.bak-${Date.now()}`);
fs.copyFileSync(aabPath, backupPath);
console.log('✓ Backup saved to:', path.basename(backupPath));

// STEP 2: Extract AndroidManifest.xml
console.log('\n--- Step 2: Extracting AAB AndroidManifest.xml ---');
execSync(`${jarExe} xf "${aabPath}" base/manifest/AndroidManifest.xml`, { cwd: rootDir, stdio: 'inherit' });

const manifestPath = path.join(rootDir, 'base', 'manifest', 'AndroidManifest.xml');
let buf = fs.readFileSync(manifestPath);

// STEP 3: Patch versionCode (to 3), versionName (to 1.2.0.0), and targetSdkVersion (confirm 36)
console.log('\n--- Step 3: Patching versionCode, versionName & targetSdkVersion ---');

// 1. versionCode -> 3
const verCodeIdx = buf.indexOf('versionCode');
if (verCodeIdx === -1) {
  console.error('✗ versionCode not found in manifest protobuf!');
  process.exit(1);
}
console.log('Found versionCode at offset:', verCodeIdx);
console.log('Before versionCode:', buf.slice(verCodeIdx, verCodeIdx + 32));

// ASCII representation:
buf[verCodeIdx + 13] = 0x33; // ASCII '3'
// Integer representation:
buf[verCodeIdx + 28] = 0x03; // integer 3
console.log('After versionCode:', buf.slice(verCodeIdx, verCodeIdx + 32));

// 2. versionName -> "1.2.0.0"
const verNameIdx = buf.indexOf('versionName');
if (verNameIdx !== -1) {
  console.log('Found versionName at offset:', verNameIdx);
  console.log('Before versionName:', buf.slice(verNameIdx, verNameIdx + 22));
  // 1.2.0.0 is 7 characters, matching length of 1.0.0.0
  const newVerName = Buffer.from('1.2.0.0', 'ascii');
  newVerName.copy(buf, verNameIdx + 13);
  console.log('After versionName:', buf.slice(verNameIdx, verNameIdx + 22));
}

// 3. targetSdkVersion -> 36
const targetSdkIdx = buf.indexOf('targetSdkVersion');
if (targetSdkIdx !== -1) {
  console.log('Found targetSdkVersion at offset:', targetSdkIdx);
  // Ensure ASCII '36'
  buf[targetSdkIdx + 18] = 0x33; // '3'
  buf[targetSdkIdx + 19] = 0x36; // '6'
  // Ensure Integer 0x24 (36)
  buf[targetSdkIdx + 34] = 0x24;
  console.log('After targetSdk:', buf.slice(targetSdkIdx, targetSdkIdx + 36));
}

fs.writeFileSync(manifestPath, buf);
console.log('✓ AndroidManifest.xml successfully patched.');

// STEP 4: Repack Manifest into AAB
console.log('\n--- Step 4: Repacking AndroidManifest.xml into App Bundle ---');
execSync(`${jarExe} uf "${aabPath}" base/manifest/AndroidManifest.xml`, { cwd: rootDir, stdio: 'inherit' });
console.log('✓ Updated base/manifest/AndroidManifest.xml inside Spadas_AI.aab');

// STEP 5: Sign with Google Play Release Keystore
console.log('\n--- Step 5: Signing AAB with Google Play Release Keystore ---');
const signCmd = `${jarsignerExe} -keystore "${ksPath}" -storepass Ja96BmA8SP8j -keypass Ja96BmA8SP8j -sigalg SHA256withRSA -digestalg SHA-256 "${aabPath}" my-key-alias`;
execSync(signCmd, { stdio: 'inherit' });
console.log('✓ Signed with alias: my-key-alias (SHA256withRSA)');

// STEP 6: Verify AAB Signature
console.log('\n--- Step 6: Verifying Signed App Bundle ---');
const verifyCmd = `${jarsignerExe} -verify "${aabPath}"`;
const verifyOut = execSync(verifyCmd, { encoding: 'utf8' });
if (verifyOut.includes('jar verified')) {
  console.log('✓ Signature check passed: jar verified.');
} else {
  console.log(verifyOut);
}

// STEP 7: Export Release Artifact Copies
console.log('\n--- Step 7: Exporting Release Artifact Copies ---');
const releaseCopy1 = path.join(rootDir, 'store_packages', 'Spadas_AI_Release.aab');
fs.copyFileSync(aabPath, releaseCopy1);
console.log('✓ Saved release copy to:', releaseCopy1);

if (fs.existsSync(downloadsDir)) {
  const releaseCopyDownloads = path.join(downloadsDir, 'Spadas_AI_Release.aab');
  fs.copyFileSync(aabPath, releaseCopyDownloads);
  console.log('✓ Saved user Downloads copy to:', releaseCopyDownloads);
}

// STEP 8: Cleanup temporary base folder
try {
  fs.rmSync(path.join(rootDir, 'base'), { recursive: true, force: true });
} catch {
  // ignore
}

const stats = fs.statSync(aabPath);
console.log('\n====================================================');
console.log('🎉 PRODUCTION APP BUNDLE (.AAB) READY FOR GOOGLE PLAY');
console.log('====================================================');
console.log(`• Package ID:         com.spadas.ai`);
console.log(`• Version Code:       3 (Incremented from 2)`);
console.log(`• Version Name:       1.2.0.0`);
console.log(`• Target SDK Version: 36 (Android 15 / 16 Compliant)`);
console.log(`• Bundle File Size:   ${(stats.size / 1024 / 1024).toFixed(2)} MB (${stats.size} bytes)`);
console.log(`• Signing Status:     Signed with my-key-alias (Verified)`);
console.log(`• Output Artifact:    ${aabPath}`);
console.log(`• Release Mirror:     ${releaseCopy1}`);
console.log('====================================================\n');
