import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/org";

/**
 * Completes the Supabase invite/recovery/magic-link sign-in and lands the
 * user where they started. Deliberately builds redirects from SITE_URL,
 * not `new URL(request.url).origin` — behind Railway's proxy, the request
 * Next.js sees here reports its own internal address (localhost:8080), so
 * building off it sent every one of these links back to a port nobody but
 * the container itself can reach.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/member";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${SITE_URL}${next}`);
    }
  }

  return NextResponse.redirect(`${SITE_URL}/login?error=auth_failed`);
}
