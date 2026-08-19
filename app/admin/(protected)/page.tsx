import { headers } from "next/headers";
import { api, ApiError } from "@/lib/api";
import { getSessionRole } from "@/lib/auth";
import type { Game, Tenant, Dividend } from "@/types";

import GameSetupSection from "./_components/GameSetupSection";
import DividendsSection from "./_components/DividendsSection";
import RunGameSection from "./_components/RunGameSection";
import AllTicketsSection from "./_components/AllTicketsSection";
import OrganizerInfoSection from "./_components/OrganizerInfoSection";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function fetchCurrentGame(tenantId: string, accessToken: string): Promise<Game | null> {
  try {
    return await api.get<Game>(`/tenants/${tenantId}/games/current`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    return null;
  }
}

async function fetchTenant(tenantId: string): Promise<Tenant | null> {
  try {
    return await api.get<Tenant>(`/tenants/${tenantId}`, {
      next: { revalidate: 0 },
    });
  } catch (e) {
    return null;
  }
}

async function fetchDividends(tenantId: string, gameId: string, accessToken: string): Promise<Dividend[]> {
  try {
    const gameData = await api.get<{ dividends?: Dividend[] }>(`/tenants/${tenantId}/games/${gameId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    return gameData.dividends || [];
  } catch (e) {
    return [];
  }
}

async function fetchTickets(tenantId: string, gameId: string, accessToken: string): Promise<any[]> {
  try {
    return await api.get<any[]>(`/tenants/${tenantId}/games/${gameId}/admin-tickets`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
  } catch (e) {
    return [];
  }
}

async function fetchGames(tenantId: string, accessToken: string): Promise<any[]> {
  try {
    return await api.get<any[]>(`/tenants/${tenantId}/games`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      next: { revalidate: 0 },
    });
  } catch (e) {
    return [];
  }
}

async function fetchBookingRequests(tenantId: string, accessToken: string): Promise<any[]> {
  try {
    return await api.get<any[]>(`/tenants/${tenantId}/booking-requests`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      next: { revalidate: 0 },
    });
  } catch (e) {
    return [];
  }
}

async function fetchAgents(tenantId: string, accessToken: string): Promise<any[]> {
  try {
    return await api.get<any[]>(`/tenants/${tenantId}/agents`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      next: { revalidate: 0 },
    });
  } catch (e) {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

import BookingRequestsClient from "./booking-requests/_components/BookingRequestsClient";
import AgentsClient from "./agents/_components/AgentsClient";
import { createClient } from "@/lib/supabase/server";
import UpdatePasswordSection from "./_components/UpdatePasswordSection";
import PosterMakerSection from "./_components/PosterMakerSection";

export default async function AdminDashboardPage() {
  const sessionRole = await getSessionRole();
  if (!sessionRole) {
    return <div className="p-6 text-white text-center">Not authenticated</div>;
  }

  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return <div className="p-6 text-white text-center">Session expired</div>;

  const tenantId = sessionRole.tenantId;

  const [tenant, game, gamesList, requestsList, agentsList] = await Promise.all([
    fetchTenant(tenantId),
    fetchCurrentGame(tenantId, session.access_token),
    fetchGames(tenantId, session.access_token),
    fetchBookingRequests(tenantId, session.access_token),
    fetchAgents(tenantId, session.access_token),
  ]);

  if (!tenant) {
    return <div className="p-6 text-white text-center">Tenant not found for ID: {tenantId}</div>;
  }

  const [initialDividends, initialTickets] = game 
    ? await Promise.all([
        fetchDividends(tenantId, game.id, session.access_token),
        fetchTickets(tenantId, game.id, session.access_token)
      ])
    : [[], []];

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-12">
        
        {/* Header */}
        <div className="border-b border-slate-800 pb-4">
          <h1 className="text-3xl font-black text-white uppercase tracking-wider flex items-center gap-3">
            {tenant.businessName} Admin
            {tenant.is_bumper_game && (
              <span className="text-lg font-bold text-red-500 tracking-normal bg-red-500/10 px-3 py-1 rounded-full border border-red-500/30">
                (Bumper Game)
              </span>
            )}
          </h1>
          <p className="text-sm text-slate-400 mt-2">Single-page control center</p>
        </div>

        <div className="relative">
          <div className="space-y-12 transition-all duration-300">
            {/* --- SECTION 2: DASHBOARD CONTROLS --- */}
            <section className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-6 border-b border-slate-800 pb-2">
                  Current Game Dashboard
                </h2>
                <GameSetupSection tenantId={tenant.id} game={game} isBumperGame={tenant.is_bumper_game} />
                <DividendsSection tenantId={tenant.id} game={game} initialDividends={initialDividends} />
                <RunGameSection tenantId={tenant.id} game={game} />
              </div>
            </section>

            {/* --- SECTION 2.5: ALL TICKETS --- */}
            <section>
              <AllTicketsSection tenantId={tenant.id} game={game} tickets={initialTickets} />
            </section>

            {/* --- SECTION 3: BOOKING REQUESTS --- */}
            <section>
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <BookingRequestsClient tenantId={tenant.id} initialRequests={requestsList} />
              </div>
            </section>

            {/* --- SECTION 4: AGENTS --- */}
            <section>
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <AgentsClient tenantId={tenant.id} initialAgents={agentsList} />
              </div>
            </section>

            {/* --- SECTION 5: POSTER MAKER --- */}
            <section>
              <PosterMakerSection tenant={tenant} game={game} dividends={initialDividends} />
            </section>
          </div>
        </div>

        {/* --- SECTION 6: TENANT CONFIG --- */}
        <section className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-6 border-b border-slate-800 pb-2">
              Site Configuration
            </h2>
            <OrganizerInfoSection tenant={tenant} />
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mt-6">
            <h2 className="text-xl font-bold text-white mb-6 border-b border-slate-800 pb-2">
              Update Password
            </h2>
            <UpdatePasswordSection />
          </div>
        </section>

        {/* Footer padding */}
        <div className="h-32" />
      </div>
    </div>
  );
}
