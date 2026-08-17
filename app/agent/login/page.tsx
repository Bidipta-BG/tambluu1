import { Suspense } from "react";
import { headers } from "next/headers";
import AgentLoginForm from "./_form";

/**
 * Agent login page — server component that reads the tenant ID from
 * middleware headers and passes it to the client form.
 * This allows the form to construct the correct tenant-scoped fake email.
 */
export default function AgentLoginPage() {
  const tenantId = headers().get("x-tenant-id") ?? "";

  return (
    <Suspense fallback={<LoginSkeleton />}>
      <AgentLoginForm tenantId={tenantId} />
    </Suspense>
  );
}

function LoginSkeleton() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-sm animate-pulse space-y-4">
        <div className="mx-auto h-12 w-12 rounded-xl bg-slate-800" />
        <div className="mx-auto h-4 w-32 rounded bg-slate-800" />
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4">
          <div className="h-10 rounded-lg bg-slate-800" />
          <div className="h-10 rounded-lg bg-slate-800" />
          <div className="h-10 rounded-lg bg-slate-800" />
        </div>
      </div>
    </main>
  );
}
