import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { api } from "@/lib/api";
import type { Game, GameState } from "@/types";
import GameRunnerClient from "./_components/GameRunnerClient";

interface GameRunnerPageProps {
  params: {
    gameId: string;
  };
}

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function fetchGame(tenantId: string, gameId: string): Promise<Game | null> {
  try {
    return await api.get<Game>(`/tenants/${tenantId}/games/${gameId}`, {
      next: { revalidate: 0 },
    });
  } catch (e) {
    return null;
  }
}

async function fetchTenant(tenantId: string): Promise<any> {
  try {
    return await api.get<any>(`/tenants/${tenantId}`, {
      next: { revalidate: 300 },
    });
  } catch (e) {
    return null;
  }
}

async function fetchGameState(tenantId: string, gameId: string): Promise<GameState | null> {
  try {
    return await api.get<GameState>(`/tenants/${tenantId}/games/${gameId}/state`, {
      next: { revalidate: 0 },
    });
  } catch (e) {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function GameRunnerPage({ params }: GameRunnerPageProps) {
  const tenantId = headers().get("x-tenant-id") ?? "";
  
  const [game, gameState, tenant] = await Promise.all([
    fetchGame(tenantId, params.gameId),
    fetchGameState(tenantId, params.gameId),
    fetchTenant(tenantId)
  ]);

  if (!game || !gameState) {
    redirect("/admin/games");
  }

  // Security / Safety check: Game runner should not be accessible if completed.
  if (game.status === "completed") {
    redirect(`/admin/games/${game.id}`); // Redirect back to edit page
  }

  return <GameRunnerClient tenantId={tenantId} game={game} initialState={gameState} businessName={tenant?.businessName || "Tambola"} />;
}
