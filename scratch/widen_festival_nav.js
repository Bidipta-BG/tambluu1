const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '../app/(public)/_components/themes/FestivalDashboard.tsx');

try {
  let content = fs.readFileSync(targetFile, 'utf-8');

  // Double the gap between the nav buttons
  // From: gap-3 sm:gap-8 -> To: gap-6 sm:gap-16
  content = content.replace('gap-3 sm:gap-8 pt-4 pb-4 w-full', 'gap-6 sm:gap-16 pt-4 pb-4 w-full');

  fs.writeFileSync(targetFile, content, 'utf-8');
  console.log('Successfully doubled the gap between nav icons!');
} catch (error) {
  console.error('Error:', error);
}
