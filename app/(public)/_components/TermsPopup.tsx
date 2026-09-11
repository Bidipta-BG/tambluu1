"use client";

import { useState } from "react";

export default function TermsPopup({ 
  gameStatus,
  announcementText,
}: { 
  gameStatus?: string;
  announcementText?: string | null;
}) {
  const [phase, setPhase] = useState<"terms" | "announcement" | "done">("terms");

  if (phase === "done") return null;

  const handleAccept = () => {
    // Transition immediately to hide the first popup
    setPhase("done");

    // Audio logic (plays after closing terms)
    if (gameStatus === "scheduled") {
      const audio = new Audio("/sounds/tickets_live.MP3");
      audio.play().catch(() => {});
    } else if (gameStatus === "completed" || !gameStatus) {
      setTimeout(() => {
        const audio = new Audio("/sounds/game_completed.MP3");
        audio.play().catch(() => {});
      }, 2000);
    }

    // Schedule the announcement banner after 3 seconds
    setTimeout(() => {
      setPhase("announcement");
    }, 3000);
  };

  const handleCloseAnnouncement = () => {
    setPhase("done");
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div 
        className="max-w-3xl w-full p-8 md:p-14 rounded-md text-center shadow-[0_0_50px_rgba(255,100,0,0.3)] relative overflow-hidden"
        style={{ backgroundColor: "#f6851f" }}
      >
        <h2 className="text-3xl md:text-5xl font-bold text-black mb-8 font-serif" style={{ letterSpacing: "2px" }}>
          !! ANNOUNCEMENT !!
        </h2>
        
        {phase === "announcement" ? (
          <div className="space-y-6 text-black font-bold text-xl md:text-3xl font-serif leading-relaxed mb-10">
            <p>{announcementText || "Good luck, have fun!"}</p>
          </div>
        ) : phase === "terms" && gameStatus === "scheduled" ? (
          <div className="space-y-6 text-black font-bold text-xl md:text-3xl font-serif leading-relaxed mb-10">
            <p className="text-3xl md:text-4xl">🎉 TICKETS ARE LIVE! 🎉</p>
            <p>You can now book your tickets for the upcoming game.</p>
            <p className="text-lg md:text-xl font-normal mt-4">Hurry, grab your lucky numbers before they sell out!</p>
          </div>
        ) : (
          <div className="space-y-3 text-black font-bold text-lg md:text-2xl font-serif leading-relaxed mb-10">
            <p>Tambola is legal game in india and fall under skill base game.</p>
            <p>Incase if system failure during the game there will be re-game.</p>
            <p>In case of re-game ticket can not be cancelled.</p>
            <p>
              This website is getttambola.in certified and its a legit website.<br />
              Check legitimacy by clicking <a href="https://gettambola.in/" target="_blank" rel="noreferrer" className="text-white hover:underline drop-shadow-md">here</a>
            </p>
          </div>
        )}

        <div>
          {phase === "announcement" ? (
            <button
              onClick={handleCloseAnnouncement}
              className="bg-[#ff0000] hover:bg-red-700 text-white font-bold text-2xl md:text-3xl px-12 py-3 rounded-[1.5rem] transition-transform hover:scale-105 shadow-xl"
            >
              Close
            </button>
          ) : (
            <button
              onClick={handleAccept}
              className="bg-[#ff0000] hover:bg-red-700 text-white font-bold text-2xl md:text-3xl px-12 py-3 rounded-[1.5rem] transition-transform hover:scale-105 shadow-xl"
            >
              I ACCEPT
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
