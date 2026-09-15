const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '../app/(public)/_components/themes/FestivalDashboard.tsx');

try {
  let content = fs.readFileSync(targetFile, 'utf-8');

  // Step 1: Add the background image style to the outer wrapper
  // We look for the exact line defining the outer wrapper
  const outerWrapperSearch = 'className="w-full min-h-screen bg-[#0a0a1a] font-sans text-white pb-20 overflow-x-hidden"';
  const outerWrapperReplace = 'className="w-full min-h-screen font-sans text-white pb-20 overflow-x-hidden"\n      style={{ backgroundImage: "url(\'/images/festival_bg.png\')", backgroundSize: "cover", backgroundAttachment: "fixed", backgroundPosition: "center" }}';
  
  if (content.includes(outerWrapperSearch)) {
    content = content.replace(outerWrapperSearch, outerWrapperReplace);
  } else {
    console.log("Warning: Could not find the exact outer wrapper class string. It may have already been changed.");
  }

  // Step 2: Make all remaining inner sections transparent by replacing any leftover bg-[#0a0a1a]
  content = content.replace(/bg-\[#0a0a1a\]/g, 'bg-transparent');

  // Step 3: Remove the mistakenly added <img> tag from fix_festival.js if it exists
  const badImageTag = '{/* Background Image injected right after Header */}\n      <div className="w-full">\n        <img src="/images/festival_bg.png" alt="Festival Background" className="w-full object-cover" />\n      </div>';
  content = content.replace(badImageTag, '');

  fs.writeFileSync(targetFile, content, 'utf-8');
  console.log('Successfully applied the festival_bg.png wallpaper to FestivalDashboard!');
} catch (error) {
  console.error('Error applying wallpaper:', error);
}
