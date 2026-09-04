"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationId, getUserPermissions } from "@/lib/auth/session";
import { createInvitedMember } from "@/lib/members/invite";
import type { ActionState } from "@/app/(public)/actions";

/**
 * Approving a "request to join" submission provisions a real member
 * account — same invite path admin/people uses by hand — and marks the
 * submission approved so it drops out of the pending queue. Visible to
 * whoever can already see this screen (people.write): church_admin,
 * super_admin, and now pastor.
 */
export async function approveMembershipRequest(submissionId: string): Promise<ActionState> {
  const organizationId = await getOrganizationId();
  const permissions = organizationId ? await getUserPermissions(organizationId) : new Set<string>();
  if (!organizationId || !permissions.has("people.write")) {
    return { status: "error", message: "You don't have permission to approve membership requests." };
  }

  const supabase = await createClient();
  const { data: submission } = await supabase
    .from("contact_submissions")
    .select("id, kind, status, first_name, last_name, email, phone")
    .eq("organization_id", organizationId)
    .eq("id", submissionId)
    .maybeSingle();

  if (!submission || submission.kind !== "membership_request") {
    return { status: "error", message: "This isn't a pending membership request." };
  }
  if (submission.status === "approved") {
    return { status: "success", message: "Already approved." };
  }
  if (!submission.first_name || !submission.last_name || !submission.email) {
    return { status: "error", message: "This request is missing a name or email — it can't be approved as-is." };
  }

  const {
    data: { user: actor },
  } = await supabase.auth.getUser();

  const result = await createInvitedMember({
    organizationId,
    actorId: actor?.id ?? null,
    email: submission.email,
    firstName: submission.first_name,
    lastName: submission.last_name,
    phone: submission.phone,
    membershipStatus: "member",
  });
  if (!result.ok) return { status: "error", message: result.message };

  await supabase
    .from("contact_submissions")
    .update({ status: "approved", assigned_to: actor?.id ?? null })
    .eq("organization_id", organizationId)
    .eq("id", submissionId);

  revalidatePath("/admin/visitors");
  revalidatePath("/admin/people");
  return { status: "success", message: `Approved — an invitation was sent to ${result.email}.` };
}

export async function declineMembershipRequest(submissionId: string): Promise<void> {
  const organizationId = await getOrganizationId();
  const permissions = organizationId ? await getUserPermissions(organizationId) : new Set<string>();
  if (!organizationId || !permissions.has("people.write")) return;

  const supabase = await createClient();
  await supabase
    .from("contact_submissions")
    .update({ status: "declined" })
    .eq("organization_id", organizationId)
    .eq("id", submissionId);
  revalidatePath("/admin/visitors");
}
