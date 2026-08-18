import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const gameId = searchParams.get('gameId');

    if (!tenantId || !gameId) {
      return NextResponse.json({ error: 'Missing tenantId or gameId' }, { status: 400 });
    }

    const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api/starttambola';
    const baseUrl = backendUrl.replace(/\/$/, '');

    // Fetch both state and current game in parallel.
    // We use cache: 'no-store' to bypass Next.js internal Data Cache. 
    // The route itself is protected by the Edge Cache (Cache-Control headers below).
    const [stateResponse, currentResponse] = await Promise.all([
      fetch(`${baseUrl}/tenants/${tenantId}/games/${gameId}/state`, {
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store'
      }),
      fetch(`${baseUrl}/tenants/${tenantId}/games/current`, {
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store'
      })
    ]);

    if (!stateResponse.ok) {
      const errText = await stateResponse.text();
      console.error(`[live-state] Backend state error text:`, errText);
      throw new Error(`Backend state returned ${stateResponse.status}: ${errText}`);
    }

    const stateJson = await stateResponse.json();
    const stateData = stateJson?.data ?? stateJson;

    let currentData = null;
    
    if (currentResponse.ok) {
      const cJson = await currentResponse.json();
      currentData = cJson?.data ?? cJson;
    }

    // Fetch tickets and dividends to keep the booking screen in sync during the scheduled phase
    let ticketsData = null;
    let dividendsData = null;
    
    // We always want to fetch dividends for the requested gameId
    const { createClient } = await import("@supabase/supabase-js");
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const { data: divData } = await supabaseAdmin
      .from("dividends")
      .select("*")
      .eq("game_id", gameId)
      .order("id", { ascending: true });
      
    if (divData) {
      dividendsData = divData.map((d: any) => ({ ...d, is_active: d.active }));
    }
    
    // Fetch tickets only if the state says it's scheduled
    if (stateData?.status === 'scheduled') {
      const { data: tixData } = await supabaseAdmin
        .from("tickets")
        .select("*")
        .eq("game_id", gameId)
        .order("ticket_number", { ascending: true });
        
      if (tixData) {
        ticketsData = tixData.map((t: any) => ({
          ...t,
          grid: typeof t.grid === 'string' ? JSON.parse(t.grid) : t.grid
        }));
      }
    }

    const payload = {
      ...stateData,
      currentGame: currentData,
      tickets: ticketsData,
      dividends: dividendsData,
    };

    // Return to the client with Edge Cache headers
    const headers = new Headers();
    headers.set('Cache-Control', 'public, max-age=0, s-maxage=3, stale-while-revalidate=2');
    headers.set('Content-Type', 'application/json');

    return new NextResponse(JSON.stringify(payload), {
      status: 200,
      headers,
    });
  } catch (error: any) {
    console.error('[live-state] API route error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
