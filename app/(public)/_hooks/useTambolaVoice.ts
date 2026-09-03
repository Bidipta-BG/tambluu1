"use client";
import { useState, useCallback, useRef } from "react";

// ── File path helpers ────────────────────────────────────────────────────────

/**
 * Maps announcement keys to their exact filenames in /public/sounds/.
 * NOTE: game_about_to_start and game_ended were uploaded with .MP3 (uppercase)
 * extension, so we must reference them exactly as uploaded.
 */
const ANNOUNCEMENT_FILES: Record<string, string> = {
  game_about_to_start: "/sounds/game_about_to_start.MP3",
  game_started:        "/sounds/game_started.mp3",
  game_ended:          "/sounds/game_ended.MP3",
};

const WINNER_FILE = "/sounds/winner.MP3";

function getNumberFile(num: number): string {
  return `/sounds/number_${num}.mp3`;
}

/**
 * Maps a dividend pattern_type (including legacy aliases) to its prize audio file.
 */
function getPrizeFile(patternType: string): string {
  const legacyMap: Record<string, string> = {
    full_house:  "prize_full_house_1",
    full_seat:   "prize_full_house_2",
    early_five:  "prize_quick_five",
    corner:      "prize_corners",
    half_seat:   "prize_half_seat_bonus",
  };
  const base = legacyMap[patternType] ?? `prize_${patternType}`;
  return `/sounds/${base}.mp3`;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useTambolaVoice() {
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const soundEnabledRef = useRef(true);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  /** Stop whatever is currently playing. */
  const stopCurrent = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
  }, []);

  /**
   * Play a single audio file. Returns a Promise that resolves when the audio
   * ends (or immediately if muted / on error) so callers can chain sequential
   * playback without blocking the React render cycle.
   */
  const playAudio = useCallback(
    (src: string): Promise<void> => {
      return new Promise((resolve) => {
        if (!soundEnabledRef.current) {
          resolve();
          return;
        }
        stopCurrent();
        const audio = new Audio(src);
        currentAudioRef.current = audio;
        audio.onended = () => {
          currentAudioRef.current = null;
          resolve();
        };
        audio.onerror = () => {
          // Resolve even on error so sequential chains continue gracefully
          currentAudioRef.current = null;
          resolve();
        };
        audio.play().catch(() => resolve());
      });
    },
    [stopCurrent]
  );

  /**
   * Play the ElevenLabs callout for a Tambola number (1-90).
   * Triggered after the slot machine spin completes.
   */
  const speakNumber = useCallback(
    (num: number) => {
      playAudio(getNumberFile(num));
    },
    [playAudio]
  );

  /**
   * Play a game-lifecycle announcement audio.
   * @param key - one of: "game_about_to_start" | "game_started" | "game_ended"
   */
  const speakAnnouncement = useCallback(
    (key: string) => {
      const src = ANNOUNCEMENT_FILES[key];
      if (!src) return;
      playAudio(src);
    },
    [playAudio]
  );

  /**
   * Play the winner sequence: generic winner.mp3 first, then the
   * prize-specific audio (e.g. prize_top_line.mp3) once it ends.
   * @param patternType - the dividend's pattern_type from the database
   */
  const speakPrize = useCallback(
    async (patternType: string) => {
      await playAudio(WINNER_FILE);
      // Only continue with prize-specific audio if still unmuted
      if (soundEnabledRef.current) {
        await playAudio(getPrizeFile(patternType));
      }
    },
    [playAudio]
  );

  const toggleSound = useCallback(() => {
    setIsSoundEnabled((prev) => {
      const next = !prev;
      soundEnabledRef.current = next;
      if (!next) stopCurrent();
      return next;
    });
  }, [stopCurrent]);

  return { isSoundEnabled, toggleSound, speakNumber, speakAnnouncement, speakPrize };
}
