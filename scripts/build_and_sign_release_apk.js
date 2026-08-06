const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const javaExe = '"C:\\Program Files\\Java\\jre1.8.0_491\\bin\\java.exe"';
const jarPath = path.join(__dirname, 'uber-apk-signer.jar');
const ksPath = path.join(__dirname, 'spadas-release.keystore');
const publicApk = path.join(__dirname, '..', 'public', 'spadas-ai.apk');
const downloadsDir = path.join(process.env.USERPROFILE || 'C:\\Users\\denie', 'Downloads');

const cleanApk = path.join(downloadsDir, 'spadas.apk');
const cleanXapk = path.join(downloadsDir, 'spadas.xapk');
const releaseApk = path.join(downloadsDir, 'Spadas AI-signed-release.apk');

console.log('=== STEP 1: ALIGNING & SIGNING APK WITH v1/v2/v3 RELEASE KEY ===');
const signCmd = `${javaExe} -jar "${jarPath}" --apks "${publicApk}" --ks "${ksPath}" --ksAlias spadas --ksPass spadas1234 --ksKeyPass spadas1234 --allowResign --overwrite --verbose`;
console.log('Running:', signCmd);
const signOut = execSync(signCmd, { encoding: 'utf8' });
console.log(signOut);

console.log('=== STEP 2: GENERATING CLEAN RELEASE COPIES ===');
fs.copyFileSync(publicApk, cleanApk);
fs.copyFileSync(publicApk, releaseApk);
console.log('✓ Copied spadas.apk to:', cleanApk);
console.log('✓ Copied Spadas AI-signed-release.apk to:', releaseApk);

console.log('=== STEP 3: GENERATING XAPK BUNDLE ===');
const xapkScript = path.join(__dirname, 'generate_xapk.js');
execSync(`node "${xapkScript}"`, { stdio: 'inherit' });

console.log('\n🎉 MASTER RELEASE APK & XAPK BUILD COMPLETED SUCCESSFULLY!');
