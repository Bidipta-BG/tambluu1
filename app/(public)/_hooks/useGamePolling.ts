"use client";

import { useEffect, useRef, useState } from "react";
import type { GameStatus } from "@/types";

// ── Payload shapes expected by the themes (matching old Realtime hook) ──────

export interface RealtimeCalledNumber {
  number: number;
  sequence: number;
}

export interface RealtimeWinnerRow {
  id: string;
  game_id: string;
  tenant_id?: string;
  ticket_id: string;
  dividend_id: string;
  matched_numbers: number[];
  created_at: string;
}

export interface RealtimeGameRow {
  id?: string;
  status: GameStatus;
}

export type ChannelStatus =
  | "connecting"
  | "SUBSCRIBED" // Keep the same string so themes don't break
  | "CHANNEL_ERROR"
  | "TIMED_OUT"
  | "CLOSED";

interface UseGamePollingOptions {
  tenantId: string;
  gameId: string;
  onCalledNumber: (payload: RealtimeCalledNumber) => void;
  onNewWinner: (payload: RealtimeWinnerRow) => void;
  onGameStatusChange: (payload: RealtimeGameRow) => void;
  onGameUpdated?: (game: any) => void;
  onTicketsUpdated?: (tickets: any[]) => void;
  onDividendsUpdated?: (dividends: any[]) => void;
}

export function useGamePolling({
  tenantId,
  gameId,
  onCalledNumber,
  onNewWinner,
  onGameStatusChange,
  onGameUpdated,
  onTicketsUpdated,
  onDividendsUpdated,
}: UseGamePollingOptions): ChannelStatus {
  // We use "SUBSCRIBED" to mock the websocket state so the UI thinks it's connected
  const [channelStatus, setChannelStatus] = useState<ChannelStatus>("connecting");

  const onCalledNumberRef = useRef(onCalledNumber);
  const onNewWinnerRef = useRef(onNewWinner);
  const onGameStatusChangeRef = useRef(onGameStatusChange);
  const onGameUpdatedRef = useRef(onGameUpdated);
  const onTicketsUpdatedRef = useRef(onTicketsUpdated);
  const onDividendsUpdatedRef = useRef(onDividendsUpdated);

  // Track the highest sequence seen to detect new numbers
  const maxSequenceRef = useRef<number>(0);
  // Track known winner IDs to detect new winners
  const knownWinnerIdsRef = useRef<Set<string>>(new Set());
  // Track status to detect transitions
  const lastStatusRef = useRef<GameStatus | null>(null);

  useEffect(() => {
    onCalledNumberRef.current = onCalledNumber;
    onNewWinnerRef.current = onNewWinner;
    onGameStatusChangeRef.current = onGameStatusChange;
    onGameUpdatedRef.current = onGameUpdated;
    onTicketsUpdatedRef.current = onTicketsUpdated;
    onDividendsUpdatedRef.current = onDividendsUpdated;
  });

  useEffect(() => {
    if (!gameId || !tenantId) return;

    let isPolling = true;

    console.log(`[useGamePolling] Starting poll for tenant: ${tenantId}, game: ${gameId}`);

    const pollState = async () => {
      if (!isPolling) return;
      try {
        console.log(`[useGamePolling] Fetching /api/live-state for game: ${gameId}`);
        const res = await fetch(`/api/live-state?tenantId=${tenantId}&gameId=${gameId}`);
        if (!res.ok) {
          setChannelStatus("CHANNEL_ERROR");
          return;
        }

        const json = await res.json();
        
        const state = json.data || json;
        if (!state) return;

        setChannelStatus("SUBSCRIBED"); // Successfully connected

        // 0. Check Game Update
        if (state.currentGame && onGameUpdatedRef.current) {
          onGameUpdatedRef.current(state.currentGame);
        }

        if (state.tickets && onTicketsUpdatedRef.current) {
          onTicketsUpdatedRef.current(state.tickets);
        }

        if (state.dividends && onDividendsUpdatedRef.current) {
          onDividendsUpdatedRef.current(state.dividends);
        }

        // 1. Check Game Status
        if (state.status && state.status !== lastStatusRef.current) {
          lastStatusRef.current = state.status;
          onGameStatusChangeRef.current({ status: state.status as GameStatus });
        }

        // 2. Check Called Numbers
        const numbers: RealtimeCalledNumber[] = state.calledNumbers || [];
        // The backend returns them in order. Let's find any sequence higher than our max.
        const newNumbers = numbers.filter(n => n.sequence > maxSequenceRef.current);
        
        if (newNumbers.length > 0) {
          // If multiple new numbers arrived in one poll (e.g. user lost internet for 10s),
          // we emit them sequentially so the UI registers each one.
          newNumbers.sort((a, b) => a.sequence - b.sequence).forEach(n => {
            onCalledNumberRef.current(n);
            maxSequenceRef.current = n.sequence;
          });
        }

        // 3. Check Winners
        const winners: RealtimeWinnerRow[] = state.winners || [];
        winners.forEach(w => {
          // Fallback to generating a unique ID if the row ID is missing
          const uniqueId = w.id || `${w.dividend_id}-${w.ticket_id}`;
          if (!knownWinnerIdsRef.current.has(uniqueId)) {
            knownWinnerIdsRef.current.add(uniqueId);
            onNewWinnerRef.current(w);
          }
        });

      } catch (err) {
        console.error("Polling error:", err);
        setChannelStatus("CHANNEL_ERROR");
      }
    };

    // Initial poll
    pollState();

    // Set up 3-second interval
    const intervalId = setInterval(pollState, 3000);

    return () => {
      isPolling = false;
      clearInterval(intervalId);
    };
  }, [gameId, tenantId]);

  return channelStatus;
}
