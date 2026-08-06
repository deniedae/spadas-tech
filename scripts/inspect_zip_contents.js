const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const javaExe = '"C:\\Program Files\\Java\\jre1.8.0_491\\bin\\java.exe"';
const apkPath = path.join(__dirname, '..', 'public', 'spadas-ai.apk');

try {
  // Use jar tool to list contents
  const jarExe = '"C:\\Program Files\\Java\\jre1.8.0_491\\bin\\jar.exe"';
  const out = execSync(`${jarExe} tf "${apkPath}"`, { encoding: 'utf8' });
  const files = out.split('\n').map(s => s.trim()).filter(Boolean);
  console.log('Total files in APK:', files.length);
  console.log('Sample files:\n', files.slice(0, 15));
  console.log('Contains classes.dex:', files.includes('classes.dex'));
  console.log('Contains AndroidManifest.xml:', files.includes('AndroidManifest.xml'));
  console.log('Contains META-INF/MANIFEST.MF:', files.some(f => f.startsWith('META-INF/')));
} catch (e) {
  console.error('Error:', e.message);
}
