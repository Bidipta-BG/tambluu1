import { headers } from "next/headers";
import { api, ApiError } from "@/lib/api";
import type { Tenant, Game, Ticket, GameState, Dividend } from "@/types";
import BookingDashboard from "./_components/BookingDashboard"; // Keeping this if imported elsewhere, or remove
import FestivalDashboard from "./_components/themes/FestivalDashboard";
import NortheastDashboard from "./_components/themes/NortheastDashboard";
import RoyalDashboard from "./_components/themes/RoyalDashboard";
import NeonDashboard from "./_components/themes/NeonDashboard";
import ColorSplashDashboard from "./_components/themes/ColorSplashDashboard";
import LiveGameBoard from "./_components/LiveGameBoard";

// ---------------------------------------------------------------------------
// Data fetching helpers
// ---------------------------------------------------------------------------

async function fetchTenant(tenantId: string): Promise<Tenant | null> {
  try {
    return await api.get<Tenant>(`/tenants/${tenantId}`, {
      next: { revalidate: 60 },
    });
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    console.error("[player] fetchTenant error:", e);
    return null;
  }
}

async function fetchCurrentGame(tenantId: string): Promise<Game | null> {
  try {
    return await api.get<Game>(`/tenants/${tenantId}/games/current`, {
      cache: "no-store",
    });
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    console.error("[player] fetchCurrentGame error:", e);
    return null;
  }
}

async function fetchTickets(tenantId: string, gameId: string): Promise<Ticket[]> {
  try {
    const { createClient: createSupabaseAdmin } = await import("@supabase/supabase-js");
    const supabaseAdmin = createSupabaseAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const { data, error } = await supabaseAdmin
      .from("tickets")
      .select("*")
      .eq("game_id", gameId)
      .order("ticket_number", { ascending: true });

    if (error) {
      console.error("[player] fetchTickets supabase error:", error.message);
      return [];
    }
    
    // Parse grids since they might be returned as JSON strings or JSON arrays depending on Postgres setup
    const parsedData = (data || []).map((t: any) => ({
      ...t,
      grid: typeof t.grid === 'string' ? JSON.parse(t.grid) : t.grid
    }));
    
    return parsedData as Ticket[];
  } catch (e) {
    console.error("[player] fetchTickets error:", e);
    return [];
  }
}


async function fetchGameState(tenantId: string, gameId: string): Promise<GameState | null> {
  try {
    return await api.get<GameState>(
      `/tenants/${tenantId}/games/${gameId}/state`,
      // No cache on the state — this is the live call counter
      { cache: "no-store" },
    );
  } catch (e) {
    console.error("[player] fetchGameState error:", e);
    return null;
  }
}

async function fetchDividends(tenantId: string, gameId: string): Promise<Dividend[]> {
  try {
    const { createClient: createSupabaseAdmin } = await import("@supabase/supabase-js");
    const supabaseAdmin = createSupabaseAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data, error } = await supabaseAdmin
      .from("dividends")
      .select("*")
      .eq("game_id", gameId)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("[player] fetchDividends error:", error.message);
      return [];
    }
    // DB column is 'active', our type uses 'is_active' — normalize here
    return (data || []).map((d: any) => ({ ...d, is_active: d.active })) as Dividend[];
  } catch (e) {
    console.error("[player] fetchDividends CAUGHT ERROR:", e);
    return [];
  }
}



// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

/**
 * Public player page.
 * Resolved via hostname → tenant (via middleware x-tenant-id header).
 * No authentication required.
 *
 * View states:
 *   - No tenant / no game → graceful error states
 *   - game.status === 'scheduled' → BookingDashboard
 *   - game.status === 'running' | 'completed' → LiveGameBoard
 */
export default async function PlayerPage() {
  const tenantId = headers().get("x-tenant-id");
  const tenantMissing = headers().get("x-tenant-missing") === "true";

  // ── Local dev: no tenant configured ───────────────────────────────────────
  if (tenantMissing || !tenantId) {
    return <NoTenantScreen />;
  }

  // ── Fetch tenant + current game in parallel ───────────────────────────────
  const [tenant, game] = await Promise.all([
    fetchTenant(tenantId),
    fetchCurrentGame(tenantId),
  ]);

  if (!tenant) return <ErrorScreen message="Tenant not found." />;
  // ── Theme Router ───────────────────────────────────────────────────────────
  // Resolves the correct UI component based on the tenant's selected theme.
  function renderThemeDashboard(t: Tenant, g: Game | null, tix: Ticket[], divs: Dividend[], state: GameState | null = null) {
    switch (t.themeId) {
      case "11111111-1111-1111-1111-111111111111":
        return <FestivalDashboard tenant={t} game={g} tickets={tix} dividends={divs} gameState={state} />;
      case "22222222-2222-2222-2222-222222222222":
        return <NortheastDashboard tenant={t} game={g} tickets={tix} dividends={divs} gameState={state} />;
      case "33333333-3333-3333-3333-333333333333":
        return <RoyalDashboard tenant={t} game={g} tickets={tix} dividends={divs} gameState={state} />;
      case "44444444-4444-4444-4444-444444444444":
        return <NeonDashboard tenant={t} game={g} tickets={tix} dividends={divs} gameState={state} />;
      case "55555555-5555-5555-5555-555555555555":
        return <ColorSplashDashboard tenant={t} game={g} tickets={tix} dividends={divs} gameState={state} />;
      default:
        // Fallback to Festival theme
        return <FestivalDashboard tenant={t} game={g} tickets={tix} dividends={divs} gameState={state} />;
    }
  }

  // Temporarily rendering the theme dashboard with null game to show the mock UI
  if (!game) {
    return (
      <div className="min-h-screen bg-slate-950">
        {renderThemeDashboard(tenant, null, [], [])}
      </div>
    );
  }

  // ── Booking view ─────────────────────────────────────────────────────────
  if (game.status === "scheduled") {
    const [tickets, dividends] = await Promise.all([
      fetchTickets(tenantId, game.id),
      fetchDividends(tenantId, game.id),
    ]);
    return (
      <div className="min-h-screen bg-slate-950">
        {renderThemeDashboard(tenant, game, tickets, dividends)}
      </div>
    );
  }

  // ── Live / completed view \u2014 render through the same theme dashboard ─────────
  // The themed dashboards (NortheastDashboard, FestivalDashboard, etc.) now
  // detect game.status === 'running' | 'completed' internally and switch to
  // the live game view via Supabase Realtime — no redirect needed.
  const [tickets, dividends, gameState] = await Promise.all([
    fetchTickets(tenantId, game.id),
    fetchDividends(tenantId, game.id),
    fetchGameState(tenantId, game.id),
  ]);

  // If the backend fails to load the game state (e.g. DB error), provide a fallback
  // so the realtime board can still load and catch new incoming numbers.
  const rawState = gameState as any;
  // Backend returns calledNumbers as [{number, sequence}] — sort by sequence then extract numbers
  const calledNumbersSorted: number[] = rawState?.calledNumbers
    ? (rawState.calledNumbers as {number: number; sequence: number}[])
        .sort((a, b) => a.sequence - b.sequence)
        .map((n) => n.number)
    : (rawState?.called_numbers || []).map((n: any) => typeof n === 'number' ? n : n.number);

  const safeGameState = {
    game_id: game.id,
    called_numbers: calledNumbersSorted,
    winners: rawState?.winners || []
  };

  return (
    <div className="min-h-screen bg-slate-950">
      {renderThemeDashboard(tenant, game, tickets, dividends, safeGameState)}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small UI pieces
// ---------------------------------------------------------------------------

function PlayerHeader({
  businessName,
  gameStatus,
}: {
  businessName: string;
  gameStatus: string;
}) {
  return (
    <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur px-4 py-3 flex items-center gap-3">
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400/15 ring-1 ring-amber-400/30 text-base">
        🎰
      </span>
      <span className="text-sm font-semibold text-slate-200 truncate">
        {businessName}
      </span>
      {gameStatus === "running" && (
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 ring-1 ring-emerald-500/30">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live
        </span>
      )}
    </header>
  );
}

function NoTenantScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-8">
      <div className="max-w-sm w-full text-center rounded-2xl border border-amber-500/20 bg-slate-900 p-8">
        <span className="text-4xl mb-4 inline-block">⚠️</span>
        <h1 className="text-lg font-bold text-slate-50 mb-2">No tenant configured</h1>
        <p className="text-sm text-slate-400 mb-4">
          Local dev: add{" "}
          <code className="rounded bg-slate-800 px-1.5 py-0.5 text-amber-400 text-xs">
            ?tenant=&lt;uuid&gt;
          </code>{" "}
          to the URL.
        </p>
      </div>
    </main>
  );
}

function NoGameScreen({ businessName }: { businessName: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-8">
      <div className="max-w-sm w-full text-center rounded-2xl border border-slate-800 bg-slate-900 p-8">
        <span className="text-4xl mb-4 inline-block">🎟</span>
        <h1 className="text-lg font-bold text-slate-50 mb-2">{businessName}</h1>
        <p className="text-sm text-slate-400">
          No game is scheduled right now. Check back soon!
        </p>
      </div>
    </main>
  );
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-8">
      <div className="max-w-sm w-full text-center rounded-2xl border border-red-500/20 bg-slate-900 p-8">
        <span className="text-4xl mb-4 inline-block">🚨</span>
        <h1 className="text-lg font-bold text-slate-50 mb-2">Something went wrong</h1>
        <p className="text-sm text-slate-400">{message}</p>
      </div>
    </main>
  );
}
