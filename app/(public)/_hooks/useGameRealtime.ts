"use client";

/**
 * useGameRealtime
 *
 * Subscribes to the backend's Supabase Realtime BROADCAST channel for live
 * game events. The backend (gameEngine.js / broadcaster.js) sends all events
 * to the channel named `game:<gameId>` via HTTP broadcast.
 *
 * Events listened to (exact names from broadcaster.js):
 *   - 'number_called'   → { number, sequence, totalCalled, remaining }
 *   - 'winner'          → { game_id, tenant_id, ticket_id, dividend_id, matched_numbers }
 *   - 'game_started'    → { gameId, startedAt }
 *   - 'game_completed'  → { gameId, completedAt }
 *
 * Also maintains a postgres_changes fallback on the `games` table for status
 * updates (in case broadcast misses due to network issues).
 */

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { GameStatus } from "@/types";

// ── Payload shapes from the backend broadcaster ───────────────────────────────

export interface RealtimeCalledNumber {
  /** The number drawn (1–90). */
  number: number;
  /** Call order — 1-indexed. */
  sequence: number;
  totalCalled: number;
  remaining: number;
  // Legacy field names kept for backward compat with any postgres_changes path
  game_id?: string;
  called_at?: string;
}

export interface RealtimeWinnerRow {
  game_id: string;
  tenant_id?: string;
  ticket_id: string;
  dividend_id: string;
  matched_numbers: number[];
  created_at?: string;
  id?: string;
}

export interface RealtimeGameRow {
  id?: string;
  status: GameStatus;
}

// ── Status type ───────────────────────────────────────────────────────────────

export type ChannelStatus =
  | "connecting"
  | "SUBSCRIBED"
  | "CHANNEL_ERROR"
  | "TIMED_OUT"
  | "CLOSED";

// ── Hook ─────────────────────────────────────────────────────────────────────

interface UseGameRealtimeOptions {
  gameId: string;
  onCalledNumber: (payload: RealtimeCalledNumber) => void;
  onNewWinner: (payload: RealtimeWinnerRow) => void;
  onGameStatusChange: (payload: RealtimeGameRow) => void;
}

export function useGameRealtime({
  gameId,
  onCalledNumber,
  onNewWinner,
  onGameStatusChange,
}: UseGameRealtimeOptions): ChannelStatus {
  const [channelStatus, setChannelStatus] = useState<ChannelStatus>("connecting");

  // Keep callback refs stable so the effect closure never goes stale
  const onCalledNumberRef = useRef(onCalledNumber);
  const onNewWinnerRef = useRef(onNewWinner);
  const onGameStatusChangeRef = useRef(onGameStatusChange);

  // Sync refs on every render
  useEffect(() => {
    onCalledNumberRef.current = onCalledNumber;
    onNewWinnerRef.current = onNewWinner;
    onGameStatusChangeRef.current = onGameStatusChange;
  });

  useEffect(() => {
    if (!gameId) return;

    const supabase = createClient();

    /**
     * BROADCAST CHANNEL: `game:<gameId>`
     * This matches the backend's broadcaster.js exactly:
     *   broadcastToGame(gameId, event, payload)
     *   → POST to realtime:game:<gameId>
     *
     * Client subscribes to `game:<gameId>` (without the `realtime:` prefix —
     * Supabase handles that prefix internally).
     */
    const channel = supabase
      .channel(`game:${gameId}`)

      // ── 1. New number called ───────────────────────────────────────────────
      .on(
        "broadcast",
        { event: "number_called" },
        ({ payload }) => {
          if (payload?.number != null) {
            onCalledNumberRef.current(payload as RealtimeCalledNumber);
          }
        }
      )

      // ── 2. New winner announced ───────────────────────────────────────────
      .on(
        "broadcast",
        { event: "winner" },
        ({ payload }) => {
          if (payload?.ticket_id) {
            onNewWinnerRef.current(payload as RealtimeWinnerRow);
          }
        }
      )

      // ── 3. Game started ────────────────────────────────────────────────────
      .on(
        "broadcast",
        { event: "game_started" },
        () => {
          onGameStatusChangeRef.current({ status: "running" });
        }
      )

      // ── 4. Game completed ──────────────────────────────────────────────────
      .on(
        "broadcast",
        { event: "game_completed" },
        () => {
          onGameStatusChangeRef.current({ status: "completed" });
        }
      )

      // ── 5. Fallback: postgres_changes on games table for status updates ────
      // This fires whenever the admin starts/stops the game even if broadcast
      // fails (e.g. backend network issue, broadcast timeout).
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "games",
          filter: `id=eq.${gameId}`,
        },
        (pgPayload) => {
          const newRow = pgPayload.new as RealtimeGameRow;
          if (newRow?.status) {
            onGameStatusChangeRef.current(newRow);
          }
        }
      )

      // ── 6. Fallback: postgres_changes on winners table ─────────────────────
      // This guarantees that the prize list updates instantly even if the 
      // HTTP broadcast drops or rate-limits during rapid number calls.
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "winners",
          filter: `game_id=eq.${gameId}`,
        },
        (pgPayload) => {
          const newRow = pgPayload.new as RealtimeWinnerRow;
          if (newRow?.ticket_id) {
            onNewWinnerRef.current(newRow);
          }
        }
      )

      .subscribe((status) => {
        setChannelStatus(status as ChannelStatus);
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn(`[useGameRealtime] Channel status: ${status} for game ${gameId}`);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId]);

  return channelStatus;
}
