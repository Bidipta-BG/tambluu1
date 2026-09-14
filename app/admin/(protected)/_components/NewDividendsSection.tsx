"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { useGlobalLoader } from "@/components/GlobalLoaderProvider";
import { useToast } from "@/components/ToastProvider";
import type { Game, Dividend } from "@/types";

interface Props {
  tenantId: string;
  game: Game | null;
  initialDividends: Dividend[];
}

const NEW_PATTERNS = [
  { name: "First Full House",     patternType: "full_house_1" },
  { name: "Second Full House",    patternType: "full_house_2" },
  { name: "Third Full House",     patternType: "full_house_3" },
  { name: "Full Sheet Bonus",     patternType: "full_sheet_bonus" },
  { name: "Half Sheet Bonus",     patternType: "half_seat_bonus" },
  { name: "Top Line",             patternType: "top_line" },
  { name: "Middle Line",          patternType: "middle_line" },
  { name: "Bottom Line",          patternType: "bottom_line" },
  { name: "Box Bonus",            patternType: "box_bonus" },
  { name: "Corner",               patternType: "corners" },
  { name: "Star",                 patternType: "star" },
  { name: "Early 5",              patternType: "quick_five" },
  { name: "Quick6",               patternType: "quick_six" },
  { name: "Quick7",               patternType: "quick_seven" },
];

export function NewDividendsSection({ tenantId, game, initialDividends }: Props) {
  const router = useRouter();
  const { showLoader, hideLoader } = useGlobalLoader();
  const { showToast } = useToast();
  
  type UI_Dividend = { name: string; patternType: string; active: boolean; prizeAmount: number | string; sortOrder: number };
  
  const [dividends, setDividends] = useState<UI_Dividend[]>(() => {
    return NEW_PATTERNS.map((dp, i) => {
      const legacyMap: Record<string, string[]> = {
        "full_house_1": ["full_house", "full_house_1"],
        "half_seat_bonus": ["half_seat", "half_seat_bonus"],
        "full_house_2": ["full_seat", "full_house_2"],
        "quick_five": ["early_five", "quick_five"],
        "corners": ["corner", "corners"]
      };
      
      const allowedKeys = legacyMap[dp.patternType] || [dp.patternType];
      const existing = initialDividends.find(d => allowedKeys.includes(d.pattern_type));
      
      return {
        name: dp.name, // Keep the exact new name from screenshot
        patternType: dp.patternType,
        active: existing ? Boolean(existing.is_active) : false,
        prizeAmount: existing ? Number(existing.prize_amount) : 1000,
        sortOrder: i,
      };
    });
  });

  useEffect(() => {
    setDividends(NEW_PATTERNS.map((dp, i) => {
      const legacyMap: Record<string, string[]> = {
        "full_house_1": ["full_house", "full_house_1"],
        "half_seat_bonus": ["half_seat", "half_seat_bonus"],
        "full_house_2": ["full_seat", "full_house_2"],
        "quick_five": ["early_five", "quick_five"],
        "corners": ["corner", "corners"]
      };
      
      const allowedKeys = legacyMap[dp.patternType] || [dp.patternType];
      const existing = initialDividends.find(d => allowedKeys.includes(d.pattern_type) || allowedKeys.includes((d as any).patternType));
      
      return {
        name: dp.name,
        patternType: dp.patternType,
        active: existing ? Boolean((existing as any).active ?? (existing as any).is_active) : false,
        prizeAmount: existing ? Number((existing as any).prize_amount ?? (existing as any).prizeAmount) : 1000,
        sortOrder: i,
      };
    }));
  }, [game?.id, initialDividends]);

  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (loading || isPending) {
      showLoader(loading ? "Saving Dividends..." : "Refreshing Dashboard...");
    } else {
      hideLoader();
    }
  }, [loading, isPending, showLoader, hideLoader]);

  const toggleActive = (index: number) => {
    const newDivs = [...dividends];
    newDivs[index].active = !newDivs[index].active;
    setDividends(newDivs);
  };

  const handlePrizeChange = (index: number, val: string) => {
    const newDivs = [...dividends];
    newDivs[index].prizeAmount = val === "" ? "" : Number(val);
    setDividends(newDivs);
  };

  const handleSave = async () => {
    if (!game?.id) return alert("Please create a game first.");
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not logged in");

      const headers = { Authorization: `Bearer ${session.access_token}` };

      const payload = dividends.map(d => ({
        ...d,
        prizeAmount: d.prizeAmount === "" ? 0 : Number(d.prizeAmount)
      }));

      await api.put(`/tenants/${tenantId}/games/${game?.id}/dividends`, payload, { headers });
      
      startTransition(() => {
        router.refresh();
      });
    } catch (e: any) {
      alert(`Error saving dividends: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleMakePoster = () => {
    showToast("Poster is coming soon", "info");
  };

  return (
    <div className="bg-[#0b00c4] border-2 border-blue-600 rounded-md overflow-hidden max-w-4xl mx-auto mb-10 shadow-xl">
      {/* Header */}
      <div className="p-4 bg-[#0b00c4] text-center">
        <h2 className="text-white font-black text-xl md:text-2xl tracking-wide uppercase">
          DIVIDEND SETTINGS
        </h2>
      </div>

      {/* Table Container */}
      <div className="bg-[#0b00c4] px-2 pb-2">
        {/* Table Headers */}
        <div className="flex border-b border-black h-10 bg-black">
          <div className="flex-1 flex items-center px-3 border-r border-black font-bold text-white text-sm">
            Dividend type
          </div>
          <div className="w-1/3 flex items-center px-3 border-r border-black font-bold text-white text-sm">
            Prize amount
          </div>
          <div className="w-12 sm:w-16 flex justify-center items-center font-bold text-white text-sm">
            X
          </div>
        </div>

        {/* Table Rows */}
        <div className="bg-[#0b00c4] pt-2 space-y-2">
          {dividends.map((div, i) => (
            <div key={div.patternType} className="flex bg-white border border-black">
              {/* Dividend Name */}
              <div className="flex-1 flex items-center px-3 border-r border-black font-bold text-black text-sm md:text-base py-2">
                {div.name}
              </div>
              
              {/* Prize Amount Input */}
              <div className="w-1/3 flex items-center border-r border-black">
                <input
                  type="number"
                  min="0"
                  value={div.prizeAmount}
                  onChange={(e) => handlePrizeChange(i, e.target.value)}
                  className="w-full h-full px-3 font-bold text-black text-sm md:text-base outline-none bg-transparent"
                />
              </div>

              {/* Checkbox */}
              <div 
                className="w-12 sm:w-16 flex justify-center items-center cursor-pointer select-none"
                onClick={() => toggleActive(i)}
                style={{ backgroundColor: div.active ? '#007bff' : '#ffffff' }}
              >
                {div.active && (
                  <svg className="w-6 h-6 text-white font-bold" fill="none" stroke="currentColor" strokeWidth={4} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Buttons Row */}
        <div className="flex bg-[#0b00c4] pt-2 gap-2 h-14">
          <button 
            onClick={handleMakePoster}
            className="flex-1 bg-black hover:bg-gray-900 text-white font-black uppercase text-sm md:text-base tracking-wide flex items-center justify-center transition-colors border border-black"
          >
            MAKE POSTER
          </button>
          <button 
            onClick={handleSave}
            disabled={loading}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-black uppercase text-sm md:text-base tracking-wide flex items-center justify-center transition-colors border border-red-800"
          >
            {loading ? "SAVING..." : "SAVE DIVIDENTS"}
          </button>
        </div>
      </div>
    </div>
  );
}
