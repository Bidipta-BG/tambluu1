import type { Tenant } from "@/types";

interface NewAdminHeaderProps {
  tenant: Tenant;
}

export default function NewAdminHeader({ tenant }: NewAdminHeaderProps) {
  return (
    <div className="w-full flex flex-col items-center max-w-xl mx-auto space-y-4">
      {/* Dark blue top section */}
      <div className="w-full bg-[#0a0088] py-4 flex justify-center items-center shadow-lg border-2 border-transparent border-t-[#4a4a8a] border-b-[#050040]">
        <h1 className="text-white font-black text-xl sm:text-2xl tracking-widest uppercase">
          ADMIN DASHBOARD
        </h1>
      </div>
      
      {/* Text on background */}
      <div className="w-full py-2 flex justify-center items-center">
        <a href="#" className="text-white font-bold text-lg sm:text-xl tracking-wide hover:underline transition-colors drop-shadow-md">
          {tenant.is_bumper_game ? "bumper admin link" : "regular admin link"}
        </a>
      </div>
    </div>
  );
}
