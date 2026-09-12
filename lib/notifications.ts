import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

export type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  url: string | null;
  read_at: string | null;
  created_at: string;
};

/**
 * The in-app inbox behind the bell in every dashboard topbar — separate
 * from email (lib/email) and from lib/notify.ts (which only routes public
 * form submissions to office staff). Writes always go through the
 * service-role client since there's deliberately no insert policy for the
 * authenticated role — a notification always comes from server-side logic
 * that already decided who should see it, never from a client request.
 */
export async function notifyUser(opts: {
  organizationId: string;
  userId: string;
  title: string;
  body?: string;
  url?: string;
  type?: string;
}): Promise<void> {
  const admin = createServiceRoleClient();
  await admin.from("notifications").insert({
    organization_id: opts.organizationId,
    user_id: opts.userId,
    title: opts.title,
    body: opts.body ?? null,
    url: opts.url ?? null,
    type: opts.type ?? "general",
  });
}

/** Same notification to several people at once (e.g. everyone with a role). */
export async function notifyUsers(
  organizationId: string,
  userIds: string[],
  opts: { title: string; body?: string; url?: string; type?: string },
): Promise<void> {
  if (userIds.length === 0) return;
  const admin = createServiceRoleClient();
  await admin.from("notifications").insert(
    userIds.map((userId) => ({
      organization_id: organizationId,
      user_id: userId,
      title: opts.title,
      body: opts.body ?? null,
      url: opts.url ?? null,
      type: opts.type ?? "general",
    })),
  );
}

/**
 * RLS-scoped read for the signed-in user's own bell — safe to call from
 * any layout regardless of workspace, since `notifications own read`
 * already limits rows to `user_id = auth.uid()`.
 */
export async function getMyNotifications(limit = 20): Promise<{ notifications: NotificationRow[]; unreadCount: number }> {
  const supabase = await createClient();
  const [{ data }, { count }] = await Promise.all([
    supabase
      .from("notifications")
      .select("id, type, title, body, url, read_at, created_at")
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null),
  ]);
  return { notifications: data ?? [], unreadCount: count ?? 0 };
}
