const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '../app/(public)/_components/themes/FestivalDashboard.tsx');

try {
  let content = fs.readFileSync(targetFile, 'utf-8');

  const oldButton = `{/* CHECK AVAILABLE TICKET — Red bold heading button */}
            {!hasTimeReached && (
              <button
                onClick={() => setShowQuickBook(true)}
                className="w-full text-center pt-5 pb-2"
              >
                <span className="text-red-600 font-black text-xl sm:text-2xl uppercase tracking-wide">
                  CHECK AVAILABLE TICKET
                </span>
              </button>
            )}`;

  const newButton = `{/* CHECK AVAILABLE TICKET — Red bold heading button */}
            {!hasTimeReached && (
              <div className="w-full px-2 sm:px-4 py-2 my-2">
                <button
                  onClick={() => setShowQuickBook(true)}
                  className="w-full text-center py-4 sm:py-5 bg-[#8e0b8e] hover:bg-[#7a007a] rounded-xl shadow-[0_4px_15px_rgba(0,0,0,0.5)] active:scale-[0.98] transition-all"
                >
                  <span className="text-white font-semibold sm:font-bold text-xl sm:text-2xl uppercase tracking-wide drop-shadow-md">
                    CHECK AVAILABLE TICKET
                  </span>
                </button>
              </div>
            )}`;

  if (content.includes('text-red-600 font-black text-xl sm:text-2xl uppercase tracking-wide')) {
    content = content.replace(oldButton, newButton);
    fs.writeFileSync(targetFile, content, 'utf-8');
    console.log('Successfully updated CHECK AVAILABLE TICKET button!');
  } else {
    console.log('Could not find the exact button code to replace.');
  }

} catch (error) {
  console.error('Error:', error);
}
