import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationId, isSuperAdmin } from "@/lib/auth/session";
import { AccessDenied } from "@/components/access-denied";
import { InviteForm } from "./invite-form";

export const metadata: Metadata = { title: "Roles & Staff" };

/**
 * Invitation-only, on purpose — this page hands someone their first staff
 * role. Changing or removing a role someone already has happens on
 * People instead (right next to everything else known about them), so
 * there's exactly one place to look for "what can this person do right
 * now" rather than two screens that can disagree.
 */
export default async function AdminRolesPage() {
  const organizationId = await getOrganizationId();
  // Deliberately checks the actual role, not the roles.manage permission —
  // only super_admin (you) sees or grants roles, full stop, even if a
  // future role were ever seeded with that permission by mistake.
  const allowed = organizationId ? await isSuperAdmin(organizationId) : false;
  if (!allowed) return <AccessDenied />;

  const supabase = await createClient();
  const [{ data: roles }, { data: profiles }] = await Promise.all([
    supabase.from("roles").select("id, name, code").eq("organization_id", organizationId ?? "").order("name"),
    supabase.from("profiles").select("id, first_name, last_name, email").eq("organization_id", organizationId ?? "").order("first_name"),
  ]);
  const members = (profiles ?? []).map((p) => ({
    id: p.id,
    name: `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || p.email || "Unnamed",
    email: p.email,
  }));

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1>Roles &amp; Staff</h1>
          <p>Invitation-only staff access — never make account creation equal church membership.</p>
        </div>
      </div>

      <div className="panel">
        <h2>Invite or assign staff</h2>
        <InviteForm roles={roles ?? []} members={members} />
        <p className="form-note">If the email already belongs to a member, the role is added immediately and they&apos;re emailed about it. New people receive a branded invitation to set their password.</p>
      </div>

      <div className="panel">
        <h2>Changing an existing role</h2>
        <p>
          To change or remove a staff role someone already has, go to <Link href="/admin/people">People</Link> — every
          person&apos;s role now lives right there next to their profile, alongside membership status and account access.
        </p>
      </div>
    </>
  );
}
