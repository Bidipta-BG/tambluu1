import { Suspense } from "react";
import AdminLoginForm from "./_form";

/**
 * Admin login page — wraps the client form in Suspense so
 * useSearchParams() in the form doesn't block static generation.
 */
export default function AdminLoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <AdminLoginForm />
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
