"use client";

import Link from "next/link";
import SubscriptionBadge from "./SubscriptionBadge";
import LogoutButton from "@/components/LogoutButton";

interface AdminShellProps {
  children: React.ReactNode;
  tenantId: string;
  businessName: string;
}

import { usePathname } from "next/navigation";

export default function AdminShell({
  children,
  tenantId,
  businessName,
}: AdminShellProps) {
  const pathname = usePathname();
  const isRunGamePage = pathname?.endsWith("/run") ?? false;

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 overflow-hidden">
      {/* ── Top Navbar ─────────────────────────────────────────────────── */}
      {!isRunGamePage && (
        <header className="flex items-center justify-between h-16 px-4 md:px-8 border-b border-slate-800 bg-slate-900 flex-shrink-0">
        <Link
          href="/admin"
          className="flex items-center gap-3 transition-colors"
        >
          <span className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-violet-500/20 ring-1 ring-violet-500/30">
            <svg
              className="h-[18px] w-[18px] text-violet-400"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
              />
            </svg>
          </span>
          <div className="min-w-0 hidden sm:block">
            <p className="text-sm font-semibold text-slate-100 truncate">
              {businessName}
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-4">
          <SubscriptionBadge tenantId={tenantId} />
          <LogoutButton
            redirectTo="/admin/login"
            className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-1.5 text-sm font-medium text-slate-400 transition hover:border-slate-600 hover:bg-slate-700 hover:text-white"
          />
        </div>
      </header>
      )}

      {/* ── Main content area ───────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
