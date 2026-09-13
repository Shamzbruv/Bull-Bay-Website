/** Deterministic home for assigned roles. Permissions still authorize each operation. */
export function workspaceForRoles(codes: Set<string>): "admin" | "pastor" | "member" {
  if (codes.has("super_admin")) return "admin";
  if (codes.has("pastor") || codes.has("pastoral_care_team")) return "pastor";
  if ([...codes].some(code => !["member", "group_leader"].includes(code))) return "admin";
  return "member";
}

export function safeNextPath(value: string | null | undefined, fallback = "/workspace") {
  return value && /^\/(?!\/)/.test(value) && !/[\\\r\n]/.test(value) ? value : fallback;
}
