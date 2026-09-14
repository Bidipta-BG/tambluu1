"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface GameStatusWatcherProps {
  tenantId: string;
  gameId: string;
}

export default function GameStatusWatcher({ tenantId, gameId }: GameStatusWatcherProps) {
  const router = useRouter();
  const pollingRef = useRef(false);

  useEffect(() => {
    if (!tenantId || !gameId) return;

    const intervalId = setInterval(async () => {
      if (pollingRef.current) return;
      pollingRef.current = true;

      try {
        const res = await fetch(`/api/live-state?tenantId=${tenantId}&gameId=${gameId}`, {
          cache: "no-store",
        });

        if (res.ok) {
          const json = await res.json();
          const state = json.data || json;

          // If the game status changes to running, we refresh the Next.js page.
          // This will trigger the server-side render to switch to the LiveGameBoard.
          if (state && state.status === "running") {
            router.refresh();
          }
        }
      } catch (err) {
        // Silently ignore fetch errors
      } finally {
        pollingRef.current = false;
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(intervalId);
  }, [tenantId, gameId, router]);

  // This is a headless component, it doesn't render any UI
  return null;
}
