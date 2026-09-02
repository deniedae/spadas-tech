const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const jarExe = '"C:\\Program Files\\Eclipse Adoptium\\jdk-17.0.20.101-hotspot\\bin\\jar.exe"';
const jarsignerExe = '"C:\\Program Files\\Eclipse Adoptium\\jdk-17.0.20.101-hotspot\\bin\\jarsigner.exe"';

const rootDir = path.resolve(__dirname, '..');
const kitDir = path.join(rootDir, 'store_packages', 'google_play_kit');
const aabPath = path.join(kitDir, 'Spadas_AI.aab');
const ksPath = path.join(kitDir, 'signing.keystore');

console.log('=== Step 1: Extracting Manifest from AAB ===');
execSync(`${jarExe} xf "${aabPath}" base/manifest/AndroidManifest.xml`, { cwd: rootDir, stdio: 'inherit' });

console.log('=== Step 2: Patching targetSdkVersion (35 -> 36) and versionCode (1 -> 2) ===');
const manifestPath = path.join(rootDir, 'base', 'manifest', 'AndroidManifest.xml');
let buf = fs.readFileSync(manifestPath);

// 1. targetSdkVersion
const targetSdkIdx = buf.indexOf('targetSdkVersion');
console.log('targetSdkVersion at offset:', targetSdkIdx);
console.log('Before targetSdk:', buf.slice(targetSdkIdx, targetSdkIdx + 36));

if (buf[targetSdkIdx + 18] === 0x33 && buf[targetSdkIdx + 19] === 0x35) {
  buf[targetSdkIdx + 19] = 0x36; // change ASCII '35' -> '36'
}
if (buf[targetSdkIdx + 34] === 0x23) {
  buf[targetSdkIdx + 34] = 0x24; // change integer 0x23 (35) -> 0x24 (36)
}
console.log('After targetSdk:', buf.slice(targetSdkIdx, targetSdkIdx + 36));

// 2. versionCode
const verCodeIdx = buf.indexOf('versionCode');
console.log('versionCode at offset:', verCodeIdx);
console.log('Before versionCode:', buf.slice(verCodeIdx, verCodeIdx + 30));
if (buf[verCodeIdx + 13] === 0x31) {
  buf[verCodeIdx + 13] = 0x32; // change ASCII '1' -> '2'
}
if (buf[verCodeIdx + 28] === 0x01) {
  buf[verCodeIdx + 28] = 0x02; // change integer 1 -> 2
}
console.log('After versionCode:', buf.slice(verCodeIdx, verCodeIdx + 30));

fs.writeFileSync(manifestPath, buf);

console.log('=== Step 3: Updating Manifest inside AAB ===');
execSync(`${jarExe} uf "${aabPath}" base/manifest/AndroidManifest.xml`, { cwd: rootDir, stdio: 'inherit' });

console.log('=== Step 4: Re-signing AAB with release keystore ===');
const signCmd = `${jarsignerExe} -keystore "${ksPath}" -storepass Ja96BmA8SP8j -keypass Ja96BmA8SP8j -sigalg SHA256withRSA -digestalg SHA-256 "${aabPath}" my-key-alias`;
execSync(signCmd, { stdio: 'inherit' });

console.log('=== Step 5: Verifying Signed AAB ===');
const verifyCmd = `${jarsignerExe} -verify "${aabPath}"`;
const verifyOut = execSync(verifyCmd, { encoding: 'utf8' });
console.log(verifyOut);

console.log('\n🎉 SUCCESS: Spadas_AI.aab is now targetSdkVersion 36, versionCode 2, and signed with your release key!');
