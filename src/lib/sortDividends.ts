import type { Dividend } from "@/types";

/**
 * Prize-type priority order for the secondary sort key.
 * Matches the canonical order used in DividendsSection (admin).
 * Legacy aliases (e.g. "full_house" for "full_house_1") are included
 * so that older DB rows are handled gracefully.
 */
const PATTERN_PRIORITY: string[] = [
  "full_house_1",
  "full_house",      // legacy alias for full_house_1
  "full_house_2",
  "full_seat",       // legacy alias for full_house_2
  "full_house_3",
  "top_line",
  "middle_line",
  "bottom_line",
  "quick_five",
  "early_five",      // legacy alias for quick_five
  "corners",
  "corner",          // legacy alias for corners
  "half_seat_bonus",
  "half_seat",       // legacy alias for half_seat_bonus
];

/**
 * Sorts active dividends for display in the Prize List section.
 *
 * Sort order:
 *   1. Primary   — prize_amount descending  (highest prize first)
 *   2. Secondary — pattern_type priority    (Full House 1 → … → Half Seat Bonus)
 */
export function sortDividends(dividends: Dividend[]): Dividend[] {
  return [...dividends].sort((a, b) => {
    // Primary: highest prize amount first
    const amountDiff = (b.prize_amount ?? 0) - (a.prize_amount ?? 0);
    if (amountDiff !== 0) return amountDiff;

    // Secondary: pattern type priority (lower index = higher priority)
    const aIdx = PATTERN_PRIORITY.indexOf(a.pattern_type);
    const bIdx = PATTERN_PRIORITY.indexOf(b.pattern_type);
    const aRank = aIdx === -1 ? PATTERN_PRIORITY.length : aIdx;
    const bRank = bIdx === -1 ? PATTERN_PRIORITY.length : bIdx;
    return aRank - bRank;
  });
}
