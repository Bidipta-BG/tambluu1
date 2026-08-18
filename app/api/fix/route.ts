import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const themesDir = path.join(process.cwd(), 'app/(public)/_components/themes');
    const files = ['FestivalDashboard.tsx', 'ColorSplashDashboard.tsx', 'NeonDashboard.tsx', 'RoyalDashboard.tsx'];

    const searchString = `  // Only subscribe when we have a real game ID
  useGameRealtime({
    gameId: game?.id ?? '',
    onCalledNumber,
    onNewWinner,
    onGameStatusChange,
  });

  // ── Polling fallback (works even if Supabase Realtime is not configured) ────
  // Ref keeps calledNumbers accessible in the poll closure without going stale
  const calledNumbersRef = useRef<number[]>(calledNumbers);
  useEffect(() => { calledNumbersRef.current = calledNumbers; }, [calledNumbers]);

  // Poll game status every 4 seconds when the game is NOT yet live.
  // Uses the backend API (public endpoint, no RLS) so it works on any device/network.
  useEffect(() => {
    if (!game?.id || isLive) return;
    const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
    if (!API_BASE) return;

    const poll = async () => {
      try {
        const res = await fetch(\`\${API_BASE}/tenants/\${tenant.id}/games/current\`, {
          cache: 'no-store',
        });
        if (!res.ok) return;
        const json = await res.json();
        // Backend wraps in { data: {...} } or returns directly
        const currentGame = json?.data ?? json;
        if (currentGame) {
          setLiveGame(currentGame);
          const status: string = currentGame.status;
          if (status && status !== 'scheduled') {
            setGameStatus(status as GameStatus);
            if (status === 'running') {
              speakAnnouncement("Khel shuru ho chuka hai! Sabhi ko shubhkamnayein!");
            }
          }
        }
      } catch {/* non-fatal */}
    };

    poll(); // check immediately on mount
    const id = setInterval(poll, 4000);
    return () => clearInterval(id);
  }, [game?.id, isLive, tenant.id]);

  // Poll the backend /state API every 5 seconds when the game IS live.
  // This uses the public backend endpoint which bypasses Supabase RLS entirely.
  // It's a reliable fallback in case broadcast realtime events are missed.
  useEffect(() => {
    if (!game?.id || !isLive) return;
    const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
    if (!API_BASE) return;

    const poll = async () => {
      try {
        const res = await fetch(\`\${API_BASE}/tenants/\${tenant.id}/games/\${game.id}/state\`, {
          cache: 'no-store',
        });
        if (!res.ok) return;
        const json = await res.json();
        const raw = json?.data ?? json;

        // Extract called numbers (backend returns [{number, sequence}])
        const nums: number[] = (raw?.calledNumbers || raw?.called_numbers || [])
          .sort((a: any, b: any) => (a.sequence ?? 0) - (b.sequence ?? 0))
          .map((n: any) => typeof n === 'number' ? n : n.number);

        if (nums.length > calledNumbersRef.current.length) {
          const newNums = nums.slice(calledNumbersRef.current.length);
          setCalledNumbers(nums);
          setLatestNumber(newNums[newNums.length - 1]);
          setAnimKey(k => k + 1);
          setTimeout(() => speakNumber(newNums[newNums.length - 1]), 1500);
        }

        // ── Sync winners from the backend ───────────────────────────────────
        // The backend /state endpoint returns winners with the correct shape:
        // { id, dividend_id, ticket_id, matched_numbers }
        // This is the single most reliable source of truth — no RLS, no
        // broadcast drops, no type mismatches.
        const rawWinners: RealtimeWinnerRow[] = (raw?.winners ?? []);
        if (rawWinners.length > 0) {
          setWinners(prev => {
            if (prev.length !== rawWinners.length) {
              // Flash the announcement banner for the newest winner
              const newest = rawWinners[rawWinners.length - 1];
              setLatestWinner(newest);
              speakAnnouncement("Hamare paas ek vijeta hai! Bahut bahut badhai!");
              fireWinnerConfetti();
              return rawWinners;
            }
            return prev;
          });
        }

        // Sync game status too
        const status = raw?.status;
        if (status && status !== gameStatus) {
          setGameStatus(status as GameStatus);
          if (status === 'running') {
            speakAnnouncement("Khel shuru ho chuka hai! Sabhi ko shubhkamnayein!");
          } else if (status === 'completed') {
            speakAnnouncement("Khel samapt hua! Khelne ke liye dhanyawad!");
            fireCelebration();
            playCelebrationSound();
          }
        }
      } catch {/* non-fatal */}
    };

    poll(); // check immediately when we go live
    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
  }, [game?.id, isLive, tenant.id, gameStatus]);`;

    const replacementString = `  useGamePolling({
    tenantId: tenant.id,
    gameId: game?.id ?? '',
    onCalledNumber,
    onNewWinner,
    onGameStatusChange,
  });`;

    const importSearch = `import { useGameRealtime, type RealtimeCalledNumber, type RealtimeWinnerRow, type RealtimeGameRow } from "../../_hooks/useGameRealtime";`;
    const importReplace = `import { useGamePolling, type RealtimeCalledNumber, type RealtimeWinnerRow, type RealtimeGameRow } from "../../_hooks/useGamePolling";`;

    const results = [];
    for (const file of files) {
      const filePath = path.join(themesDir, file);
      if (!fs.existsSync(filePath)) continue;
      
      let code = fs.readFileSync(filePath, 'utf-8');
      
      // Need to replace the \${} with actual values to match the file exactly!
      // Actually, since I used backticks in the string, those literal ${} exist in the source code!
      code = code.replace(searchString, replacementString);
      code = code.replace(importSearch, importReplace);
      
      fs.writeFileSync(filePath, code, 'utf-8');
      results.push(\`Fixed \${file}\`);
    }
    
    return NextResponse.json({ success: true, results });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
