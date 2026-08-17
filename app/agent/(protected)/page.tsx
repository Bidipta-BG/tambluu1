import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import AgentDashboardClient from "./_components/AgentDashboardClient";

// ---------------------------------------------------------------------------
// Page — fetches agent data directly from Supabase (bypasses backend API)
// This avoids all the fetch/auth-header issues with Next.js server components.
// The layout has already verified the session is valid before we get here.
// ---------------------------------------------------------------------------

export default async function AgentDashboardPage() {
  const tenantId = headers().get("x-tenant-id") ?? "";

  // ── Get the logged-in agent's user ID from session ──────────────────────
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id ?? null;

  // ── Create a service-role client to query DB directly ───────────────────
  // We use the service role key here (server-only, never sent to browser).
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // ── Fetch agent row directly from DB ───────────────────────────────────
  let agentInfo: any = null;
  let perfData: any = {};

  if (userId && tenantId) {
    const { data: agentRow, error: agentErr } = await supabaseAdmin
      .from("agents")
      .select("id, name, phone, status, commission_per_ticket")
      .eq("user_id", userId)
      .eq("tenant_id", tenantId)
      .single();

    if (agentErr) {
      console.error("[AgentPage] Could not fetch agent row:", agentErr.message);
    } else if (agentRow) {
      agentInfo = {
        id: agentRow.id,
        name: agentRow.name,
        phone: agentRow.phone,
        status: agentRow.status,
        commissionPerTicket: agentRow.commission_per_ticket,
      };

      // Fetch performance from the self-view
      const { data: perf } = await supabaseAdmin
        .from("agent_performance_self")
        .select("total_tickets_sold, agent_earnings")
        .eq("agent_id", agentRow.id)
        .maybeSingle();

      perfData = perf ?? { total_tickets_sold: 0, agent_earnings: 0 };
    }
  }

  // ── Fetch tickets booked by this agent ──────────────────────────────────
  let tickets: any[] = [];
  if (agentInfo?.id) {
    const { data: ticketRows } = await supabaseAdmin
      .from("tickets")
      .select("id, ticket_number, game_id, player_name, player_phone, status, updated_at")
      .eq("tenant_id", tenantId)
      .eq("agent_id", agentInfo.id)
      .order("updated_at", { ascending: false });
    tickets = ticketRows ?? [];
  }

  // ── Fetch available games ────────────────────────────────────────────────
  const { data: allGames } = await supabaseAdmin
    .from("games")
    .select("*")
    .eq("tenant_id", tenantId);

  const availableGames = (allGames ?? []).filter(
    (g: any) => g.booking_status === "open" && g.status !== "completed"
  );

  // ── Fetch ticket grid for first available game ──────────────────────────
  let gameTickets: any[] = [];
  if (availableGames.length > 0) {
    const { data: gt } = await supabaseAdmin
      .from("tickets")
      .select("id, ticket_number, status, grid, player_name, player_phone, booked_via, agents(name)")
      .eq("tenant_id", tenantId)
      .eq("game_id", availableGames[0].id)
      .order("ticket_number", { ascending: true });
    gameTickets = gt ?? [];
  }

  // ── Fetch tenant domain ──────────────────────────────────────────────────
  const { data: tenant } = await supabaseAdmin
    .from("tenants")
    .select("domain, name")
    .eq("id", tenantId)
    .single();

  const websiteName = tenant?.domain || tenant?.name || "helloworld.online";

  return (
    <AgentDashboardClient
      tenantId={tenantId}
      host={websiteName}
      agentInfo={agentInfo}
      perfData={perfData}
      initialTickets={tickets}
      availableGames={availableGames}
      initialGameTickets={gameTickets}
    />
  );
}
