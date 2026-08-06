const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const jarPath = path.join(__dirname, 'uber-apk-signer.jar');
const targetApk = path.join(__dirname, '..', 'public', 'spadas-ai.apk');

console.log('Verifying APK signature and manifest details...');
try {
  const javaExe = '"C:\\Program Files\\Java\\jre1.8.0_491\\bin\\java.exe"';
  const cmd = `${javaExe} -jar "${jarPath}" --apks "${targetApk}" -y --verbose`;
  const out = execSync(cmd, { encoding: 'utf8' });
  console.log('Verification Output:\n', out);
} catch (e) {
  console.log('Output:\n', e.stdout || e.message);
}
