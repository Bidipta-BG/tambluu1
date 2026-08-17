import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { api } from "@/lib/api";
import type { Game, Dividend, Ticket } from "@/types";
import EditGameClient from "./_components/EditGameClient";

interface GameEditPageProps {
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

async function fetchDividends(tenantId: string, gameId: string): Promise<Dividend[]> {
  try {
    return await api.get<Dividend[]>(`/tenants/${tenantId}/games/${gameId}/dividends`, {
      next: { revalidate: 0 },
    });
  } catch (e) {
    return [];
  }
}

async function fetchTickets(tenantId: string, gameId: string): Promise<Ticket[]> {
  try {
    return await api.get<Ticket[]>(`/tenants/${tenantId}/games/${gameId}/tickets`, {
      next: { revalidate: 0 },
    });
  } catch (e) {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function GameEditPage({ params }: GameEditPageProps) {
  const tenantId = headers().get("x-tenant-id") ?? "";
  
  const [game, dividends, tickets] = await Promise.all([
    fetchGame(tenantId, params.gameId),
    fetchDividends(tenantId, params.gameId),
    fetchTickets(tenantId, params.gameId)
  ]);

  if (!game) {
    redirect("/admin/games");
  }

  return <EditGameClient tenantId={tenantId} game={game} initialDividends={dividends} tickets={tickets} />;
}
