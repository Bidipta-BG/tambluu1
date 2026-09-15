const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '../app/(public)/_components/themes/FestivalDashboard.tsx');

try {
  let content = fs.readFileSync(targetFile, 'utf-8');

  // We want to replace everything from:
  // {/* NAV BUTTONS — Whatsapp / Telegram / Agent list / Call / Login */}
  // to the closing </div> right before:
  // {/* CHECK AVAILABLE TICKET — Red bold heading button */}

  const startMarker = '{/* NAV BUTTONS — Whatsapp / Telegram / Agent list / Call / Login */}';
  const endMarker = '{/* CHECK AVAILABLE TICKET — Red bold heading button */}';
  
  const startIndex = content.indexOf(startMarker);
  const endIndex = content.indexOf(endMarker);

  if (startIndex === -1 || endIndex === -1) {
    throw new Error('Could not find markers');
  }

  const replacement = `${startMarker}
        <div className="flex justify-center items-center gap-4 sm:gap-8 pt-4 pb-4 w-full">
          {/* Call */}
          <a href={\`tel:\${tenant.whatsappNumber || tenant.ownerPhone || ''}\`} className="shrink-0 transition-transform hover:scale-105 active:scale-95">
            <img src="/images/festiv_call.png" alt="Call" className="w-[45px] h-[45px] sm:w-[60px] sm:h-[60px] drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]" />
          </a>
          
          {/* Whatsapp */}
          {(tenant.whatsappActive ?? true) && (
            <a href={buildWhatsAppUrl(tenant.whatsappNumber || tenant.ownerPhone || '', 'Hi, I want to inquire about the Tambola game.')} target="_blank" rel="noopener noreferrer" className="shrink-0 transition-transform hover:scale-105 active:scale-95">
              <img src="/images/festiv_wp.png" alt="WhatsApp" className="w-[45px] h-[45px] sm:w-[60px] sm:h-[60px] drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]" />
            </a>
          )}

          {/* Telegram (Text fallback if active since no icon was provided) */}
          {tenant.telegramActive === true && tenant.telegramLink && (
            <a href={tenant.telegramLink.startsWith('http') ? tenant.telegramLink : \`https://\${tenant.telegramLink}\`} target="_blank" rel="noopener noreferrer" className="shrink-0 transition-transform hover:scale-105 active:scale-95 flex items-center justify-center w-[45px] h-[45px] sm:w-[60px] sm:h-[60px] bg-[#27A5E7] rounded-full drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] text-white font-bold text-[10px] sm:text-xs text-center leading-tight">
              Telegram
            </a>
          )}

          {/* Agent list */}
          <div className="relative shrink-0">
            <button onClick={() => setShowAgentsMenu(!showAgentsMenu)} className="transition-transform hover:scale-105 active:scale-95 block">
              <img src="/images/festiv_agent.png" alt="Agent List" className="w-[45px] h-[45px] sm:w-[60px] sm:h-[60px] drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]" />
            </button>
            {showAgentsMenu && (
              <>
                <div className="fixed inset-0 z-40 bg-black/60" onClick={() => setShowAgentsMenu(false)} />
                <div className="fixed top-12 left-4 right-4 sm:max-w-md sm:mx-auto bg-[#0000ed] border border-white/20 rounded shadow-2xl p-3 z-50 flex flex-col gap-3 animate-in fade-in slide-in-from-top-10 duration-200 min-h-[40vh]">
                  <div className="flex justify-end">
                    <button onClick={() => setShowAgentsMenu(false)} className="text-white font-bold text-xl leading-none hover:text-gray-300">X</button>
                  </div>
                  <div className="flex flex-col gap-2 overflow-y-auto max-h-[60vh]">
                    {agents && agents.length > 0 ? (
                      agents.map(agent => (
                        <div key={agent.id} className="w-full border border-[#f5c518] rounded bg-[#0000ed] text-white font-bold py-2.5 text-center text-sm">
                          {agent.name}
                        </div>
                      ))
                    ) : (
                      <div className="w-full border border-[#f5c518] rounded bg-[#0000ed] text-white font-bold py-2.5 text-center text-sm">
                        No agents assigned
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Login */}
          <div className="relative shrink-0">
            <button onClick={() => setShowProfileMenu(!showProfileMenu)} className="transition-transform hover:scale-105 active:scale-95 block">
              <img src="/images/festiv_login.png" alt="Login" className="w-[45px] h-[45px] sm:w-[60px] sm:h-[60px] drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]" />
            </button>
            {showProfileMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
                <div className="absolute top-full right-0 mt-2 w-40 bg-[#0000ed] rounded shadow-xl p-2.5 z-50 flex flex-col gap-1.5 animate-in fade-in zoom-in-95 duration-200">
                  <div className="text-white font-bold text-base text-center leading-tight mb-1">
                    Select login<br/>type
                  </div>
                  <a href="/admin" target="_blank" rel="noopener noreferrer" onClick={() => setShowProfileMenu(false)} className="w-full bg-[#f0f0f0] text-[#111] text-center font-medium py-1.5 text-sm hover:bg-gray-200">
                    Login as admin
                  </a>
                  <a href="/agent" target="_blank" rel="noopener noreferrer" onClick={() => setShowProfileMenu(false)} className="w-full bg-[#f0f0f0] text-[#111] text-center font-medium py-1.5 text-sm hover:bg-gray-200">
                    Login as agent
                  </a>
                  <button onClick={() => setShowProfileMenu(false)} className="text-white font-bold text-center text-sm mt-1 hover:text-gray-200">
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

            `;

  const newContent = content.substring(0, startIndex) + replacement + content.substring(endIndex);

  fs.writeFileSync(targetFile, newContent, 'utf-8');
  console.log('Successfully updated nav buttons to use circle icons!');
} catch (error) {
  console.error('Error:', error);
}
