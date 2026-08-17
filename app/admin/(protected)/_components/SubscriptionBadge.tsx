"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { SubscriptionStatus } from "@/types";
import { cn } from "@/lib/cn";

interface SubscriptionBadgeProps {
  tenantId: string;
  /** Poll interval in ms. Default 5 minutes. */
  pollIntervalMs?: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
/** Warn when fewer than this many hours remain. */
const WARN_THRESHOLD_HOURS = 6;

// ---------------------------------------------------------------------------
// Fetch helper (authenticated — includes Supabase JWT)
// ---------------------------------------------------------------------------
async function fetchSubscriptionStatus(
  tenantId: string,
): Promise<SubscriptionStatus | null> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;

  try {
    const res = await fetch(
      `${API_BASE}/tenants/${tenantId}/subscription-status`,
      {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          Accept: "application/json",
        },
        cache: "no-store",
      },
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json.data as SubscriptionStatus;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Visual helpers
// ---------------------------------------------------------------------------

function totalHoursRemaining(sub: SubscriptionStatus): number {
  return sub.daysRemaining * 24 + sub.hoursRemaining;
}

function formatRemaining(sub: SubscriptionStatus): string {
  const hours = totalHoursRemaining(sub);
  if (hours <= 0) return "Expired";
  if (sub.daysRemaining >= 1) return `${sub.daysRemaining}d remaining`;
  return `${Math.ceil(sub.hoursRemaining)}h remaining`;
}

function formatPlan(plan?: string): string {
  if (!plan) return "Unknown";
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SubscriptionBadge({
  tenantId,
  pollIntervalMs = 5 * 60 * 1000, // 5 minutes
}: SubscriptionBadgeProps) {
  const [sub, setSub] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const fetch = useCallback(async () => {
    const data = await fetchSubscriptionStatus(tenantId);
    setSub(data);
    setLoading(false);
    setLastFetched(new Date());
  }, [tenantId]);

  useEffect(() => {
    fetch();
    const timer = setInterval(fetch, pollIntervalMs);
    return () => clearInterval(timer);
  }, [fetch, pollIntervalMs]);

  // ── Loading skeleton ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="mx-3 mb-3 rounded-xl border border-slate-800 bg-slate-800/50 p-3 animate-pulse">
        <div className="h-2.5 w-16 rounded bg-slate-700 mb-2" />
        <div className="h-4 w-24 rounded bg-slate-700" />
      </div>
    );
  }

  // ── Fetch failed ─────────────────────────────────────────────────────────
  if (!sub) {
    return (
      <div className="mx-3 mb-3 rounded-xl border border-slate-800 bg-slate-900 p-3">
        <p className="text-[11px] text-slate-600 text-center">
          Subscription unavailable
        </p>
      </div>
    );
  }

  const hours = totalHoursRemaining(sub);
  const isExpired  = hours <= 0 && sub.status !== "pending_activation";
  const isPending  = sub.status === "pending_activation";
  const isCritical = hours > 0 && hours <= 1;
  const isWarning  = hours > 1 && hours <= WARN_THRESHOLD_HOURS;

  return (
    <div
      id="subscription-badge"
      className={cn(
        "flex items-center gap-3 px-4 py-1.5 rounded-lg border transition-colors text-xs font-medium",
        isExpired || isCritical
          ? "border-red-500/40 bg-red-500/10"
          : isWarning
          ? "border-orange-500/40 bg-orange-500/10"
          : isPending
          ? "border-blue-500/40 bg-blue-500/10"
          : "border-slate-700/60 bg-slate-800/60",
      )}
    >
      <span
        className={cn(
          "font-bold",
          isExpired || isCritical ? "text-red-300" : isWarning ? "text-orange-300" : isPending ? "text-blue-300" : "text-slate-200"
        )}
      >
        {isExpired ? "⛔ Expired" : isPending ? "⏳ Pending" : isCritical || isWarning ? `⚠ ${formatRemaining(sub)}` : formatRemaining(sub)}
      </span>

      {sub.expiryDate && (
        <>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">
            Expires {new Date(sub.expiryDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </span>
        </>
      )}
    </div>
  );
}
