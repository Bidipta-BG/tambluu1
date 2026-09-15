const fs = require('fs');
const path = require('path');

const themesDir = path.join(__dirname, '../app/(public)/_components/themes');
const sourceFile = path.join(themesDir, 'ColorSplashDashboard.tsx');

try {
  // Read the source content
  let content = fs.readFileSync(sourceFile, 'utf-8');

  const themesToUpdate = [
    'Festival',
    'Neon',
    'Northeast',
    'Royal'
  ];

  themesToUpdate.forEach(themeName => {
    // Replace the component name (e.g., ColorSplashDashboard -> FestivalDashboard)
    // We replace ColorSplashDashboard with the new name in the text.
    let newContent = content.replace(/ColorSplashDashboard/g, `${themeName}Dashboard`);
    
    // Write to the new file
    const targetFile = path.join(themesDir, `${themeName}Dashboard.tsx`);
    fs.writeFileSync(targetFile, newContent, 'utf-8');
    console.log(`Successfully updated ${themeName}Dashboard.tsx`);
  });

  console.log('All themes have been updated to match ColorSplashDashboard!');
} catch (error) {
  console.error('Error copying themes:', error);
}
