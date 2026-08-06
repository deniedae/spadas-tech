const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const jarPath = path.join(__dirname, 'uber-apk-signer.jar');
const targetApk = path.join(__dirname, '..', 'public', 'spadas-ai.apk');

console.log('Inspecting APK manifest...');
try {
  const javaExe = '"C:\\Program Files\\Java\\jre1.8.0_491\\bin\\java.exe"';
  const cmd = `${javaExe} -jar "${jarPath}" --apks "${targetApk}" --verbose -y`;
  const out = execSync(cmd, { encoding: 'utf8' });
  console.log(out);
} catch (e) {
  console.log(e.stdout || e.message);
}
