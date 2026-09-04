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

  if (!code) {
    console.error("[auth/callback] no code param on the request", { next, params: Object.fromEntries(searchParams) });
    return NextResponse.redirect(`${SITE_URL}/login?error=no_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    // Almost always: the link was opened on a different browser/device than
    // the one that requested it (the PKCE verifier Supabase needs lives in
    // a cookie on that first device), or the link is expired/already used.
    console.error("[auth/callback] exchangeCodeForSession failed", error.message);
    return NextResponse.redirect(`${SITE_URL}/login?error=exchange_failed`);
  }

  // Belt-and-suspenders: confirm the session actually landed before telling
  // the browser it's safe to go on, so a silent cookie-propagation problem
  // shows up as a clear error code instead of a bounce back to /login with
  // no explanation.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    console.error("[auth/callback] exchange reported success but getUser() found no session");
    return NextResponse.redirect(`${SITE_URL}/login?error=no_session`);
  }

  return NextResponse.redirect(`${SITE_URL}${next}`);
}
