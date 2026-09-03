import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/member", "/pastor", "/admin"];

/**
 * Refreshes the Supabase auth session on every request (required by the SSR
 * cookie pattern) and redirects unauthenticated visitors away from protected
 * route groups. Fine-grained role/permission checks happen in each route
 * group's layout — this only handles "logged in at all".
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some((prefix) => path.startsWith(prefix));

  if (isProtected && !user) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("next", path);
    return NextResponse.redirect(redirectUrl);
  }

  // Admin-issued temporary passwords must be replaced before the member can
  // reach anything else — checked here so it's enforced everywhere, not
  // just wherever a page remembers to check.
  if (isProtected && user && path !== "/auth/update-password") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("must_change_password")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    if (profile?.must_change_password) {
      return NextResponse.redirect(new URL("/auth/update-password", request.url));
    }
  }

  return response;
}
