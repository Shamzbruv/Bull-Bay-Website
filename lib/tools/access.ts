import { getCurrentProfile, getOrganizationId } from "@/lib/auth/session";
import { getWorkspaceAccess } from "@/lib/auth/workspace";

/**
 * Who may open the church tools (Live Countdown control panel, Quiz Night):
 * anyone whose workspace is Church Admin, i.e. every staff role, plus the
 * super administrator. Pastors and members are turned away. The screens
 * those tools drive (sanctuary TVs, OBS overlays, players' buzzer phones)
 * stay open to everyone, as they always were.
 *
 * A super administrator previewing another role gets that role's answer,
 * like everywhere else in the preview.
 */
export type ToolsAccess = "admin" | "signed-out" | "change-password" | "forbidden";

export async function churchToolsAccess(): Promise<ToolsAccess> {
  const profile = await getCurrentProfile();
  if (!profile) return "signed-out";
  if (profile.must_change_password) return "change-password";
  const organizationId = await getOrganizationId();
  if (!organizationId || profile.organization_id !== organizationId) return "forbidden";
  const access = await getWorkspaceAccess(organizationId);
  return access.home === "admin" ? "admin" : "forbidden";
}

/** The response for a page visit that isn't allowed in. */
export function toolsPageDenied(access: Exclude<ToolsAccess, "admin">, path: string, toolName: string): Response {
  if (access === "signed-out") return redirect(`/login?next=${encodeURIComponent(path)}`);
  if (access === "change-password") return redirect("/auth/update-password");
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${toolName}</title><style>body{font-family:system-ui,sans-serif;background:#f6f7f9;color:#1d2433;display:grid;place-items:center;min-height:100vh;margin:0;padding:16px}
main{max-width:28rem;background:#fff;border-radius:12px;padding:28px;box-shadow:0 1px 3px rgba(0,0,0,.08)}h1{font-size:1.25rem;margin:0 0 .5rem}a{color:#1f5f9f}
@media (prefers-color-scheme:dark){body{background:#12151c;color:#e6e9ef}main{background:#1b202a}a{color:#8cc0f5}}</style></head>
<body><main><h1>${toolName} is for church admins</h1><p>Your account doesn't have admin access. If you help run services, ask the church administrator to give you a staff role.</p>
<p><a href="/workspace">Back to my church</a></p></main></body></html>`;
  return new Response(html, { status: 403, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store" } });
}

/** For the tools' own API calls: null when allowed, else the refusal. The
 *  control panel sends the operator to sign in on AUTH_REQUIRED. */
export async function toolsApiDenied(): Promise<Response | null> {
  const access = await churchToolsAccess();
  if (access === "admin") return null;
  if (access === "forbidden") return Response.json({ error: "Church admins only." }, { status: 403 });
  return Response.json({ error: "Please sign in again.", code: "AUTH_REQUIRED" }, { status: 401 });
}

/** Relative Location, so the redirect stays on whichever host the visitor
 *  used (the site sits behind Railway's proxy). */
function redirect(location: string) {
  return new Response(null, { status: 307, headers: { Location: location, "Cache-Control": "private, no-store" } });
}
