import { cn } from "@/lib/cn";

interface NumberBoardProps {
  calledNumbers: number[];
  /** If provided, highlight these numbers differently (the player's own ticket matches). */
  matchedNumbers?: number[];
  /** The most recently called number — gets the number-pop CSS animation. */
  latestNumber?: number | null;
}

/**
 * NumberBoard — renders 1–90 in a 9-column grid.
 *
 * Visual states per cell:
 *   matched  (called AND on searched ticket) → emerald
 *   latest   (just called this instant)      → amber + number-pop animation
 *   called                                   → amber (steady)
 *   uncalled                                 → slate (dark)
 */
export default function NumberBoard({
  calledNumbers,
  matchedNumbers,
  latestNumber,
}: NumberBoardProps) {
  const calledSet = new Set(calledNumbers);
  const matchedSet = new Set(matchedNumbers ?? []);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
        Called numbers ({calledNumbers.length} / 90)
      </p>
      <div className="grid grid-cols-9 gap-1.5">
        {Array.from({ length: 90 }, (_, i) => i + 1).map((n) => {
          const isCalled  = calledSet.has(n);
          const isMatched = matchedSet.has(n);
          const isLatest  = n === latestNumber;

          return (
            <div
              key={n}
              // number-pop CSS class is from globals.css; only applied to the latest.
              // Use a key that forces React to remount so the animation always replays.
              className={cn(
                "aspect-square flex items-center justify-center rounded-lg text-[11px] font-bold transition-colors duration-300",
                isMatched
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/40 z-10 relative"
                  : isCalled
                  ? "bg-amber-400 text-slate-900 shadow shadow-amber-400/30"
                  : "bg-slate-800 text-slate-500",
                isLatest && "number-pop",
              )}
              aria-label={`${n}${isCalled ? " called" : ""}${isMatched ? " matched" : ""}`}
            >
              {n}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-800">
        <LegendItem color="bg-amber-400" label="Called" />
        {matchedNumbers && matchedNumbers.length > 0 && (
          <LegendItem color="bg-emerald-500" label="Your match" />
        )}
        <LegendItem color="bg-slate-800" label="Not called" />
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn("h-3 w-3 rounded-sm", color)} />
      <span className="text-xs text-slate-500">{label}</span>
    </div>
  );
}
