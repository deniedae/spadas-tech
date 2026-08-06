const fs = require('fs');
const path = require('path');

const img1Src = `C:\\Users\\denie\\.gemini\\antigravity\\brain\\bae3bd27-196a-4da8-bdfc-0581ba33ac3c\\app_screenshot_1_1786009491592.jpg`;
const img2Src = `C:\\Users\\denie\\.gemini\\antigravity\\brain\\bae3bd27-196a-4da8-bdfc-0581ba33ac3c\\app_screenshot_2_1786009515205.jpg`;
const img3Src = `C:\\Users\\denie\\.gemini\\antigravity\\brain\\bae3bd27-196a-4da8-bdfc-0581ba33ac3c\\app_screenshot_3_1786009534810.jpg`;

const publicDir = path.join(__dirname, '..', 'public');

const dest1 = path.join(publicDir, 'screenshot-lens.png');
const dest2 = path.join(publicDir, 'screenshot-dashboard.png');
const dest3 = path.join(publicDir, 'screenshot-generator.png');

fs.copyFileSync(img1Src, dest1);
fs.copyFileSync(img2Src, dest2);
fs.copyFileSync(img3Src, dest3);

console.log('Copied Screenshot 1 (Spadas Lens AR) to:', dest1);
console.log('Copied Screenshot 2 (Analytics Dashboard) to:', dest2);
console.log('Copied Screenshot 3 (AI Generator) to:', dest3);
