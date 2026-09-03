"use client";

import { useState, useEffect } from "react";

export default function TermsPopup({ gameStatus }: { gameStatus?: string }) {
  const [show, setShow] = useState(true);

  if (!show) return null;

  const handleAccept = () => {
    setShow(false);
    
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    let textToSpeak = "";
    let delayMs = 0;
    
    if (gameStatus === "scheduled") {
      textToSpeak = "Game is going to start at given date and time. So players, please book your tickets";
      delayMs = 0; // Immediate
    } else if (gameStatus === "completed" || !gameStatus) {
      textToSpeak = "Please wait until the next game is scheduled.";
      delayMs = 12000; // 12 seconds delay
    }

    if (textToSpeak) {
      // 1. Synchronous "unlock" to ensure mobile browsers (like iOS Safari) 
      // allow speech inside the async setTimeout later.
      const unlock = new SpeechSynthesisUtterance("");
      unlock.volume = 0;
      window.speechSynthesis.speak(unlock);

      // 2. Play the actual announcement after the requested delay
      setTimeout(() => {
        window.speechSynthesis.cancel(); // Clear the unlock or any other speech
        
        const announcement = new SpeechSynthesisUtterance(textToSpeak);
        
        // Try to find a female voice
        const voices = window.speechSynthesis.getVoices();
        const femaleVoice = voices.find(v => 
          v.name.includes("Female") || 
          v.name.includes("Zira") ||
          v.name.includes("Samantha") ||
          v.name.includes("Victoria") ||
          v.name.includes("Karen") ||
          v.name.includes("Siri") ||
          v.name.includes("Google UK English Female")
        );

        if (femaleVoice) {
          announcement.voice = femaleVoice;
        }

        announcement.rate = 0.95;
        announcement.pitch = 1.1; 
        
        window.speechSynthesis.speak(announcement);
      }, delayMs);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div 
        className="max-w-3xl w-full p-8 md:p-14 rounded-md text-center shadow-[0_0_50px_rgba(255,100,0,0.3)] relative overflow-hidden"
        style={{ backgroundColor: "#f6851f" }} // Solid orange matching the image
      >
        <h2 className="text-3xl md:text-5xl font-bold text-black mb-8 font-serif" style={{ letterSpacing: "2px" }}>
          !! ANNOUNCEMENT !!
        </h2>
        
        {gameStatus === "scheduled" ? (
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
          <button
            onClick={handleAccept}
            className="bg-[#ff0000] hover:bg-red-700 text-white font-bold text-2xl md:text-3xl px-12 py-3 rounded-[1.5rem] transition-transform hover:scale-105 shadow-xl"
          >
            I ACCEPT
          </button>
        </div>
      </div>
    </div>
  );
}
