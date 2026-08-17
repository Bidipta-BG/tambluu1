import { cn } from "@/lib/cn";

export type StatCardVariant = "default" | "success" | "warning" | "danger" | "violet";

interface StatCardProps {
  id?: string;
  label: string;
  value: React.ReactNode;
  /** Sub-label beneath the value (e.g. "of 50 total") */
  sublabel?: string;
  icon: React.ReactNode;
  variant?: StatCardVariant;
  /** Optional CTA link text */
  ctaText?: string;
  ctaHref?: string;
  /** Show skeleton loading state */
  loading?: boolean;
}

const VARIANT_STYLES: Record<
  StatCardVariant,
  { card: string; icon: string; value: string }
> = {
  default: {
    card:  "border-slate-800 bg-slate-900",
    icon:  "bg-slate-800 text-slate-400",
    value: "text-slate-50",
  },
  success: {
    card:  "border-emerald-500/20 bg-slate-900",
    icon:  "bg-emerald-500/15 text-emerald-400",
    value: "text-emerald-300",
  },
  warning: {
    card:  "border-orange-500/20 bg-slate-900",
    icon:  "bg-orange-500/15 text-orange-400",
    value: "text-orange-300",
  },
  danger: {
    card:  "border-red-500/20 bg-slate-900",
    icon:  "bg-red-500/15 text-red-400",
    value: "text-red-300",
  },
  violet: {
    card:  "border-violet-500/20 bg-slate-900",
    icon:  "bg-violet-500/15 text-violet-400",
    value: "text-violet-300",
  },
};

/**
 * StatCard — a summary card for the admin dashboard.
 * Fully server-renderable (no client hooks).
 */
export default function StatCard({
  id,
  label,
  value,
  sublabel,
  icon,
  variant = "default",
  ctaText,
  ctaHref,
  loading = false,
}: StatCardProps) {
  const styles = VARIANT_STYLES[variant];

  return (
    <div
      id={id}
      className={cn(
        "relative rounded-2xl border p-5 shadow-sm flex flex-col gap-4",
        styles.card,
      )}
    >
      {/* Icon + label row */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {label}
          </p>
        </div>
        <span
          className={cn(
            "flex-shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-xl",
            styles.icon,
          )}
        >
          {icon}
        </span>
      </div>

      {/* Value */}
      {loading ? (
        <div className="animate-pulse space-y-2">
          <div className="h-8 w-24 rounded-lg bg-slate-800" />
          <div className="h-3 w-16 rounded bg-slate-800" />
        </div>
      ) : (
        <div>
          <p className={cn("text-3xl font-extrabold tabular-nums", styles.value)}>
            {value}
          </p>
          {sublabel && (
            <p className="text-xs text-slate-500 mt-0.5">{sublabel}</p>
          )}
        </div>
      )}

      {/* CTA */}
      {ctaText && ctaHref && !loading && (
        <a
          href={ctaHref}
          className="text-xs font-medium text-slate-400 hover:text-slate-200 transition inline-flex items-center gap-1 mt-auto"
        >
          {ctaText}
          <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </a>
      )}
    </div>
  );
}
