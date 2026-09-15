const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '../app/(public)/_components/themes/FestivalDashboard.tsx');

try {
  let content = fs.readFileSync(targetFile, 'utf-8');

  // Replace all remaining solid dark backgrounds with semi-transparent black
  // so the wallpaper shows through beautifully
  content = content.replace(/bg-\[#1a1a1a\]/g, 'bg-black/40');
  content = content.replace(/bg-\[#0a0a1a\]/g, 'bg-transparent');
  content = content.replace(/bg-\[#2a2a2a\]/g, 'bg-black/50');

  // Also fix hover states
  content = content.replace(/hover:bg-\[#2a2a2a\]/g, 'hover:bg-black/60');

  fs.writeFileSync(targetFile, content, 'utf-8');
  console.log('Done! All dark backgrounds replaced. The wallpaper should now be visible.');
  
  // Report what was changed
  const remaining = (content.match(/bg-\[#[0-9a-fA-F]+\]/g) || []).filter(c => {
    const hex = c.replace('bg-[#', '').replace(']', '');
    const r = parseInt(hex.slice(0,2), 16);
    const g = parseInt(hex.slice(2,4), 16);
    const b = parseInt(hex.slice(4,6), 16);
    return (r + g + b) / 3 < 80; // very dark colors
  });
  if (remaining.length > 0) {
    console.log('Still dark backgrounds remaining:', [...new Set(remaining)]);
  } else {
    console.log('No more dark blocking backgrounds found!');
  }
} catch (error) {
  console.error('Error:', error);
}
