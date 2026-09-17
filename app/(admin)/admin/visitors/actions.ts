"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationId, getUserPermissions } from "@/lib/auth/session";
import { createInvitedMember } from "@/lib/members/invite";
import { isMembershipRequest } from "@/lib/members/membership-request";
import { scoreSubmission } from "@/lib/spam";
import type { ActionState } from "@/app/(public)/actions";

/**
 * Approving a "request to join" submission provisions a real member
 * account — same invite path admin/people uses by hand — and marks the
 * submission closed so it drops out of the pending queue. Visible to
 * whoever can already see this screen (people.write): church_admin,
 * super_admin, and (once its migration is applied) pastor.
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
    .select("id, interest, status, assigned_to, first_name, last_name, email, phone")
    .eq("organization_id", organizationId)
    .eq("id", submissionId)
    .maybeSingle();

  if (!submission || !isMembershipRequest(submission.interest)) {
    return { status: "error", message: "This isn't a pending membership request." };
  }
  if (submission.status === "closed" && submission.assigned_to) {
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

  // status='closed' + assigned_to set is how "approved" is told apart from
  // "declined" (also status='closed', but assigned_to stays null) — see
  // lib/members/membership-request.ts for why.
  await supabase
    .from("contact_submissions")
    .update({ status: "closed", assigned_to: actor?.id ?? null })
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
    .update({ status: "closed", assigned_to: null })
    .eq("organization_id", organizationId)
    .eq("id", submissionId);
  revalidatePath("/admin/visitors");
}

/**
 * Permanently remove a single submission. Spam is the reason this exists,
 * but it is a plain delete — staff may also want to clear a duplicate or a
 * message someone asked to have removed. Scoped by organization as well as
 * id so a stray id from another church's row can never match, and the
 * table's own "staff delete" RLS policy (people.write) is the real gate.
 */
export async function deleteSubmission(submissionId: string): Promise<ActionState> {
  const organizationId = await getOrganizationId();
  const permissions = organizationId ? await getUserPermissions(organizationId) : new Set<string>();
  if (!organizationId || !permissions.has("people.write")) {
    return { status: "error", message: "You don't have permission to delete submissions." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("contact_submissions")
    .delete()
    .eq("organization_id", organizationId)
    .eq("id", submissionId);

  if (error) return { status: "error", message: "We couldn't delete that. Please try again." };

  revalidatePath("/admin/visitors");
  return { status: "success", message: "Deleted." };
}

/**
 * Clear out everything currently flagged as spam in one action.
 *
 * The scoring is re-run here on the server rather than trusting a list of
 * ids sent by the browser — that way what gets deleted is exactly what the
 * same rule flags, and a tampered-with request cannot turn "delete the
 * spam" into "delete the connection cards". A pending request to join is
 * never deleted regardless of score: approving those creates someone's
 * membership, so they only ever leave this screen by a human decision.
 */
export async function deleteFlaggedSpam(): Promise<ActionState> {
  const organizationId = await getOrganizationId();
  const permissions = organizationId ? await getUserPermissions(organizationId) : new Set<string>();
  if (!organizationId || !permissions.has("people.write")) {
    return { status: "error", message: "You don't have permission to delete submissions." };
  }

  const supabase = await createClient();
  const { data: rows, error: readError } = await supabase
    .from("contact_submissions")
    .select("id, first_name, last_name, email, phone, interest, message")
    .eq("organization_id", organizationId);

  if (readError) return { status: "error", message: "We couldn't load the submissions. Please try again." };

  const spamIds = (rows ?? [])
    .filter((row) => !isMembershipRequest(row.interest))
    .filter(
      (row) =>
        scoreSubmission({
          firstName: row.first_name,
          lastName: row.last_name,
          email: row.email,
          phone: row.phone,
          interest: row.interest,
          message: row.message,
        }).verdict === "spam",
    )
    .map((row) => row.id);

  if (spamIds.length === 0) return { status: "success", message: "There was no spam to delete." };

  const { error } = await supabase
    .from("contact_submissions")
    .delete()
    .eq("organization_id", organizationId)
    .in("id", spamIds);

  if (error) return { status: "error", message: "We couldn't delete those. Please try again." };

  revalidatePath("/admin/visitors");
  return {
    status: "success",
    message: `Deleted ${spamIds.length} spam ${spamIds.length === 1 ? "submission" : "submissions"}.`,
  };
}
