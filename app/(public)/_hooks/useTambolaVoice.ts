"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import { getCallout } from "@/lib/tambolaCallouts";

export function useTambolaVoice() {
  const [isSoundEnabled, setIsSoundEnabled] = useState(true); // Default to ON
  const soundEnabledRef = useRef(true); // Ref to avoid stale closures in timeouts
  const isPrimedRef = useRef(false);

  // Auto-prime on first interaction anywhere on the page
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    
    // Some browsers need this to trigger voice loading
    window.speechSynthesis.getVoices();

    const handleFirstInteraction = () => {
      if (!isPrimedRef.current) {
        isPrimedRef.current = true;
        const primer = new SpeechSynthesisUtterance("");
        primer.volume = 0;
        window.speechSynthesis.speak(primer);
      }
      // Remove listeners after first interaction
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };

    window.addEventListener('click', handleFirstInteraction);
    window.addEventListener('touchstart', handleFirstInteraction);

    return () => {
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };
  }, []);

  const pickVoice = useCallback((): SpeechSynthesisVoice | null => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;
    const femaleInIN = voices.find(v => /female/i.test(v.name) && v.lang === "en-IN");
    const femaleInGB = voices.find(v => /female/i.test(v.name) && v.lang.startsWith("en-GB"));
    const femaleInUS = voices.find(v => /female/i.test(v.name) && v.lang.startsWith("en-US"));
    const anyEN = voices.find(v => v.lang.startsWith("en"));
    return femaleInIN ?? femaleInGB ?? femaleInUS ?? anyEN ?? voices[0];
  }, []);

  const speak = useCallback((text: string, rate = 0.88, pitch = 1.1) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (!soundEnabledRef.current) return;
    
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = 1;
    
    const voice = pickVoice();
    if (voice) utterance.voice = voice;
    
    window.speechSynthesis.speak(utterance);
  }, [pickVoice]);

  const toggleSound = useCallback(() => {
    setIsSoundEnabled(prev => {
      const next = !prev;
      soundEnabledRef.current = next;
      if (!next && typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      return next;
    });
  }, []);

  const speakNumber = useCallback((num: number) => {
    speak(getCallout(num), 0.85, 1.05);
  }, [speak]);

  const speakAnnouncement = useCallback((text: string) => {
    speak(text, 0.88, 1.1);
  }, [speak]);

  return { isSoundEnabled, toggleSound, speakNumber, speakAnnouncement };
}
