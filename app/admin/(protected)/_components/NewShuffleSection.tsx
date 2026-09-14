"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { useGlobalLoader } from "@/components/GlobalLoaderProvider";
import type { Game, Ticket } from "@/types";

interface NewShuffleSectionProps {
  tenantId: string;
  game: Game | null;
  tickets: Ticket[];
}

export default function NewShuffleSection({ tenantId, game, tickets }: NewShuffleSectionProps) {
  const router = useRouter();
  const { showLoader, hideLoader } = useGlobalLoader();
  const [isPending, startTransition] = useTransition();
  const [isShuffling, setIsShuffling] = useState(false);

  // Use fixed random 3-digit numbers for the visual display so it always looks cool
  const generateRandom3Digit = () => Math.floor(Math.random() * (999 - 100 + 1)) + 100;
  
  const [finalNumbers, setFinalNumbers] = useState<number[]>([
    931, 932, 933, 934, 935, 936
  ]);

  const [animNumbers, setAnimNumbers] = useState<number[]>(finalNumbers);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Avoid hydration mismatch: only randomize the initial numbers after the component mounts on the client
  useEffect(() => {
    const randomInitial = [
      generateRandom3Digit(), generateRandom3Digit(), generateRandom3Digit(), 
      generateRandom3Digit(), generateRandom3Digit(), generateRandom3Digit()
    ];
    setFinalNumbers(randomInitial);
    setAnimNumbers(randomInitial);
  }, []);

  useEffect(() => {
    if (!isShuffling) {
      setAnimNumbers(finalNumbers);
    }
  }, [finalNumbers, isShuffling]);

  const handleShuffle = async () => {
    if (!game) return alert("No active game to shuffle.");
    
    // Check game status but don't strictly disable the button state itself
    if (game.status === 'completed' || game.status === 'running') {
      return alert("Cannot shuffle tickets while the game is running or completed.");
    }

    const confirmShuffle = window.confirm("Shuffling will reset your existing tickets and all booking will be cancelled out. Are you sure you want to still shuffle tickets?");
    if (!confirmShuffle) return;

    setIsShuffling(true);

    // 1. Start the rapid spinning animation (always 3 digits)
    intervalRef.current = setInterval(() => {
      setAnimNumbers(Array.from({ length: 6 }, () => generateRandom3Digit()));
    }, 100);

    // 2. We want the animation to run for at least 3 seconds
    const animationPromise = new Promise(resolve => setTimeout(resolve, 3000));

    // 3. Make the actual API call
    let apiSuccess = false;
    const apiPromise = async () => {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Not logged in");

        const headers = { Authorization: `Bearer ${session.access_token}` };
        await api.post(`/tenants/${tenantId}/games/${game.id}/shuffle-tickets`, {}, { headers });
        apiSuccess = true;
      } catch (e: any) {
        console.error(e);
        alert("Failed to shuffle tickets: " + e.message);
      }
    };

    await Promise.all([animationPromise, apiPromise()]);

    if (intervalRef.current) clearInterval(intervalRef.current);
    
    setIsShuffling(false);

    if (apiSuccess) {
      // Set new final display numbers
      setFinalNumbers([
        generateRandom3Digit(), generateRandom3Digit(), generateRandom3Digit(), 
        generateRandom3Digit(), generateRandom3Digit(), generateRandom3Digit()
      ]);
      startTransition(() => {
        router.refresh();
      });
    }
  };

  return (
    <div className="w-full bg-[#0a0088] flex flex-col items-center p-3 shadow-lg mx-auto max-w-xl text-center">
      <h2 className="text-white font-black text-xl uppercase tracking-wider mb-1">
        SHUFFLE YOUR TICKET
      </h2>
      
      <p className="text-indigo-200 font-bold text-sm lowercase mb-2">
        below is first six random ticket id
      </p>

      <div className="flex justify-center flex-wrap gap-2 sm:gap-3 mb-3 mt-1">
        {animNumbers.map((num, i) => (
          <div 
            key={i} 
            className="w-10 h-10 sm:w-14 sm:h-14 bg-yellow-300 border-[3px] border-red-600 flex items-center justify-center shadow-md"
          >
            <span className="text-black font-black text-sm sm:text-base">{num}</span>
          </div>
        ))}
      </div>

      <div className="w-full flex justify-end">
        <button 
          onClick={handleShuffle}
          disabled={isShuffling} // only disabled while actually animating/calling API
          className="bg-[#ff6b4a] active:bg-[#ff522b] disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-sm px-6 py-1.5 rounded shadow-[0_3px_0_#c0392b] active:shadow-[0_0px_0_#c0392b] active:translate-y-1 transition-all"
        >
          {isShuffling ? "shuffling..." : "shuffle"}
        </button>
      </div>
    </div>
  );
}
