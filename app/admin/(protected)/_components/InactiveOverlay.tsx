"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function InactiveOverlay({ status }: { status: string }) {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/admin/login");
  };

  let title = "Subscription Inactive";
  let message = "Your subscription has ended. Please renew to regain access to your admin portal.";

  if (status === "pending_activation") {
    title = "Activation Pending";
    message = "Your account is pending activation. Please complete your setup or contact support.";
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-700 rounded-2xl p-8 text-center shadow-2xl">
        <div className="mx-auto w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white mb-4">{title}</h2>
        <p className="text-slate-300 mb-8 leading-relaxed">
          {message}
        </p>
        
        <div className="flex flex-col gap-3">
          <button 
            className="w-full bg-accent hover:bg-accent/90 text-white font-bold py-3 px-4 rounded-lg transition-colors"
            onClick={() => window.location.href = "mailto:support@tambola.com"}
          >
            Contact Support
          </button>
          <button 
            onClick={handleLogout}
            className="w-full bg-transparent border border-slate-600 hover:bg-slate-800 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}
