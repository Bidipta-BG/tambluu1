"use client";

import { useState, useEffect } from "react";

export default function TermsPopup() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Check sessionStorage so it only shows once per browser session
    // (If you want it to show only once EVER per browser, use localStorage)
    const accepted = sessionStorage.getItem("tambluu_terms_accepted");
    if (!accepted) {
      setShow(true);
    }
  }, []);

  if (!show) return null;

  const handleAccept = () => {
    sessionStorage.setItem("tambluu_terms_accepted", "true");
    setShow(false);
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
        
        <div className="space-y-3 text-black font-bold text-lg md:text-2xl font-serif leading-relaxed mb-10">
          <p>Tambola is legal game in india and fall under skill base game.</p>
          <p>Incase if system failure during the game there will be re-game.</p>
          <p>In case of re-game ticket can not be cancelled.</p>
          <p>
            This website is starttambola.in certified and its a legit website.<br />
            Check legitimacy by clicking <a href="https://google.com" target="_blank" rel="noreferrer" className="text-white hover:underline drop-shadow-md">here</a>
          </p>
        </div>

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
