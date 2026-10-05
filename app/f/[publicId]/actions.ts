"use server";

import { getCurrentProfile } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { fullName } from "@/lib/members/name";
import { findEditableResponse, hashToken, loadFormByPublicId, submitResponse, type ResponseRow, type Respondent, type SubmitResult } from "@/lib/forms/server";
import { definitionOf } from "@/lib/forms/server";

export type SubmitFormResult = (Extract<SubmitResult, { ok: true }> & { preview?: boolean }) | Extract<SubmitResult, { ok: false }>;

type Payload = {
  answers: Record<string, unknown>;
  email?: string;
  receipt?: boolean;
  uploadSession?: string;
  editToken?: string | null;
  editOwn?: boolean;
  /** Which of their own responses a signed-in member is changing. */
  editResponseId?: string | null;
  inviteToken?: string | null;
  /** Honeypot: only automated spam fills it in. */
  website?: string;
  startedAt?: number;
};

const MAX_PAYLOAD = 2_000_000;
const MIN_HUMAN_MS = 2500;

export async function submitForm(publicId: string, payload: Payload): Promise<SubmitFormResult> {
  try {
    if (!payload || typeof payload !== "object" || !payload.answers || typeof payload.answers !== "object") return { ok: false, error: "Please check your answers and try again." };
    if (JSON.stringify(payload.answers).length > MAX_PAYLOAD) return { ok: false, error: "That response is too large to send." };
    // Spam: answer it as if it worked, store nothing.
    const elapsed = Date.now() - Number(payload.startedAt || 0);
    if (String(payload.website ?? "").trim() || (Number(payload.startedAt) > 0 && elapsed >= 0 && elapsed < MIN_HUMAN_MS)) {
      return { ok: true, responseId: "", editToken: null, quiz: null, scorePending: false };
    }

    const form = await loadFormByPublicId(publicId);
    if (!form) return { ok: false, error: "This form no longer exists." };
    const { settings } = definitionOf(form);

    const profile = await getCurrentProfile();
    let respondent: Respondent = profile && profile.organization_id === form.organization_id
      ? { profileId: profile.id, authUserId: profile.auth_user_id, name: fullName(profile) || null, email: profile.email ?? null }
      : { profileId: null, authUserId: null, name: null, email: null };

    // An emailed invitation answers as the person it was sent to.
    let assignmentId: string | null = null;
    if (payload.inviteToken) {
      if (!/^[A-Za-z0-9_-]{43}$/.test(payload.inviteToken)) return { ok: false, error: "This invitation link isn't valid." };
      const db = createServiceRoleClient();
      const { data: assignment } = await db.from("form_assignments").select("id, form_id, recipient_profile_id, submitted_at, expires_at").eq("token_hash", hashToken(payload.inviteToken)).maybeSingle();
      if (!assignment || assignment.form_id !== form.id) return { ok: false, error: "This invitation link isn't valid." };
      if (assignment.submitted_at) return { ok: false, error: "This invitation has already been answered." };
      if (new Date(assignment.expires_at) < new Date()) return { ok: false, error: "This invitation has expired. Please ask the church office for a new link." };
      const { data: invitee } = await db.from("profiles").select("id, auth_user_id, first_name, last_name, email").eq("id", assignment.recipient_profile_id).maybeSingle();
      if (invitee) respondent = { profileId: invitee.id, authUserId: invitee.auth_user_id, name: fullName(invitee) || null, email: invitee.email ?? null };
      assignmentId = assignment.id;
    } else if (respondent.profileId) {
      // A member who was invited but opened the form another way still
      // counts as having answered the invitation.
      const { data: pending } = await createServiceRoleClient()
        .from("form_assignments")
        .select("id")
        .eq("form_id", form.id)
        .eq("recipient_profile_id", respondent.profileId)
        .is("submitted_at", null)
        .gt("expires_at", new Date().toISOString())
        .limit(1)
        .maybeSingle();
      assignmentId = pending?.id ?? null;
    }

    // Changing an earlier response: by its private link, or the member's own.
    let editing: ResponseRow | null = null;
    if (payload.editOwn && payload.editResponseId && respondent.profileId) {
      if (!/^[0-9a-f-]{36}$/.test(payload.editResponseId)) return { ok: false, error: "That response can't be found any more." };
      const { data } = await createServiceRoleClient().from("form_responses").select("*").eq("form_id", form.id).eq("id", payload.editResponseId).eq("respondent_profile_id", respondent.profileId).maybeSingle();
      if (!data) return { ok: false, error: "That response can't be found any more." };
      if (!settings.allowEdit) return { ok: false, error: "Responses to this form can't be changed after they're sent." };
      editing = data as unknown as ResponseRow;
    } else if (payload.editToken || payload.editOwn) {
      editing = await findEditableResponse(form, { editToken: payload.editToken ?? null, profileId: payload.editOwn ? respondent.profileId : null });
      if (!editing) return { ok: false, error: "That response can't be found any more." };
      if (payload.editOwn && editing.respondent_profile_id !== respondent.profileId) return { ok: false, error: "That response can't be found any more." };
      if (!settings.allowEdit) return { ok: false, error: "Responses to this form can't be changed after they're sent." };
    }

    return await submitResponse({
      form,
      raw: payload.answers,
      respondent,
      typedEmail: payload.email ?? null,
      wantsReceipt: Boolean(payload.receipt),
      uploadSession: typeof payload.uploadSession === "string" ? payload.uploadSession : null,
      assignmentId,
      editing,
    });
  } catch (error) {
    console.error("[forms] submit failed:", error instanceof Error ? error.message : error);
    return { ok: false, error: "Something went wrong sending your response. Please try again." };
  }
}
