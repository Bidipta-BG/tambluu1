const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '../app/(public)/_components/themes/FestivalDashboard.tsx');

try {
  let content = fs.readFileSync(targetFile, 'utf-8');

  // Fix the image extension from .png to .jpg
  content = content.replace("url('/images/festival_bg.png')", "url('/images/festival_bg.jpg')");

  fs.writeFileSync(targetFile, content, 'utf-8');
  console.log('Fixed the image extension! It was a .jpg all along.');
} catch (error) {
  console.error('Error:', error);
}
