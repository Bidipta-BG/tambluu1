"use client";

import React, { useRef, useState } from "react";
import { toJpeg } from "html-to-image";
import type { Tenant, Game, Dividend } from "@/types";
import { PosterTemplate } from "./PosterTemplate";

interface NewPosterGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: Tenant;
  game: Game | null;
  dividends: Dividend[];
}

export function NewPosterGalleryModal({ isOpen, onClose, tenant, game, dividends }: NewPosterGalleryModalProps) {
  const posterRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Add your new poster images to this array as you upload them to the public folder
  const posterBackgrounds = [
    "/poster-bg-1.jpg",
    "/poster-bg-2.jpg",
    "/poster-bg-3.jpg",
    "/poster-bg-4.jpg",
  ];

  const handleGenerate = async (bgImage: string) => {
    setSelectedImage(bgImage);
    setIsGenerating(true);
    
    try {
      // Wait a moment for React to render the PosterTemplate with the new bgImage
      // and for the image to load in the DOM.
      await new Promise(resolve => setTimeout(resolve, 1500));

      if (!posterRef.current) throw new Error("Template ref not found");

      const dataUrl = await toJpeg(posterRef.current, {
        quality: 0.95,
        cacheBust: true,
        // The poster is exactly 1200x1600 as defined in inline styles
        width: 1200,
        height: 1600,
      });

      // Trigger download
      const link = document.createElement("a");
      link.download = `${tenant.businessName?.replace(/\s+/g, "_") || "Tambola"}_Poster.jpg`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Failed to generate poster:", err);
      alert("Failed to generate poster. Please try again.");
    } finally {
      setIsGenerating(false);
      setSelectedImage(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/90 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/10 bg-black/50">
        <h2 className="text-xl font-bold text-white uppercase tracking-wider">Select a Poster</h2>
        <button 
          onClick={onClose}
          disabled={isGenerating}
          className="text-white hover:text-red-400 p-2 rounded-full transition-colors disabled:opacity-50"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Gallery */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-w-6xl mx-auto">
          {posterBackgrounds.map((bg, idx) => (
            <div 
              key={idx} 
              className={`relative aspect-[3/4] rounded-lg overflow-hidden cursor-pointer border-2 transition-all group ${selectedImage === bg ? 'border-amber-400 scale-[1.02] shadow-[0_0_20px_rgba(251,191,36,0.4)]' : 'border-transparent hover:border-white/30 hover:scale-[1.02]'}`}
              onClick={() => !isGenerating && handleGenerate(bg)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={bg} alt={`Poster Background ${idx + 1}`} className="w-full h-full object-cover" />
              
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="bg-amber-400 text-black font-black px-4 py-2 rounded-full text-sm uppercase">Generate</span>
              </div>

              {/* Generating state overlay */}
              {selectedImage === bg && isGenerating && (
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-3 backdrop-blur-sm">
                  <svg className="animate-spin h-8 w-8 text-amber-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-white font-bold text-sm uppercase tracking-widest">Generating...</span>
                </div>
              )}
            </div>
          ))}
        </div>
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
        <PosterTemplate 
          ref={posterRef} 
          tenant={tenant} 
          game={game} 
          dividends={dividends} 
          bgImage={selectedImage || posterBackgrounds[0]} 
        />
      </div>
    </div>
  );
}
