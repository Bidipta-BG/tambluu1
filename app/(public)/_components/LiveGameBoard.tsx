"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import type { GameState, GameStatus, Game, Tenant, Ticket, Winner } from "@/types";
import { useGamePolling, type RealtimeWinnerRow, type ChannelStatus } from "../_hooks/useGamePolling";
import NumberBoard from "./NumberBoard";
import TambolaGrid from "./TambolaGrid";
import WinnersList from "./WinnersList";
import { cn } from "@/lib/cn";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface LiveGameBoardProps {
  tenant: Tenant;
  game: Game;
  /** Initial snapshot from GET .../state — Realtime delivers incremental updates. */
  state: GameState;
  /** All tickets for this game — used for the ticket search feature. */
  tickets: Ticket[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract all non-blank numbers from a Tambola ticket's 3×9 grid. */
function getTicketNumbers(ticket: Ticket): number[] {
  return ticket.grid.flatMap((row) => row.filter((n) => n !== 0));
}

/**
 * Build a Winner object from a Realtime INSERT row.
 * The DB row doesn't carry denormalised player_name / ticket_number, so we
 * look those up from the tickets array we already have in memory.
 */
function enrichWinner(
  row: RealtimeWinnerRow,
  tickets: Ticket[],
): Winner {
  const ticket = tickets.find((t) => t.id === row.ticket_id);
  return {
    id:              row.id,
    // dividend_id carries the prize type key (e.g. "full_house")
    prize_type:      row.dividend_id,
    ticket_number:   ticket?.ticket_number ?? 0,
    player_name:     ticket?.player_name ?? "Player",
    matched_numbers: row.matched_numbers ?? [],
    claimed_at:      row.created_at,
  };
}

// ---------------------------------------------------------------------------
// Connection status dot
// ---------------------------------------------------------------------------

const STATUS_DOT: Record<
  ChannelStatus,
  { color: string; pulse: boolean; label: string }
> = {
  connecting:    { color: "bg-yellow-400", pulse: true,  label: "Connecting…" },
  SUBSCRIBED:    { color: "bg-emerald-400", pulse: false, label: "Live" },
  CHANNEL_ERROR: { color: "bg-red-500",    pulse: false, label: "Connection error" },
  TIMED_OUT:     { color: "bg-orange-400", pulse: true,  label: "Reconnecting…" },
  CLOSED:        { color: "bg-slate-500",  pulse: false, label: "Disconnected" },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function LiveGameBoard({
  tenant,
  game,
  state,
  tickets,
}: LiveGameBoardProps) {
  // ── Live state (seeded from server snapshot) ──────────────────────────────
  const [calledNumbers, setCalledNumbers] = useState<number[]>(state.called_numbers);
  const [winners, setWinners]             = useState<Winner[]>(state.winners);
  const [gameStatus, setGameStatus]       = useState<GameStatus>(game.status);
  const [showGameOver, setShowGameOver]   = useState(game.status === "completed");

  // The latest called number drives both the big display and the pop animation
  const [latestNumber, setLatestNumber] = useState<number | null>(
    state.called_numbers.at(-1) ?? null,
  );

  // Track which winner IDs are "new" so WinnersList can flash them
  const [newWinnerIds, setNewWinnerIds] = useState<Set<string>>(new Set());

  // ── Ticket search ─────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");

  // ── Realtime callbacks ────────────────────────────────────────────────────

  const onCalledNumber = useCallback(
    (payload: import("../_hooks/useGamePolling").RealtimeCalledNumber) => {
      setCalledNumbers((prev) => {
        // Guard against duplicate events (e.g. after reconnect)
        if (prev.includes(payload.number)) return prev;
        return [...prev, payload.number];
      });
      setLatestNumber(payload.number);
    },
    [],
  );

  const onNewWinner = useCallback(
    (row: RealtimeWinnerRow) => {
      const winner = enrichWinner(row, tickets);

      setWinners((prev) => {
        // Guard duplicates
        if (prev.some((w) => w.id === winner.id)) return prev;
        return [winner, ...prev]; // prepend — newest first
      });

      // Add to flash set; auto-remove after 3 s (matches winnerFlash duration)
      setNewWinnerIds((prev) => {
        const next = new Set(prev);
        next.add(winner.id);
        return next;
      });
      setTimeout(() => {
        setNewWinnerIds((prev) => {
          const next = new Set(prev);
          next.delete(winner.id);
          return next;
        });
      }, 3000);
    },
    [tickets],
  );

  const onGameStatusChange = useCallback(
    (payload: import("../_hooks/useGamePolling").RealtimeGameRow) => {
      setGameStatus(payload.status);
      if (payload.status === "completed") {
        setShowGameOver(true);
      }
    },
    [],
  );

  // ── Subscribe ─────────────────────────────────────────────────────────────
  const channelStatus = useGamePolling({
    tenantId: tenant.id,
    gameId: game.id,
    onCalledNumber,
    onNewWinner,
    onGameStatusChange,
  });

  // ── Derived search values ─────────────────────────────────────────────────
  const calledSet = useMemo(() => new Set(calledNumbers), [calledNumbers]);

  const { foundTicket, matchedNumbers } = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return { foundTicket: null, matchedNumbers: [] };
    const ticketNum = parseInt(q, 10);
    if (isNaN(ticketNum)) return { foundTicket: null, matchedNumbers: [] };
    const found = tickets.find((t) => t.ticket_number === ticketNum) ?? null;
    if (!found) return { foundTicket: null, matchedNumbers: [] };
    const nums = getTicketNumbers(found).filter((n) => calledSet.has(n));
    return { foundTicket: found, matchedNumbers: nums };
  }, [searchQuery, tickets, calledSet]);

  const isCompleted = gameStatus === "completed";
  const dot = STATUS_DOT[channelStatus];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 space-y-6">

      {/* ── Game-over banner ────────────────────────────────────────────── */}
      {showGameOver && (
        <div className="relative rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/15 via-amber-400/10 to-transparent p-5 flex items-center gap-4 overflow-hidden">
          {/* Subtle shimmer bar */}
          <div
            className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-amber-400/10 to-transparent pointer-events-none"
            style={{ animation: "shimmer 2.5s ease-in-out infinite" }}
          />
          <span className="text-4xl flex-shrink-0">🎉</span>
          <div>
            <p className="text-base font-bold text-amber-300">Game over!</p>
            <p className="text-sm text-slate-400">
              The game has ended. See the final results below.
            </p>
          </div>
          <button
            onClick={() => setShowGameOver(false)}
            className="ml-auto flex-shrink-0 rounded-lg p-1.5 text-slate-500 hover:text-white hover:bg-slate-800 transition"
            aria-label="Dismiss"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-extrabold text-slate-50 truncate uppercase tracking-wider">
            {tenant.businessName.split('.')[0]}
          </h2>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {/* Game status pill */}
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                isCompleted
                  ? "bg-slate-700 text-slate-400"
                  : "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30",
              )}
            >
              {!isCompleted && (
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              )}
              {isCompleted ? "Game ended" : "Live now"}
            </span>

            <span className="text-slate-500 text-xs">
              {calledNumbers.length} / 90 numbers called
            </span>

            {/* Realtime connection dot */}
            <span
              className="inline-flex items-center gap-1.5 text-xs text-slate-500"
              title={`Realtime: ${channelStatus}`}
            >
              <span
                className={cn(
                  "h-2 w-2 rounded-full flex-shrink-0",
                  dot.color,
                  dot.pulse && "animate-pulse",
                )}
              />
              {dot.label}
            </span>
          </div>
        </div>

        {/* Last-called number — big display */}
        {latestNumber && (
          <div className="flex-shrink-0 rounded-2xl border border-amber-500/30 bg-amber-400/10 px-6 py-3 text-center min-w-[100px]">
            <p className="text-xs font-medium text-amber-400 mb-0.5">Last called</p>
            <p className="text-4xl font-black text-amber-300">{latestNumber}</p>
          </div>
        )}
      </div>

      {/* ── Main layout ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left col: number board + ticket search */}
        <div className="lg:col-span-2 space-y-5">
          <NumberBoard
            calledNumbers={calledNumbers}
            matchedNumbers={matchedNumbers}
            latestNumber={latestNumber}
          />

          {/* Ticket search */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-300">
              🔍 Search my ticket
            </h3>
            <div className="flex gap-2">
              <input
                id="ticket-search-input"
                type="number"
                min={1}
                max={game.total_tickets}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Ticket number (1–${game.total_tickets})`}
                className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-50 placeholder-slate-500 outline-none transition focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40"
              />
              {searchQuery && (
                <button
                  id="ticket-search-clear"
                  onClick={() => setSearchQuery("")}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 text-slate-400 hover:text-white transition"
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Search result */}
            {searchQuery !== "" && (
              <div className="mt-2">
                {foundTicket ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium text-slate-400">
                        Ticket #{foundTicket.ticket_number}
                      </span>
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-400 ring-1 ring-emerald-500/30">
                        {matchedNumbers.length} matched
                      </span>
                      {matchedNumbers.length > 0 && (
                        <span className="text-[11px] text-slate-500">
                          — amber = called &amp; on your ticket
                        </span>
                      )}
                    </div>
                    <div className="overflow-x-auto">
                      <TambolaGrid
                        grid={foundTicket.grid}
                        calledNumbers={calledSet}
                        size="lg"
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">
                    No ticket found with number &quot;{searchQuery}&quot;.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right col: winners */}
        <div className="lg:col-span-1">
          <WinnersList winners={winners} newWinnerIds={newWinnerIds} />
        </div>
      </div>
    </div>
  );
}
