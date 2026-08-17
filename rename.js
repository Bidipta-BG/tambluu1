const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, 'app', '(public)', '_components', 'BookingDashboard.tsx');
const destDir = path.join(__dirname, 'app', '(public)', '_components', 'themes');
const dest = path.join(destDir, 'FestivalDashboard.tsx');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

if (fs.existsSync(src)) {
  fs.renameSync(src, dest);
  
  // Also fix the export name in the file
  let content = fs.readFileSync(dest, 'utf8');
  content = content.replace('export default function BookingDashboard', 'export default function FestivalDashboard');
  fs.writeFileSync(dest, content);
  
  console.log('Moved BookingDashboard.tsx to themes/FestivalDashboard.tsx');
} else {
  console.log('Source file not found.');
}
