/**
 * WhatsApp deep-link utilities.
 *
 * Reusable by both the public player page and the admin panel.
 */

export interface WhatsAppBookingParams {
  /** Organizer's WhatsApp number (any format — digits will be extracted). */
  whatsappNumber: string;
  ticketNumbers: number[];
  gameDate: string | null;
  ticketPrice: number;
  businessName?: string;
}

/**
 * Build a wa.me deep link with a pre-filled booking message for multiple tickets.
 */
export function buildBookingWhatsAppUrl({
  whatsappNumber,
  ticketNumbers,
  gameDate,
  ticketPrice,
  businessName,
}: WhatsAppBookingParams): string {
  // Strip everything that is not a digit (spaces, dashes, parens, +)
  const cleaned = whatsappNumber.replace(/\D/g, "");

  const dateStr = gameDate
    ? new Date(gameDate).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Kolkata",
      })
    : "upcoming";

  const ticketStr = ticketNumbers.join(", ");
  const totalCost = ticketNumbers.length * ticketPrice;

  const lines = [
    `Hi${businessName ? ` ${businessName}` : ""}! 🎰`,
    ``,
    `I'd like to book *Ticket(s) #${ticketStr}* for the Tambola game on *${dateStr}*.`,
    `Total cost: *₹${totalCost}* (${ticketNumbers.length} x ₹${ticketPrice})`,
    ``,
    `Please confirm my booking. Thank you!`,
  ];

  const message = lines.join("\n");
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
}

/**
 * Generic wa.me link with a custom message.
 */
export function buildWhatsAppUrl(number: string, message: string): string {
  const cleaned = number.replace(/\D/g, "");
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
}

/** Format a prize type key into a human-readable label. */
export function formatPrizeType(prizeType: string): string {
  const map: Record<string, string> = {
    early_five: "Early Five",
    top_line: "Top Line",
    middle_line: "Middle Line",
    bottom_line: "Bottom Line",
    full_house: "Full House",
  };
  return map[prizeType] ?? prizeType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
