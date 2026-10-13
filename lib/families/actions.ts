"use server";
import { z } from "zod";
import { officeContext } from "@/lib/office/context";
import { officeAction } from "@/lib/office/action";
import { householdInput, linkInput } from "./model";
import type { ActionState } from "@/app/(public)/actions";
import type { Json } from "@/lib/supabase/types";
import { rateLimit } from "@/lib/rate-limit";
const text = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
async function change(
  command: string,
  payload: Record<string, Json | undefined>,
) {
  const { db, org, user } = await officeContext();
  const { error } = await db.rpc("manage_family", {
    command,
    org,
    actor: user.id,
    payload,
  });
  if (error)
    throw new Error(
      error.code === "P0001"
        ? error.message
        : "The family change could not be saved. Refresh and try again.",
    );
}
export async function saveFamilyHousehold(_: ActionState, form: FormData) {
  return officeAction(async () => {
    const parsed = householdInput.safeParse({
      name: text(form, "name"),
      description: text(form, "description"),
    });
    if (!parsed.success)
      throw new Error(
        parsed.error.issues[0]?.message ?? "Check the family information.",
      );
    const id = text(form, "household_id");
    if (id) z.uuid().parse(id);
    const version = text(form, "updated_at");
    await change("save_household", {
      ...parsed.data,
      household_id: id,
      new: text(form, "new") === "true",
      ...(version ? { updated_at: version } : {}),
    });
    return "Household saved. Your family views now use the updated information.";
  });
}
export async function requestFamilyRelationship(
  _: ActionState,
  form: FormData,
) {
  return officeAction(async () => {
    const input = linkInput.safeParse({
      kind: text(form, "kind"),
      notes: text(form, "notes"),
      email: text(form, "email"),
      sourceId: text(form, "source_id"),
      targetId: text(form, "target_id"),
    });
    if (!input.success)
      throw new Error(
        input.error.issues[0]?.message ?? "Check the relationship information.",
      );
    const { user } = await officeContext();
    if (!rateLimit(`family-request:${user.id}`, 15, 60 * 60 * 1000).allowed)
      throw new Error(
        "You have sent several family requests. Please try later or contact the church office.",
      );
    if (!input.data.targetId && !input.data.email)
      throw new Error("Enter your relative’s church account email.");
    await change("request_relationship", {
      kind: input.data.kind,
      notes: input.data.notes,
      email: input.data.email,
      source_id: input.data.sourceId,
      target_id: input.data.targetId,
      confirmed: text(form, "confirmed") === "yes",
    });
    if (
      text(form, "confirmed") === "yes" &&
      (await officeContext()).permissions.has("people.write")
    )
      return "Family relationship recorded. The confirmed connection now appears in the family map.";
    return "Request received. A matching church record will receive a confirmation request. Relatives without an account can be confirmed by the church office.";
  });
}
export async function inviteHouseholdMember(_: ActionState, form: FormData) {
  return officeAction(async () => {
    const email = z.email().parse(text(form, "email"));
    const household = text(form, "household_id");
    if (household) z.uuid().parse(household);
    const { user } = await officeContext();
    if (!rateLimit(`household-invite:${user.id}`, 15, 60 * 60 * 1000).allowed)
      throw new Error("Please wait before sending more invitations.");
    await change("invite_household", { email, household_id: household });
    return "Invitation received. If this email matches a church record, the person can review it in My Household.";
  });
}
export async function reviewFamilyRequest(_: ActionState, form: FormData) {
  return officeAction(async () => {
    const id = z.uuid().parse(text(form, "id"));
    const updated_at = z.iso
      .datetime({ offset: true })
      .parse(text(form, "updated_at"));
    const decision = text(form, "decision");
    const invitation = text(form, "type") === "invitation";
    if (
      !(
        invitation
          ? ["accepted", "declined", "cancelled"]
          : ["confirmed", "declined", "removed"]
      ).includes(decision)
    )
      throw new Error("Choose a valid decision.");
    if (
      (decision === "confirmed" || decision === "accepted") &&
      text(form, "consent") !== "yes"
    )
      throw new Error(
        "Confirm that you agree to this family connection or household change.",
      );
    await change(invitation ? "review_invitation" : "review_relationship", {
      id,
      updated_at,
      decision,
    });
    return decision === "accepted"
      ? "You have joined the household."
      : decision === "confirmed"
        ? "Family connection confirmed. It now appears in the family map."
        : "Family request updated.";
  });
}
export async function assignFamilyMember(_: ActionState, form: FormData) {
  return officeAction(async () => {
    const profile_id = z.uuid().parse(text(form, "profile_id"));
    const updated_at = z.iso
      .datetime({ offset: true })
      .parse(text(form, "updated_at"));
    const household_id = text(form, "household_id");
    if (household_id) z.uuid().parse(household_id);
    await change("assign_member", { profile_id, updated_at, household_id });
    return "Household membership updated.";
  });
}
