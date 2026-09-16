import { headers } from "next/headers";
import { api, ApiError } from "@/lib/api";
import { getSessionRole } from "@/lib/auth";
import type { Game, Tenant, Dividend } from "@/types";

import GameSetupSection from "./_components/GameSetupSection";
import DividendsSection from "./_components/DividendsSection";
import RunGameSection from "./_components/RunGameSection";
import AnnouncementSection from "./_components/AnnouncementSection";
import AllTicketsSection from "./_components/AllTicketsSection";
import OrganizerInfoSection from "./_components/OrganizerInfoSection";
import ThemeStoreSection from "./_components/ThemeStoreSection";
import NewAdminHeader from "./_components/NewAdminHeader";
import NewGameSetupSection from "./_components/NewGameSetupSection";
import NewShuffleSection from "./_components/NewShuffleSection";
import NewAnnouncementSection from "./_components/NewAnnouncementSection";
import NewActionButtonsSection from "./_components/NewActionButtonsSection";
import { NewRunGameSection } from "./_components/NewRunGameSection";
import { NewFloatingBookTicketButton } from "./_components/NewFloatingBookTicketButton";

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
import { NewDividendsSection } from "./_components/NewDividendsSection";
import { NewBusinessInfoSection } from "./_components/NewBusinessInfoSection";
import { NewImportantLinksSection } from "./_components/NewImportantLinksSection";
import { NewAdminInfoSection } from "./_components/NewAdminInfoSection";
import { NewLinkInfoSection } from "./_components/NewLinkInfoSection";
import { NewPlayerMessagingSection } from "./_components/NewPlayerMessagingSection";
import { NewSocialGroupLinkSection } from "./_components/NewSocialGroupLinkSection";
import { NewTicketAgentListSection } from "./_components/NewTicketAgentListSection";
import { NewGameSettingsSection } from "./_components/NewGameSettingsSection";

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
    <div 
      className="min-h-screen font-sans bg-cover bg-center bg-fixed"
      style={{ backgroundImage: 'linear-gradient(to bottom right, #8a1c4a, #4a2133, #8a4832)' }}
    >
      <div className="w-full max-w-xl mx-auto space-y-10 p-2 sm:p-4 sm:space-y-12">
        
        {/* NEW Header Section */}
        <NewAdminHeader tenant={tenant} />
        
        {/* NEW Game Setup Section */}
        <NewGameSetupSection tenantId={tenant.id} game={game} isBumperGame={tenant.is_bumper_game} websiteStatus={tenant.websiteStatus} />

        {/* NEW Shuffle Section */}
        <NewShuffleSection tenantId={tenant.id} game={game} tickets={initialTickets} />

        {/* NEW Announcement Section */}
        <NewAnnouncementSection tenant={tenant} />

        {/* NEW Action Buttons Section */}
        <NewActionButtonsSection tenantId={tenant.id} game={game} />

        {/* NEW Run Game Section */}
        <NewRunGameSection tenantId={tenant.id} game={game} />

        {/* NEW Dividends Section */}
        <NewDividendsSection tenant={tenant} tenantId={tenant.id} game={game} initialDividends={initialDividends} />

        {/* NEW Business Info Section */}
        <NewBusinessInfoSection game={game} tickets={initialTickets} dividends={initialDividends} />

        {/* NEW Important Links Section */}
        <NewImportantLinksSection tenant={tenant} />

        {/* NEW Admin Info Section */}
        <NewAdminInfoSection tenant={tenant} />

        {/* NEW Link Info Section */}
        <NewLinkInfoSection tenant={tenant} />

        {/* NEW Player Messaging Section */}
        <NewPlayerMessagingSection tenant={tenant} />

        {/* NEW Social Group Link Section */}
        <NewSocialGroupLinkSection tenant={tenant} />

        {/* NEW Ticket & Agent List Section */}
        <NewTicketAgentListSection tenantId={tenant.id} game={game} tickets={initialTickets} agents={agentsList} />

        {/* NEW Game Settings Section */}
        <NewGameSettingsSection tenant={tenant} />

        {/* --- OLD UI WRAPPER (REMOVED) --- */}

        {/* Footer padding to prevent overlapping with floating button on mobile */}
        <div className="h-16 sm:h-20" />
      </div>
      <NewFloatingBookTicketButton tenantId={tenant.id} game={game} tickets={initialTickets} />
    </div>
  );
}
