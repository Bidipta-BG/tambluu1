const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '../app/(public)/_components/themes/FestivalDashboard.tsx');

try {
  let content = fs.readFileSync(targetFile, 'utf-8');

  // 1. Fix the image extension! The file in the folder is actually .jpg, not .png
  content = content.replace("url('/images/festival_bg.png')", "url('/images/festival_bg.jpg')");

  // 2. Just to be absolutely certain, remove any remaining dark backgrounds
  content = content.replace(/bg-\[#1a1a1a\]/g, 'bg-black/40');
  content = content.replace(/bg-\[#0a0a1a\]/g, 'bg-transparent');
  content = content.replace(/bg-\[#2a2a2a\]/g, 'bg-black/50');
  content = content.replace(/hover:bg-\[#2a2a2a\]/g, 'hover:bg-black/60');

  fs.writeFileSync(targetFile, content, 'utf-8');
  console.log('Successfully fixed the wallpaper extension and removed dark boxes!');
} catch (error) {
  console.error('Error:', error);
}
