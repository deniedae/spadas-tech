const fs = require('fs');
const path = require('path');

const downloadsDir = path.join(process.env.USERPROFILE || 'C:\\Users\\denie', 'Downloads');
console.log('Searching for APK files in:', downloadsDir);

function findApkFiles(dir, depth = 0) {
  if (depth > 2) return;
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          findApkFiles(fullPath, depth + 1);
        } else if (file.endsWith('.apk') || file.endsWith('.aab')) {
          console.log('Found:', fullPath, 'Size:', stat.size, 'bytes');
          // Copy to public/spadas-ai.apk if valid
          if (file.endsWith('.apk') && stat.size > 100000) {
            const dest = path.join(__dirname, '..', 'public', 'spadas-ai.apk');
            fs.copyFileSync(fullPath, dest);
            console.log('Successfully copied to public/spadas-ai.apk!');
          }
        }
      } catch (e) {}
    }
  } catch (e) {}
}

findApkFiles(downloadsDir);
