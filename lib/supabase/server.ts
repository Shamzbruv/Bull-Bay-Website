import { createServerClient } from "@supabase/ssr";
import { createClient as createRawClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "./types";

/**
 * Server Component / Route Handler / Server Action Supabase client.
 * Reads and writes the auth session via cookies (SSR pattern), respects RLS
 * as the calling user's JWT. Never used with the service-role key.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component that can't set cookies — the
            // middleware refresh path handles session persistence instead.
          }
        },
      },
    },
  );
}

/**
 * Service-role client for privileged, server-only operations that must
 * bypass RLS deliberately (e.g. processing a verified payment webhook,
 * issuing a signed download URL after checking an entitlement, sending a
 * staff invitation). Only ever import this inside route handlers / server
 * actions that run on the server — never in a Client Component, and never
 * re-exported to the browser.
 */
export function createServiceRoleClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set — privileged server operation unavailable.",
    );
  }
  return createRawClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
