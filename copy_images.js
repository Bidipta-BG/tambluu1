const fs = require('fs');
const path = require('path');

const images = [
  { src: "C:\\Users\\bidip\\.gemini\\antigravity\\brain\\efc579e8-42a4-48fc-907b-f9332e35e555\\golden_trophy_1786882525486.jpg", dest: "trophy.jpg" },
  { src: "C:\\Users\\bidip\\.gemini\\antigravity\\brain\\efc579e8-42a4-48fc-907b-f9332e35e555\\gold_medal_1786882565011.jpg", dest: "gold_medal.jpg" },
  { src: "C:\\Users\\bidip\\.gemini\\antigravity\\brain\\efc579e8-42a4-48fc-907b-f9332e35e555\\silver_medal_1786882582451.jpg", dest: "silver_medal.jpg" },
  { src: "C:\\Users\\bidip\\.gemini\\antigravity\\brain\\efc579e8-42a4-48fc-907b-f9332e35e555\\bronze_medal_1786882924566.jpg", dest: "bronze_medal.jpg" },
  { src: "C:\\Users\\bidip\\.gemini\\antigravity\\brain\\efc579e8-42a4-48fc-907b-f9332e35e555\\diya_fireworks_1786883176400.jpg", dest: "diya_fireworks.jpg" }
];

const publicImagesDir = path.join(__dirname, 'public', 'images');
if (!fs.existsSync(publicImagesDir)) {
  fs.mkdirSync(publicImagesDir, { recursive: true });
}

images.forEach(img => {
  fs.copyFileSync(img.src, path.join(publicImagesDir, img.dest));
  console.log(`Copied ${img.dest}`);
});
