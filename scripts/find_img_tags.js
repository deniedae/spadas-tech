const fs = require('fs');
const path = require('path');

function walk(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (!file.startsWith('.')) walk(filePath, fileList);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const allFiles = walk('C:\\Users\\denie\\spadas-tech\\src');

console.log('--- Searching for <img> tags ---');
for (const file of allFiles) {
  const content = fs.readFileSync(file, 'utf8');
  if (/<img\b[^>]*>/i.test(content)) {
    console.log('Img found in:', path.relative('C:\\Users\\denie\\spadas-tech', file));
  }
}
