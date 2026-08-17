/**
 * TambolaGrid — renders a 3×9 Tambola ticket grid.
 *
 * Props:
 *   grid          3×9 number[][]; value 0 = blank cell.
 *   calledNumbers Optional set of called numbers to highlight.
 *   size          "sm" | "md" | "lg" — controls cell sizing.
 *   className     Extra wrapper class.
 */

import { cn } from "@/lib/cn";

interface TambolaGridProps {
  grid: number[][];
  calledNumbers?: Set<number> | number[];
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE = {
  sm: {
    cell: "h-6 w-7 text-[10px]",
    gap: "gap-0.5",
  },
  md: {
    cell: "h-8 w-9 text-xs",
    gap: "gap-1",
  },
  lg: {
    cell: "h-10 w-11 text-sm font-semibold",
    gap: "gap-1",
  },
};

export default function TambolaGrid({
  grid,
  calledNumbers,
  size = "md",
  className,
}: TambolaGridProps) {
  const called =
    calledNumbers instanceof Set
      ? calledNumbers
      : new Set(calledNumbers ?? []);

  const { cell, gap } = SIZE[size];

  return (
    <div className={cn("inline-flex flex-col", gap, className)}>
      {/* Column headers 1–9 */}
      <div className={cn("flex", gap)}>
        {Array.from({ length: 9 }, (_, i) => (
          <div
            key={i}
            className={cn(
              cell,
              "flex items-center justify-center rounded-sm text-[9px] font-bold text-slate-600",
            )}
          >
            {["1-9","10-19","20-29","30-39","40-49","50-59","60-69","70-79","80-90"][i].split("-")[0]}
          </div>
        ))}
      </div>

      {/* Rows */}
      {grid.map((row, rowIdx) => (
        <div key={rowIdx} className={cn("flex", gap)}>
          {row.map((num, colIdx) => {
            const isEmpty = num === 0;
            const isCalled = !isEmpty && called.has(num);

            return (
              <div
                key={colIdx}
                className={cn(
                  cell,
                  "flex items-center justify-center rounded-md transition-all duration-300",
                  isEmpty
                    ? "bg-slate-800/40"
                    : isCalled
                    ? "bg-amber-400 text-slate-900 font-bold shadow-lg shadow-amber-400/30 scale-105"
                    : "bg-slate-700 text-slate-200",
                )}
              >
                {isEmpty ? null : num}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
