const fs = require('fs');
const path = require('path');

const src = `C:\\Users\\denie\\.gemini\\antigravity\\brain\\bae3bd27-196a-4da8-bdfc-0581ba33ac3c\\itch_cover_1786009944442.jpg`;
const dest = path.join(__dirname, '..', 'public', 'itch-cover.png');

fs.copyFileSync(src, dest);
console.log('Copied Cover Image to:', dest);
