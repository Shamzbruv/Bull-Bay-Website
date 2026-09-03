import { createServiceRoleClient } from "@/lib/supabase/server";
import { sendMail } from "@/lib/email/resend";

/**
 * Server-only "who should hear about this" helpers, used to route public
 * form submissions (contact, prayer, etc.) to real people by email —
 * separate from the in-app dashboards, which already show this data to
 * whoever has the right permission. Uses the service-role client since
 * this runs after the form's own insert, purely to look up recipients;
 * it never returns data to the client.
 */

async function getRoleHolderEmails(organizationId: string, roleCodes: string[]): Promise<string[]> {
  const admin = createServiceRoleClient();
  const { data: roles } = await admin.from("roles").select("id").eq("organization_id", organizationId).in("code", roleCodes);
  const roleIds = (roles ?? []).map((r) => r.id);
  if (roleIds.length === 0) return [];

  const { data: userRoles } = await admin.from("user_roles").select("user_id").eq("organization_id", organizationId).in("role_id", roleIds);
  const userIds = [...new Set((userRoles ?? []).map((r) => r.user_id))];
  if (userIds.length === 0) return [];

  const { data: profiles } = await admin.from("profiles").select("email").in("auth_user_id", userIds);
  return [...new Set((profiles ?? []).map((p) => p.email).filter((e): e is string => Boolean(e)))];
}

async function getPastorEmail(organizationId: string): Promise<string | null> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("pastoral_team_members")
    .select("profiles(email)")
    .eq("organization_id", organizationId)
    .eq("is_pastor", true)
    .eq("is_active", true)
    .maybeSingle();
  const profile = data?.profiles as unknown as { email: string | null } | null;
  return profile?.email ?? null;
}

/**
 * The church office's inbox: the secretary team, falling back to
 * church_admin/super_admin so nothing goes unseen before a secretary
 * account has been set up — plus the pastor, always.
 */
export async function notifyOffice(organizationId: string, opts: { subject: string; html: string }): Promise<{ sent: number; total: number }> {
  const [officeEmails, pastorEmail] = await Promise.all([
    getRoleHolderEmails(organizationId, ["secretary", "church_admin", "super_admin"]),
    getPastorEmail(organizationId),
  ]);

  const recipients = new Set(officeEmails);
  if (pastorEmail) recipients.add(pastorEmail);
  if (recipients.size === 0) return { sent: 0, total: 0 };

  const results = await Promise.allSettled([...recipients].map((to) => sendMail({ to, subject: opts.subject, html: opts.html })));
  return { sent: results.filter((r) => r.status === "fulfilled" && r.value.sent).length, total: recipients.size };
}
