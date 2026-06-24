const fs = require('fs');
const src = '/home/abcd0x0/.gemini/antigravity/brain/5eb632eb-619f-4062-b9ee-c9d2bce57256/movie_collage_hero_1782323935824.png';
const destDir = '/home/abcd0x0/movie-suggestion/frontend/src/assets';
const dest = `${destDir}/hero.png`;

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}
fs.copyFileSync(src, dest);
console.log('Image copied!');
