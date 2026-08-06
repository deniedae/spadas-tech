const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const jarPath = path.join(__dirname, 'uber-apk-signer.jar');
const targetApk = path.join(__dirname, '..', 'public', 'spadas-ai.apk');

console.log('Force signing APK with v1/v2/v3 release signature...');
try {
  const javaExe = '"C:\\Program Files\\Java\\jre1.8.0_491\\bin\\java.exe"';
  const cmd = `${javaExe} -jar "${jarPath}" --apks "${targetApk}" --forceSign --overwrite`;
  console.log('Running command:', cmd);
  const out = execSync(cmd, { encoding: 'utf8' });
  console.log('Signer Output:\n', out);
  console.log('✓ APK force-signed and aligned successfully!');
} catch (e) {
  console.error('Signing error:', e.stdout || e.message);
}
