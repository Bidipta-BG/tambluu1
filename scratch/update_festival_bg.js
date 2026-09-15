const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../app/(public)/_components/themes/FestivalDashboard.tsx');

try {
  let content = fs.readFileSync(filePath, 'utf-8');

  // Replace the outer div wrapper to include the background image style
  content = content.replace(
    'className="w-full min-h-screen bg-[#0a0a1a] font-sans text-white pb-20 overflow-x-hidden"',
    'className="w-full min-h-screen font-sans text-white pb-20 overflow-x-hidden"\n      style={{ backgroundImage: "url(\'/images/festival_bg.png\')", backgroundSize: "cover", backgroundAttachment: "fixed", backgroundPosition: "center" }}'
  );

  // Replace all other instances of bg-[#0a0a1a] with bg-transparent so the wallpaper shows through
  content = content.replace(/bg-\[#0a0a1a\]/g, 'bg-transparent');

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log('Successfully updated FestivalDashboard with the new wallpaper!');
} catch (error) {
  console.error('Error:', error);
}
