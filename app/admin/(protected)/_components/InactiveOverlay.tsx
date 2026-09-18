"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface Props {
  isDateExpired: boolean;
  isStatusInactive: boolean;
  dbStatus: string;
  domain?: string;
}

const SUPPORT_WHATSAPP = "919606914772";

export default function InactiveOverlay({ isDateExpired, isStatusInactive, dbStatus, domain }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/admin/login");
  };

  let title = "Subscription Inactive";
  let message = "Your subscription has ended. Please renew to regain access to your admin portal.";
  let waMessage = `Hi, my subscription has ended. My website URL is https://${domain}. Please help me renew my subscription.`;

  if (dbStatus === "pending_activation") {
    // Brand-new unactivated account — keep its own distinct message
    title = "Activation Pending";
    message = "Your account is pending activation. Please complete your setup or contact support.";
    waMessage = `Hi, my account is pending activation. My website URL is https://${domain}. Please help me complete the setup.`;
  } else if (isDateExpired && isStatusInactive) {
    // Both conditions met
    title = "Account Inactive";
    message = "Account inactive. Please contact support to reactivate your account.";
    waMessage = `Hi, my account is inactive and my subscription has ended. My website URL is https://${domain}. Please help me reactivate my account.`;
  } else if (!isDateExpired && isStatusInactive) {
    // Status manually set to inactive/suspended but date hasn't lapsed
    title = "Account Deactivated";
    message = "Account deactivated. Please contact support to reactivate your account.";
    waMessage = `Hi, my account has been deactivated. My website URL is https://${domain}. Please help me reactivate my account.`;
  }
  // else: isDateExpired && !isStatusInactive → default title/message/waMessage above (date-only expiry)

  const whatsappUrl = `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(waMessage)}`;

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
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Contact Support on WhatsApp
          </a>
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
