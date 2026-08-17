import type { Ticket, Game, Tenant, Dividend } from "@/types";

interface BookingDashboardProps {
  tenant: Tenant;
  game?: Game | null;
  tickets?: Ticket[];
  dividends?: Dividend[];
}

export default function RoyalDashboard({
  tenant,
  game,
  tickets = [],
  dividends = [],
}: BookingDashboardProps) {
  return (
    <div className="w-full min-h-screen bg-blue-950 font-sans text-white flex items-center justify-center">
      <h1 className="text-4xl font-bold text-yellow-500 uppercase">{tenant.businessName.split('.')[0]}</h1>
      <p className="mt-4">Placeholder for Royal theme...</p>
    </div>
  );
}
