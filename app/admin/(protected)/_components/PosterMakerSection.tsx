"use client";

import { useRef, useState } from "react";
import { toJpeg } from "html-to-image";
import type { Tenant, Game, Dividend } from "@/types";
import { PosterTemplate } from "./PosterTemplate";

interface PosterMakerSectionProps {
  tenant: Tenant;
  game: Game | null;
  dividends: Dividend[];
}

export default function PosterMakerSection({ tenant, game, dividends }: PosterMakerSectionProps) {
  const posterRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!posterRef.current) return;
    
    setIsGenerating(true);
    
    try {
      // We give it a generous 1.5s delay to ensure fonts/images are fully rendered in the DOM
      // to completely prevent any race conditions with html-to-image
      await new Promise(resolve => setTimeout(resolve, 1500));

      const dataUrl = await toJpeg(posterRef.current, {
        quality: 0.95,
        cacheBust: true,
        // The poster is exactly 1200x1600 as defined in inline styles
        width: 1200,
        height: 1600,
      });

      // Trigger download
      const link = document.createElement("a");
      link.download = `${tenant.businessName.replace(/\s+/g, "_")}_Poster.jpg`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Failed to generate poster:", err);
      alert("Failed to generate poster. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center">
      <h2 className="text-xl font-bold text-white mb-2">Poster Maker</h2>
      <p className="text-sm text-slate-400 mb-6">
        Generate and download a beautiful promotional poster to share on WhatsApp and Social Media.
      </p>
      
      <div className="py-8 bg-slate-800/50 rounded-lg border border-slate-700/50 inline-block px-12">
        <span className="text-5xl mb-6 block">🎨</span>
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-violet-500/30 transition hover:bg-violet-500 hover:shadow-violet-500/50 hover:-translate-y-0.5 disabled:opacity-50 disabled:pointer-events-none"
        >
          {isGenerating ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating...
            </>
          ) : (
            <>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Generate Poster
            </>
          )}
        </button>
      </div>

      {/* Hidden off-screen wrapper for the poster template */}
      <div 
        style={{ 
          position: "absolute", 
          top: "-9999px", 
          left: "-9999px",
          pointerEvents: "none",
          opacity: 0, 
        }}
      >
        <PosterTemplate ref={posterRef} tenant={tenant} game={game} dividends={dividends} />
      </div>
    </div>
  );
}
