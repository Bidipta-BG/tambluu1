// ---------------------------------------------------------------------------
// Tenant
// ---------------------------------------------------------------------------
export interface Tenant {
  id: string;
  businessName: string;
  domain: string;
  status: string;
  themeId: string | null;
  themeOverrides: Record<string, unknown> | null;
  whatsappNumber: string | null;
  whatsappGroupLink: string | null;
  theme: Record<string, unknown> | null;
  is_bumper_game?: boolean;
}

// ---------------------------------------------------------------------------
// Game
// ---------------------------------------------------------------------------
export type GameStatus = "scheduled" | "running" | "completed";
export type BookingStatus = "open" | "closed";

export interface Game {
  id: string;
  status: GameStatus;
  booking_status: BookingStatus;
  scheduled_at: string | null;
  started_at: string | null;
  total_tickets: number;
  ticket_price: number;
  call_interval_seconds: number;
}

// ---------------------------------------------------------------------------
// Ticket
// Tambola ticket: 3 rows × 9 columns.
// grid[row][col] === 0 → empty cell; otherwise the number to display.
// ---------------------------------------------------------------------------
export type TicketStatus = "available" | "booked" | "confirmed";

export interface Ticket {
  id: string;
  ticket_number: number;
  /** 3×9 matrix. 0 = blank cell. */
  grid: number[][];
  status: TicketStatus;
  player_name?: string | null;
  player_phone?: string | null;
}

// ---------------------------------------------------------------------------
// Game state (for live / completed board)
// ---------------------------------------------------------------------------
export interface GameState {
  game_id: string;
  called_numbers: number[];
  winners: Winner[];
}

// ---------------------------------------------------------------------------
// Winner
// ---------------------------------------------------------------------------
export type PrizeType = "early_five" | "top_line" | "middle_line" | "bottom_line" | "full_house" | string;

export interface Winner {
  id: string;
  player_name: string;
  prize_type: PrizeType;
  ticket_number: number;
  matched_numbers: number[];
  claimed_at: string;
}

// ---------------------------------------------------------------------------
// Book-request payload / response
// ---------------------------------------------------------------------------
export interface BookRequestPayload {
  name: string;
  phone: string;
}

export interface BookRequestResponse {
  success: boolean;
  message?: string;
  ticket?: Ticket;
}

// ---------------------------------------------------------------------------
// Subscription status
// Returned by GET /tenants/:tenantId/subscription-status (authenticated)
// ---------------------------------------------------------------------------
export type SubscriptionPlan = "free" | "starter" | "pro" | "enterprise" | string;
export type SubscriptionStatusValue = "active" | "trialing" | "past_due" | "canceled" | string;

export interface SubscriptionStatus {
  status: SubscriptionStatusValue;
  plan: SubscriptionPlan;
  expiryDate: string;
  daysRemaining: number;
  /** Fractional hours remaining within the current day (0–23.99). */
  hoursRemaining: number;
}

// ---------------------------------------------------------------------------
// Admin dashboard summary
// ---------------------------------------------------------------------------
export interface DashboardSummary {
  currentGame: Game | null;
  ticketsSold: number;
  totalTickets: number;
  pendingBookingRequests: number;
}

// ---------------------------------------------------------------------------
// Game Management
// ---------------------------------------------------------------------------
export interface GameSummary {
  sold: number;
  total: number;
  revenue: number;
}

export interface GameWithSummary extends Game {
  ticketSummary?: GameSummary;
}

export interface GameCreatePayload {
  scheduled_at: string;
  total_tickets: number;
  ticket_price: number;
  agency_commission: number;
  call_interval_seconds: number;
}

export interface GameUpdatePayload {
  status?: GameStatus;
  booking_status?: BookingStatus;
  scheduled_at?: string;
  total_tickets?: number;
  ticket_price?: number;
  agency_commission?: number;
  call_interval_seconds?: number;
}

export interface Dividend {
  id?: string; // Optional for new dividends
  game_id?: string;
  name: string;
  pattern_type: string;
  is_active: boolean;
  prize_amount: number;
}

// ---------------------------------------------------------------------------
// Booking Request
// ---------------------------------------------------------------------------
export type BookingRequestStatus = "pending" | "approved" | "rejected" | "expired";

export interface BookingRequest {
  id: string;
  tenant_id: string;
  game_id: string;
  ticket_id: string;
  player_name: string;
  player_phone: string;
  status: BookingRequestStatus;
  created_at: string;
  
  // Joined fields from ticket
  ticket_number?: number;
}

// ---------------------------------------------------------------------------
// Agent
// ---------------------------------------------------------------------------
export type AgentStatus = "active" | "inactive";

export interface Agent {
  id: string;
  name: string;
  phone: string;
  status: AgentStatus;
  commission_per_ticket: number;
  
  // Performance metrics (joined from agent_performance_admin view)
  total_tickets_sold: number;
  total_revenue: number;
  agent_earnings: number;
  admin_net_profit: number;
}

// ---------------------------------------------------------------------------
// Poster Templates
// ---------------------------------------------------------------------------

export interface PosterTemplateField {
  id: string;
  type: "text";
  label: string; // e.g. "game_date", "ticket_price", "whatsapp"
  x: number;
  y: number;
  fontSize: number;
  fontFamily?: string;
  color?: string;
  align?: "left" | "center" | "right";
  defaultText?: string;
}

export interface PosterTemplate {
  id: string;
  name: string;
  background_url: string;
  thumbnail_url: string;
  width: number;
  height: number;
  layout: {
    fields: PosterTemplateField[];
  };
}

// ---------------------------------------------------------------------------
// Themes
// ---------------------------------------------------------------------------

export interface Theme {
  id: string;
  name: string;
  preview_image_url: string;
  default_colors?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Agent Portal
// ---------------------------------------------------------------------------

export interface AgentPerformance {
  total_tickets_sold: number;
  agent_earnings: number;
}

export interface AgentTicket {
  id: string;
  ticket_number: number;
  player_name: string;
  player_phone: string;
  created_at: string;
  game_id: string;
}
