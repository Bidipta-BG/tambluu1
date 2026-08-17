import { headers } from "next/headers";
import { api } from "@/lib/api";
import type { PosterTemplate, Game, Tenant } from "@/types";
import PosterMakerClient from "./_components/PosterMakerClient";

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function fetchTemplates(): Promise<PosterTemplate[]> {
  try {
    return await api.get<PosterTemplate[]>("/poster-templates", {
      next: { revalidate: 300 }, // Cache templates for 5 mins
    });
  } catch (e) {
    console.error("Failed to fetch poster templates:", e);
    return [];
  }
}

async function fetchCurrentGame(tenantId: string): Promise<Game | null> {
  try {
    return await api.get<Game>(`/tenants/${tenantId}/games/current`, {
      next: { revalidate: 0 },
    });
  } catch (e) {
    return null;
  }
}

async function fetchTenant(tenantId: string): Promise<Tenant | null> {
  try {
    return await api.get<Tenant>(`/tenants/${tenantId}`, {
      next: { revalidate: 3600 },
    });
  } catch (e) {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function PosterMakerPage() {
  const tenantId = headers().get("x-tenant-id") ?? "";
  
  const [templates, currentGame, tenant] = await Promise.all([
    fetchTemplates(),
    fetchCurrentGame(tenantId),
    fetchTenant(tenantId)
  ]);

  const tenantInfo = tenant ? { whatsappNumber: tenant.whatsappNumber } : undefined;

  return (
    <PosterMakerClient 
      initialTemplates={templates} 
      game={currentGame} 
      tenantInfo={tenantInfo} 
    />
  );
}
