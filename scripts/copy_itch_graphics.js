const fs = require('fs');
const path = require('path');

const bannerSrc = `C:\\Users\\denie\\.gemini\\antigravity\\brain\\bae3bd27-196a-4da8-bdfc-0581ba33ac3c\\itch_banner_1786009286723.jpg`;
const bgSrc = `C:\\Users\\denie\\.gemini\\antigravity\\brain\\bae3bd27-196a-4da8-bdfc-0581ba33ac3c\\itch_bg_1786009306618.jpg`;

const publicDir = path.join(__dirname, '..', 'public');

const bannerDest = path.join(publicDir, 'itch-banner.png');
const bgDest = path.join(publicDir, 'itch-bg.png');

fs.copyFileSync(bannerSrc, bannerDest);
fs.copyFileSync(bgSrc, bgDest);

console.log('Copied Banner to:', bannerDest);
console.log('Copied Background to:', bgDest);
