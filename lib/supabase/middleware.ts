import { workspaceForRoles } from "@/lib/auth/roles";
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

  function redirectWithCookies(url: URL) {
    const result = NextResponse.redirect(url);
    for (const cookie of response.cookies.getAll()) result.cookies.set(cookie);
    return result;
  }

  if (isProtected && !user) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("next", path);
    return redirectWithCookies(redirectUrl);
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
      return redirectWithCookies(new URL("/auth/update-password", request.url));
    }
  }

  if (user && (isProtected || request.method !== "GET")) {
    const { data: grants, error } = await supabase.from("user_roles").select("roles(code)").eq("user_id", user.id);
    if (error) return NextResponse.json({ error: "Access could not be verified. Please retry." }, { status: 503 });
    const roles = new Set((grants ?? []).flatMap(g => {
      const role = g.roles as unknown as { code: string } | null;
      return role ? [role.code] : [];
    }));
    const isSuper = roles.has("super_admin");
    const preview = request.cookies.get("workspace_preview")?.value;
    if (isSuper && preview && preview !== "super_admin" && path !== "/auth/signout" && !["GET", "HEAD", "OPTIONS"].includes(request.method)) {
      return NextResponse.json({ error: "Role preview is read-only. Return to Super Administrator to make changes." }, { status: 403 });
    }
    const home = workspaceForRoles(roles);
    if (!isSuper && ((path === "/member" && home !== "member") || (path.startsWith("/admin") && home === "member") || (path === "/admin" && home === "pastor") || (path.startsWith("/pastor") && home !== "pastor"))) {
      return redirectWithCookies(new URL(`/${home}`, request.url));
    }
  }

  return response;
}
