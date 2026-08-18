import React, { forwardRef } from "react";
import type { Tenant, Game, Dividend } from "@/types";

interface PosterTemplateProps {
  tenant: Tenant;
  game: Game | null;
  dividends: Dividend[];
}

export const PosterTemplate = forwardRef<HTMLDivElement, PosterTemplateProps>(
  ({ tenant, game, dividends }, ref) => {
    // Filter active dividends (handle both `active` and `is_active` due to DB vs Type mismatch)
    const activeDividends = dividends.filter((d: any) => d.is_active === true || d.active === true);

    // Format date
    let formattedDate = "Date TBA";
    let formattedTime = "Time TBA";
    if (game?.scheduled_at) {
      const dateObj = new Date(game.scheduled_at);
      formattedDate = dateObj.toLocaleDateString("en-IN", {
        weekday: "long",
        month: "short",
        day: "numeric",
      });
      formattedTime = dateObj.toLocaleTimeString("en-IN", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    }

    // We use a fixed width and height that matches our 3:4 aspect ratio
    // High resolution (e.g. 1200x1600) for crisp text.
    return (
      <div
        ref={ref}
        style={{
          width: "1200px",
          height: "1600px",
          backgroundImage: "url('/poster-bg-1.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          position: "relative",
          fontFamily: "system-ui, -apple-system, sans-serif",
          overflow: "hidden",
        }}
        className="flex flex-col items-center justify-between py-[180px] px-[120px] text-center"
      >
        {/* --- TOP SECTION --- */}
        <div className="flex flex-col items-center mt-[120px]">
          <h1 
            style={{ textShadow: "0 4px 20px rgba(255,215,0,0.5)" }}
            className="text-7xl font-black text-amber-300 uppercase tracking-wider mb-6 leading-tight"
          >
            {tenant.businessName || "Mega Tambola"}
          </h1>
          <div className="bg-black/60 backdrop-blur-md border border-white/20 rounded-full px-8 py-3">
            <h2 className="text-4xl font-bold text-white">
              {formattedDate} • {formattedTime}
            </h2>
          </div>
        </div>

        {/* --- MIDDLE SECTION: TICKET PRICE --- */}
        <div className="flex flex-col items-center mt-8">
          <div className="bg-gradient-to-r from-pink-500 to-violet-500 rounded-full px-12 py-6 shadow-[0_0_40px_rgba(236,72,153,0.6)] border-4 border-white/20 transform hover:scale-105 transition-transform">
            <span className="text-5xl font-black text-white tracking-widest drop-shadow-md">
              🎟️ TICKET: ₹{game?.ticket_price || "50"}
            </span>
          </div>
        </div>

        {/* --- LOWER MIDDLE SECTION: PRIZES --- */}
        <div className="w-full mt-16 mb-auto flex flex-col items-center">
          <h3 className="text-4xl font-bold text-amber-200 mb-8 tracking-widest uppercase" style={{ textShadow: "0 2px 10px rgba(0,0,0,0.8)" }}>
            Win Massive Prizes!
          </h3>
          <div className="flex flex-col gap-6 w-full max-w-2xl">
            {activeDividends.slice(0, 10).map((div: any, i: number) => (
              <div key={i} className="flex justify-between items-center bg-black/60 backdrop-blur-sm border border-white/20 rounded-xl px-10 py-5">
                <span className="text-4xl font-semibold text-white tracking-wide">{div.name}</span>
                <span className="text-5xl font-black text-green-400" style={{ textShadow: "0 0 20px rgba(74,222,128,0.5)" }}>
                  ₹{div.prize_amount}
                </span>
              </div>
            ))}
          </div>
          {activeDividends.length > 10 && (
            <p className="mt-6 text-2xl text-slate-300 italic">+ and many more exciting prizes!</p>
          )}
        </div>

        {/* --- BOTTOM SECTION: CTA --- */}
        <div className="w-full absolute bottom-0 left-0 bg-black/80 backdrop-blur-lg border-t border-white/20 py-8">
          <div className="flex justify-center items-center gap-12">
            <p className="text-4xl font-bold text-white tracking-wide">
              Play now at: <span className="text-amber-400">{tenant.domain}</span>
            </p>
            {tenant.whatsappNumber && (
              <div className="h-12 w-px bg-white/30" />
            )}
            {tenant.whatsappNumber && (
              <p className="text-4xl font-bold text-green-400 tracking-wide">
                WhatsApp: {tenant.whatsappNumber}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }
);

PosterTemplate.displayName = "PosterTemplate";
