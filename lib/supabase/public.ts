import { createClient as createRawClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Read-only public-content client that never touches cookies(). Every query
 * `lib/data/public.ts` runs through this only ever reads data RLS already
 * grants to the `anon` role (published sermons/events, active products,
 * etc.) — it's never used for anything scoped to a signed-in user.
 *
 * This matters for more than tidiness: calling next/headers' cookies()
 * anywhere in a route's render tree forces Next.js to skip static/ISR
 * caching for that whole route. Using this client instead of the
 * cookie-bound one in lib/supabase/server.ts is what lets pages like
 * /sermons or /shop be served from cache instead of hitting Supabase on
 * every single request. Pages that need to know *who* is asking (member
 * portal, cart, give) still use the cookie-bound client and stay dynamic.
 */
export function createPublicClient() {
  return createRawClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
}
