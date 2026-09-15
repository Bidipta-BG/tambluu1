const fs = require('fs');
const path = require('path');

const themesDir = path.join(__dirname, '../app/(public)/_components/themes');
const sourceFile = path.join(themesDir, 'ColorSplashDashboard.tsx');
const targetFile = path.join(themesDir, 'FestivalDashboard.tsx');

try {
  let content = fs.readFileSync(sourceFile, 'utf-8');

  // 1. Rename Component
  content = content.replace(/ColorSplashDashboard/g, 'FestivalDashboard');

  // 2. Change Header Image
  content = content.replace('/images/color_splash_header.png', '/images/festival_header.png');

  // 3. Move heading to the right and reduce font size
  content = content.replace(
    'className="absolute top-[22%] sm:top-[25%] left-0 right-0 flex flex-col items-center justify-center pointer-events-none"',
    'className="absolute top-[22%] sm:top-[25%] left-0 right-2 sm:right-12 flex flex-col items-end justify-center pointer-events-none"'
  );
  content = content.replace(
    'className="text-white font-bold text-[17px] sm:font-black sm:text-4xl md:text-5xl uppercase tracking-widest drop-shadow-xl" style={{ textShadow: \'2px 2px 4px rgba(0,0,0,0.8)\' }}',
    'className="text-white font-bold text-[15px] sm:font-black sm:text-3xl md:text-4xl uppercase tracking-widest drop-shadow-xl" style={{ textShadow: \'2px 2px 4px rgba(0,0,0,0.8)\' }}'
  );

  // 4. Add the festival_bg.png immediately after the header section
  // The header section ends at:
  //         )}
  //       </div>
  //       <div className="max-w-6xl mx-auto px-1 sm:px-6 pt-1 pb-2 space-y-2 sm:space-y-4">
  
  const headerEndString = `        )}
      </div>

      <div className="max-w-6xl mx-auto px-1 sm:px-6 pt-1 pb-2 space-y-2 sm:space-y-4">`;

  const newHeaderEndString = `        )}
      </div>
      
      {/* Background Image injected right after Header */}
      <div className="w-full">
        <img src="/images/festival_bg.png" alt="Festival Background" className="w-full object-cover" />
      </div>

      <div className="max-w-6xl mx-auto px-1 sm:px-6 pt-1 pb-2 space-y-2 sm:space-y-4">`;

  content = content.replace(headerEndString, newHeaderEndString);

  fs.writeFileSync(targetFile, content, 'utf-8');
  console.log('Successfully repaired and updated FestivalDashboard.tsx!');
} catch (error) {
  console.error('Error repairing FestivalDashboard:', error);
}
