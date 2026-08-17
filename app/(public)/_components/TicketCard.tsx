"use client";

import { useState } from "react";
import type { Ticket, Game, Tenant } from "@/types";
import TambolaGrid from "./TambolaGrid";
import BookNowModal from "./BookNowModal";
import { buildBookingWhatsAppUrl } from "@/lib/whatsapp";
import { cn } from "@/lib/cn";

interface TicketCardProps {
  ticket: Ticket;
  game: Game;
  tenant: Tenant;
}

const STATUS_LABEL: Record<string, string> = {
  available: "Available",
  booked: "Booked",
  confirmed: "Confirmed",
};

const STATUS_COLOR: Record<string, string> = {
  available: "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30",
  booked: "bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/30",
  confirmed: "bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/30",
};

export default function TicketCard({ ticket, game, tenant }: TicketCardProps) {
  const [showModal, setShowModal] = useState(false);
  const [localStatus, setLocalStatus] = useState(ticket.status);

  const isBookingOpen = game.booking_status === "open";
  const isAvailable = localStatus === "available";
  const canBook = isBookingOpen && isAvailable;

  const whatsappUrl =
    tenant.whatsappNumber
      ? buildBookingWhatsAppUrl({
          whatsappNumber: tenant.whatsappNumber,
          ticketNumber: ticket.ticket_number,
          gameDate: game.scheduled_at,
          ticketPrice: game.ticket_price,
          businessName: tenant.businessName,
        })
      : null;

  return (
    <>
      <article
        id={`ticket-${ticket.ticket_number}`}
        className={cn(
          "group relative flex flex-col rounded-2xl border bg-slate-900 shadow-lg transition-all duration-200",
          isAvailable
            ? "border-slate-700 hover:border-amber-500/50 hover:shadow-amber-500/10 hover:shadow-xl"
            : "border-slate-800 opacity-80",
        )}
      >
        {/* Card header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Ticket
            </span>
            <span className="text-base font-extrabold text-slate-50">
              #{ticket.ticket_number}
            </span>
          </div>
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[11px] font-medium",
              STATUS_COLOR[localStatus] ?? STATUS_COLOR.available,
            )}
          >
            {STATUS_LABEL[localStatus] ?? localStatus}
          </span>
        </div>

        {/* Grid preview */}
        <div className="flex items-center justify-center px-4 py-5">
          <TambolaGrid grid={ticket.grid} size="sm" />
        </div>

        {/* Price + actions */}
        <div className="flex items-center gap-2 px-4 pb-4">
          <span className="text-sm font-bold text-amber-400">
            ₹{game.ticket_price}
          </span>

          <div className="ml-auto flex gap-2">
            {/* WhatsApp button */}
            {whatsappUrl && (
              <a
                id={`ticket-${ticket.ticket_number}-whatsapp`}
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-700/50 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-600 transition"
                aria-label={`Book ticket ${ticket.ticket_number} via WhatsApp`}
              >
                <WhatsAppIcon />
                WhatsApp
              </a>
            )}

            {/* Book now / Booking closed */}
            {isBookingOpen ? (
              <button
                id={`ticket-${ticket.ticket_number}-book`}
                onClick={() => canBook && setShowModal(true)}
                disabled={!isAvailable}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                  canBook
                    ? "bg-amber-500 text-slate-900 hover:bg-amber-400 shadow shadow-amber-500/30"
                    : "bg-slate-800 text-slate-500 cursor-not-allowed",
                )}
              >
                {isAvailable ? "Book now" : "Unavailable"}
              </button>
            ) : (
              <span className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-500">
                Booking closed
              </span>
            )}
          </div>
        </div>
      </article>

      {/* Modal */}
      {showModal && (
        <BookNowModal
          ticket={ticket}
          game={game}
          tenantId={tenant.id}
          onClose={() => setShowModal(false)}
          onSuccess={() => setLocalStatus("booked")}
        />
      )}
    </>
  );
}

function WhatsAppIcon() {
  return (
    <svg
      className="h-3.5 w-3.5"
      fill="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}
