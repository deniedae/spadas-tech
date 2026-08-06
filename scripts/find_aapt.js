const fs = require('fs');
const path = require('path');

function findAapt(dir, depth = 0) {
  if (depth > 5) return null;
  try {
    const files = fs.readdirSync(dir);
    for (const f of files) {
      const full = path.join(dir, f);
      if (f.toLowerCase() === 'aapt.exe' || f.toLowerCase() === 'aapt2.exe') return full;
      try {
        if (fs.statSync(full).isDirectory()) {
          const res = findAapt(full, depth + 1);
          if (res) return res;
        }
      } catch (e) {}
    }
  } catch (e) {}
  return null;
}

console.log('Searching for aapt/aapt2 executable...');
const found = findAapt('C:\\Users\\denie');
console.log('Found aapt at:', found);
