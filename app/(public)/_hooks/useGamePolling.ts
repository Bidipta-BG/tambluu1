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
  onGameReset?: () => void;
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
  onGameReset,
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

  // First-load flag to prevent ghost replays
  const isFirstPollRef = useRef(true);

  // The Unified Master Queue
  type QueueEvent = 
    | { type: 'number', payload: RealtimeCalledNumber }
    | { type: 'winner', payload: RealtimeWinnerRow }
    | { type: 'status', payload: RealtimeGameRow };
    
  const queueRef = useRef<QueueEvent[]>([]);
  const isProcessingQueueRef = useRef(false);

  const onGameResetRef = useRef(onGameReset);

  useEffect(() => {
    onCalledNumberRef.current = onCalledNumber;
    onNewWinnerRef.current = onNewWinner;
    onGameStatusChangeRef.current = onGameStatusChange;
    onGameUpdatedRef.current = onGameUpdated;
    onTicketsUpdatedRef.current = onTicketsUpdated;
    onDividendsUpdatedRef.current = onDividendsUpdated;
    onGameResetRef.current = onGameReset;
  });

  useEffect(() => {
    if (!gameId || !tenantId) return;

    let isPolling = true;

    const processQueue = async () => {
      if (isProcessingQueueRef.current) return;
      isProcessingQueueRef.current = true;

      while (queueRef.current.length > 0 && isPolling) {
        const event = queueRef.current.shift();
        if (!event) continue;

        if (event.type === 'number') {
          onCalledNumberRef.current(event.payload);
          // 4.5s covers: 1.5s spin + up to 3s voice announcement + 0.3s ticket cut
          await new Promise(resolve => setTimeout(resolve, 4500));
        } 
        else if (event.type === 'winner') {
          onNewWinnerRef.current(event.payload);
          // Wait 5.0s for the confetti and voice announcement to finish
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
        else if (event.type === 'status') {
          onGameStatusChangeRef.current(event.payload);
          if (event.payload.status === 'completed') {
            // Wait 6.5s for the final game over celebration
            await new Promise(resolve => setTimeout(resolve, 6500));
          } else {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }

      isProcessingQueueRef.current = false;
    };

    console.log(`[useGamePolling] Starting poll for tenant: ${tenantId}, game: ${gameId}`);

    const pollState = async () => {
      if (!isPolling) return;
      try {
        const res = await fetch(`/api/live-state?tenantId=${tenantId}&gameId=${gameId}`);
        if (!res.ok) {
          setChannelStatus("CHANNEL_ERROR");
          return;
        }

        const json = await res.json();
        const state = json.data || json;
        if (!state) return;

        setChannelStatus("SUBSCRIBED");

        // 0. Updates that don't need queueing
        if (state.currentGame && onGameUpdatedRef.current) onGameUpdatedRef.current(state.currentGame);
        if (state.tickets && onTicketsUpdatedRef.current) onTicketsUpdatedRef.current(state.tickets);
        if (state.dividends && onDividendsUpdatedRef.current) onDividendsUpdatedRef.current(state.dividends);

        const isFirst = isFirstPollRef.current;
        isFirstPollRef.current = false;

        let addedToQueue = false;

        // 1. Check Game Start (Running) or Game Reset (Scheduled)
        const oldStatus = lastStatusRef.current;
        const newStatus = state.status && state.status !== lastStatusRef.current ? state.status as GameStatus : null;
        
        if (newStatus) {
          lastStatusRef.current = newStatus;
          
          if (!isFirst) {
            if (newStatus === 'running') {
              queueRef.current.push({ type: 'status', payload: { status: 'running' } });
              addedToQueue = true;
            } else if (newStatus === 'scheduled' && oldStatus === 'running') {
              if (onGameResetRef.current) onGameResetRef.current();
            }
          }
        }

        // 2. Check Called Numbers
        const numbers: RealtimeCalledNumber[] = state.calledNumbers || [];
        if (isFirst) {
          if (numbers.length > 0) {
            maxSequenceRef.current = Math.max(...numbers.map(n => n.sequence));
          }
        } else {
          const newNumbers = numbers.filter(n => n.sequence > maxSequenceRef.current);
          if (newNumbers.length > 0) {
            newNumbers.sort((a, b) => a.sequence - b.sequence);
            maxSequenceRef.current = newNumbers[newNumbers.length - 1].sequence;
            newNumbers.forEach(n => queueRef.current.push({ type: 'number', payload: n }));
            addedToQueue = true;
          }
        }

        // 3. Check Winners
        const winners: RealtimeWinnerRow[] = state.winners || [];
        winners.forEach(w => {
          const uniqueId = w.id || `${w.dividend_id}-${w.ticket_id}`;
          if (!knownWinnerIdsRef.current.has(uniqueId)) {
            knownWinnerIdsRef.current.add(uniqueId);
            if (!isFirst) {
              queueRef.current.push({ type: 'winner', payload: w });
              addedToQueue = true;
            }
          }
        });

        // 4. Check Game End (Completed / Cancelled)
        if (newStatus && newStatus !== 'running' && !isFirst) {
          queueRef.current.push({ type: 'status', payload: { status: newStatus } });
          addedToQueue = true;
        }

        // Trigger the queue processor if we added anything
        if (addedToQueue) {
          processQueue();
        }

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
