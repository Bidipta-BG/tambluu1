const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '../app/(public)/_components/themes/FestivalDashboard.tsx');

try {
  let content = fs.readFileSync(targetFile, 'utf-8');

  // Replace the mobile sizing for all 5 nav icons/buttons
  // From: w-[45px] h-[45px] -> To: w-[24px] h-[24px] (roughly half of 45)
  // The sm:w-[60px] sm:h-[60px] remains unchanged for desktop
  content = content.replace(/w-\[45px\] h-\[45px\]/g, 'w-[26px] h-[26px]');

  // Also reduce the gap slightly on mobile so they stay closer together when smaller
  content = content.replace('gap-4 sm:gap-8 pt-4 pb-4 w-full', 'gap-3 sm:gap-8 pt-4 pb-4 w-full');

  fs.writeFileSync(targetFile, content, 'utf-8');
  console.log('Successfully reduced mobile icon sizes by half!');
} catch (error) {
  console.error('Error:', error);
}
