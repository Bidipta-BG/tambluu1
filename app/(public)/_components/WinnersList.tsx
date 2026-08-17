"use client";

import { useState } from "react";
import type { Winner } from "@/types";
import { formatPrizeType } from "@/lib/whatsapp";
import { cn } from "@/lib/cn";

interface WinnersListProps {
  winners: Winner[];
  /** IDs of winners that just arrived via Realtime — gets the flash animation. */
  newWinnerIds?: Set<string>;
}

const PRIZE_COLORS: Record<string, string> = {
  full_house:  "text-amber-300 bg-amber-400/10 ring-amber-400/30",
  top_line:    "text-violet-300 bg-violet-400/10 ring-violet-400/30",
  middle_line: "text-cyan-300 bg-cyan-400/10 ring-cyan-400/30",
  bottom_line: "text-pink-300 bg-pink-400/10 ring-pink-400/30",
  early_five:  "text-emerald-300 bg-emerald-400/10 ring-emerald-400/30",
};

const PRIZE_ICONS: Record<string, string> = {
  full_house:  "🏆",
  top_line:    "🥇",
  middle_line: "🥈",
  bottom_line: "🥉",
  early_five:  "⚡",
};

export default function WinnersList({
  winners,
  newWinnerIds,
}: WinnersListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (winners.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-center">
        <p className="text-slate-500 text-sm">No winners yet — game in progress!</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-800 flex items-center gap-2">
        <span className="text-lg">🏆</span>
        <h3 className="text-sm font-semibold text-slate-200">
          Winners ({winners.length})
        </h3>
      </div>

      <ul className="divide-y divide-slate-800">
        {winners.map((winner) => {
          const isExpanded = expandedId === winner.id;
          const isNew = newWinnerIds?.has(winner.id) ?? false;
          const prizeColor =
            PRIZE_COLORS[winner.prize_type] ??
            "text-slate-300 bg-slate-700 ring-slate-600";
          const prizeIcon = PRIZE_ICONS[winner.prize_type] ?? "🎉";

          return (
            <li
              key={winner.id}
              // winner-flash CSS class drives the keyframe animation from globals.css
              className={isNew ? "winner-flash" : undefined}
            >
              <button
                id={`winner-${winner.id}`}
                onClick={() =>
                  setExpandedId(isExpanded ? null : winner.id)
                }
                className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-slate-800/50 transition"
                aria-expanded={isExpanded}
              >
                {/* "NEW" badge — shown while the flash animation runs */}
                {isNew && (
                  <span className="flex-shrink-0 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[9px] font-bold text-white uppercase tracking-wider">
                    New
                  </span>
                )}

                {/* Prize badge */}
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 flex-shrink-0",
                    prizeColor,
                  )}
                >
                  {prizeIcon} {formatPrizeType(winner.prize_type)}
                </span>

                {/* Player info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-100 truncate">
                    {winner.player_name || "Player"}
                  </p>
                  <p className="text-xs text-slate-500">
                    Ticket #{winner.ticket_number}
                  </p>
                </div>

                {/* Expand chevron */}
                <svg
                  className={cn(
                    "h-4 w-4 text-slate-500 flex-shrink-0 transition-transform duration-200",
                    isExpanded && "rotate-180",
                  )}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {/* Expanded proof */}
              {isExpanded && (
                <div className="px-5 pb-4 bg-slate-800/30 border-t border-slate-800">
                  <p className="text-xs font-medium text-slate-400 mt-3 mb-2">
                    Matched numbers proof
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {winner.matched_numbers.map((n) => (
                      <span
                        key={n}
                        className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-amber-400 text-slate-900 text-xs font-bold shadow shadow-amber-400/20"
                      >
                        {n}
                      </span>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-600 mt-3">
                    Claimed at{" "}
                    {new Date(winner.claimed_at).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
