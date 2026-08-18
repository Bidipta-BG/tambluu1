import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-side Supabase client for use in Server Components and Route Handlers.
 *
 * Reads the user's session from Next.js cookies so the server can make
 * authenticated requests on behalf of the user.
 *
 * Usage:
 *   import { createClient } from "@/lib/supabase/server";
 *   const supabase = createClient();
 *   const { data: { session } } = await supabase.auth.getSession();
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: any[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // setAll is called from a Server Component where cookies can't be
            // mutated. Safe to ignore — the middleware will handle session refresh.
          }
        },
      },
    },
  );
}
