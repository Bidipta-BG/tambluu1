"use client";
import { useState, useCallback, useRef } from "react";

// ── File path helpers ────────────────────────────────────────────────────────

/**
 * Maps announcement keys to their exact filenames in /public/sounds_new/.
 */
const ANNOUNCEMENT_FILES: Record<string, string> = {
  game_about_to_start: "/sounds_new/GAME IS LIVE.mp3",
  game_started:        "/sounds_new/game has started.mp3",
  game_ended:          "/sounds_new/GAME IS OVER.mp3",
  please_book_ticket:  "/sounds_new/please book ticket.mp3",
};



function getNumberFile(num: number): string {
  return `/sounds_new/${num}.mp3`;
}

/**
 * Maps a dividend pattern_type to its new prize audio file.
 */
function getPrizeFile(patternType: string): string {
  const prizeMap: Record<string, string> = {
    early_five:         "Early 5",
    quick_five:         "Early 5",
    top_line:           "Top Line",
    middle_line:        "Middle Line",
    bottom_line:        "Bottom Line",
    full_house:         "First Full House",
    full_house_1:       "First Full House",
    first_full_house:   "First Full House",
    second_full_house:  "Second Full House",
    full_house_2:       "Second Full House",
    third_full_house:   "Third Full House",
    full_house_3:       "Third Full House",
    corner:             "Corner",
    corners:            "Corner",
    star:               "Star",
    half_sheet:         "Half Sheet Bonus",
    half_seat_bonus:    "Half Sheet Bonus",
    full_sheet:         "Full Sheet Bonus",
    full_sheet_bonus:   "Full Sheet Bonus",
    box:                "Box Bonus",
    box_bonus:          "Box Bonus",
    quick_6:            "Quick6",
    quick_six:          "Quick6",
    quick_7:            "Quick7",
    quick_seven:        "Quick7",
  };
  
  const base = prizeMap[patternType] ?? patternType;
  return `/sounds_new/${base}.mp3`;
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
   * Play the prize-specific audio (e.g. prize_top_line.mp3).
   * @param patternType - the dividend's pattern_type from the database
   */
  const speakPrize = useCallback(
    async (patternType: string) => {
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
