"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { useGlobalLoader } from "@/components/GlobalLoaderProvider";
import type { Game, Dividend } from "@/types";

interface DividendsSectionProps {
  tenantId: string;
  game: Game | null;
  initialDividends: Dividend[];
}

const DEFAULT_PATTERNS = [
  { name: "Full House 1", patternType: "full_house_1" },
  { name: "Full House 2", patternType: "full_house_2" },
  { name: "Full House 3", patternType: "full_house_3" },
  { name: "Top Line", patternType: "top_line" },
  { name: "Middle Line", patternType: "middle_line" },
  { name: "Bottom Line", patternType: "bottom_line" },
  { name: "Quick 5 (Early 5)", patternType: "quick_five" },
  { name: "Corners", patternType: "corners" },
  { name: "Half Seat Bonus", patternType: "half_seat_bonus" },
];

export default function DividendsSection({ tenantId, game, initialDividends }: DividendsSectionProps) {
  const router = useRouter();
  const { showLoader, hideLoader } = useGlobalLoader();
  
  // Merge initial dividends with default patterns if missing
  const [dividends, setDividends] = useState(() => {
    return DEFAULT_PATTERNS.map((dp, i) => {
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
        name: dp.name,
        patternType: dp.patternType,
        active: existing ? Boolean(existing.active) : false,
        prizeAmount: existing ? Number(existing.prize_amount) : 1000,
        sortOrder: i,
      };
    });
  });

  // Sync state if gameId or initialDividends change (e.g. after a new game is created and router.refresh() runs)
  
  useEffect(() => {
    setDividends(DEFAULT_PATTERNS.map((dp, i) => {
      const legacyMap: Record<string, string[]> = {
        "full_house_1": ["full_house", "full_house_1"],
        "half_seat_bonus": ["half_seat", "half_seat_bonus"],
        "full_house_2": ["full_seat", "full_house_2"],
        "quick_five": ["early_five", "quick_five"],
        "corners": ["corner", "corners"]
      };
      
      const allowedKeys = legacyMap[dp.patternType] || [dp.patternType];
      // Support both snake_case (from DB directly) and camelCase (from typical Next.js serialization or mock)
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
    if (!isPending && loading) {
      setLoading(false);
      hideLoader();
    }
  }, [isPending]);

  const toggleActive = (index: number) => {
    const newDivs = [...dividends];
    newDivs[index].active = !newDivs[index].active;
    setDividends(newDivs);
  };

  const handlePrizeChange = (index: number, val: string) => {
    const newDivs = [...dividends];
    // Keep it as a string if empty to allow deleting completely. 
    // Otherwise, parse as number to avoid leading zeros.
    newDivs[index].prizeAmount = val === "" ? "" : Number(val);
    setDividends(newDivs);
  };

  const handleSave = async () => {
    if (!game?.id) return alert("Please create a game first.");
    setLoading(true);
    showLoader("Saving Dividends...");
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not logged in");

      const headers = { Authorization: `Bearer ${session.access_token}` };

      // Ensure empty string is converted to 0 for the API payload
      const payload = dividends.map(d => ({
        ...d,
        prizeAmount: d.prizeAmount === "" ? 0 : Number(d.prizeAmount)
      }));

      await api.put(`/tenants/${tenantId}/games/${game?.id}/dividends`, payload, { headers });
      
      showLoader("Refreshing Dashboard...");
      startTransition(() => {
        router.refresh();
      });
    } catch (e: any) {
      alert(`Error saving dividends: ${e.message}`);
      setLoading(false);
      hideLoader();
    }
  };

  const totalAmount = (game?.ticket_price || 0) * (game?.total_tickets || 0);

  // Calculate total allocated to active prizes dynamically from local state
  const totalAllocated = dividends
    .filter(d => d.active)
    .reduce((sum, d) => sum + (Number(d.prizeAmount) || 0), 0);
    
  const yourProfit = totalAmount - totalAllocated;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white">Dividends / Prizes</h2>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <div className="bg-violet-600/20 border border-violet-500/30 text-violet-300 px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-2">
            Total Pool: <span className="text-white">₹{totalAmount.toLocaleString('en-IN')}</span>
          </div>
          <div className={`border px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-2 ${
            yourProfit < 0 
              ? 'bg-red-600/20 border-red-500/30 text-red-300' 
              : 'bg-emerald-600/20 border-emerald-500/30 text-emerald-300'
          }`}>
            Your Profit: <span className="text-white">₹{yourProfit.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>
      
      <div className="space-y-3 mb-4">
        {dividends.map((div, i) => (
          <div key={div.patternType} className="flex items-center gap-3 bg-slate-800 p-2 rounded-lg border border-slate-700">
            <button 
              onClick={() => toggleActive(i)}
              className={`w-8 h-8 rounded flex items-center justify-center text-white font-bold flex-shrink-0 transition ${
                div.active ? 'bg-green-500' : 'bg-red-500'
              }`}
            >
              {div.active ? "✓" : "✗"}
            </button>
            <div className="flex-1 text-sm text-white font-medium">
              {div.name}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-xs">₹</span>
              <input 
                type="number"
                min="0"
                value={div.prizeAmount}
                onChange={(e) => handlePrizeChange(i, e.target.value)}
                className="w-24 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-sm"
              />
            </div>
          </div>
        ))}
      </div>

      <button 
        onClick={handleSave}
        disabled={loading}
        className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-6 rounded-lg text-sm transition"
      >
        {loading ? "Saving..." : "Save Dividends"}
      </button>
    </div>
  );
}
