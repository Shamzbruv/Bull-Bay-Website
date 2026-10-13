"use server";

import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { getCurrentProfile, getOrganizationId } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { PAYMENT_URL } from "@/lib/payments/external";
import { revalidatePath } from "next/cache";
import { notifyOffice } from "@/lib/notify";
import { renderStaffNotificationEmail } from "@/lib/email/templates";
import { SITE_URL } from "@/lib/org";
import { MEMBERSHIP_REQUEST_MARKER } from "@/lib/members/membership-request";
import { checkFormShield, scoreSubmission, type ScorableSubmission } from "@/lib/spam";
import { callerIp, rateLimit } from "@/lib/rate-limit";
import { registrationInput } from "@/lib/events/registration";

// initialActionState moved to lib/action-state.ts — this file has "use
// server" and Next.js requires every export here to be an async function;
// a plain object constant isn't allowed (webpack enforces this even though
// Turbopack silently didn't). The type stays here since type exports are
// compiled away and never exist at runtime.
export type ActionState = { status: "idle" | "success" | "error"; message: string };

async function currentProfileId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, profileId: null };
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  return { user, profileId: profile?.id ?? null, profile };
}


/**
 * One gate in front of every public form. Returns null to let a submission
 * through, or a decision about why it should not be stored.
 *
 * A caught bot is told the same thing a real visitor is told. Showing it
 * "blocked as spam" would just tell whoever runs it which wording to
 * change, and these senders do iterate. Someone who has genuinely sent
 * several messages in an hour gets the truth instead, because they are a
 * person waiting on a reply.
 */
type Screening = { outcome: "allow" } | { outcome: "drop"; reason: string } | { outcome: "throttle" };

async function screenPublicSubmission(
  formData: FormData,
  submission: ScorableSubmission,
  form: string,
): Promise<Screening> {
  const shield = checkFormShield(formData);
  if (shield.blocked) {
    console.warn(`[spam] ${form}: dropped (${shield.reason})`);
    return { outcome: "drop", reason: shield.reason ?? "shield" };
  }

  // Set high on purpose. Jamaican mobile carriers put large numbers of
  // subscribers behind one address, so a whole congregation can share an
  // IP — a tight per-IP limit would lock out real visitors long before it
  // inconvenienced a spammer. This is a flood guard only; the honeypot,
  // the timing check and the content score are what actually stop spam.
  const ip = await callerIp();
  if (!rateLimit(`public-form:${ip}`, 12, 60 * 60 * 1000).allowed) {
    console.warn(`[spam] ${form}: rate limited ${ip}`);
    return { outcome: "throttle" };
  }

  const assessment = scoreSubmission(submission);
  if (assessment.verdict === "spam") {
    console.warn(`[spam] ${form}: dropped (score ${assessment.score}) ${assessment.reasons.join("; ")}`);
    return { outcome: "drop", reason: assessment.reasons.join("; ") };
  }

  return { outcome: "allow" };
}

const PRAYER_RECEIVED_MESSAGE =
  "Your prayer request has been received. Our prayer team will be standing with you.";
const CONNECTION_CARD_MESSAGE = "Thanks for reaching out! A member of our team will be in touch soon.";
const JOIN_REQUEST_MESSAGE =
  "Thank you! Your request has been sent to our pastor and team — we'll be in touch soon to welcome you in.";
const THROTTLED_MESSAGE =
  "You've already sent us a few messages — we have them, and someone will reply. Please try again a little later if you need to send another.";

export async function submitPrayerRequest(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const organizationId = await getOrganizationId();
  if (!organizationId) return { status: "error", message: "Something went wrong. Please try again." };

  const name = String(formData.get("name") || "").trim();
  const contact = String(formData.get("contact") || "").trim();
  const request = String(formData.get("request") || "").trim();
  const confidential = formData.get("confidential") === "on";

  if (!request) return { status: "error", message: "Please share your prayer request." };

  const supabase = await createClient();
  const { user, profileId } = await currentProfileId();

  // Signed-in members are never screened. This same action backs the
  // member prayer form, and a member's request is not a spam vector —
  // silently dropping one because it happened to contain a link would be
  // far worse than letting a rare bad one through to the prayer team.
  if (!user) {
    const screening = await screenPublicSubmission(formData, { firstName: name, email: contact, message: request }, "prayer");
    if (screening.outcome === "throttle") return { status: "error", message: THROTTLED_MESSAGE };
    if (screening.outcome === "drop") return { status: "success", message: PRAYER_RECEIVED_MESSAGE };
  }
  const { error } = await supabase.from("prayer_requests").insert({
    organization_id: organizationId,
    submitter_profile_id: profileId,
    submitter_name: name || null,
    submitter_contact: contact || (user?.email ?? null),
    request_body: request,
    visibility: confidential ? "confidential" : "prayer_team",
  });

  if (error) return { status: "error", message: "We couldn't send your request. Please try again." };

  // Metadata only, never the request itself — a prayer request marked
  // confidential should stay inside the properly access-controlled
  // dashboard, not get forwarded into whoever's inbox. This just makes
  // sure someone knows to go look.
  await notifyOffice(organizationId, {
    subject: confidential ? "A confidential prayer request was submitted" : "A new prayer request was submitted",
    html: renderStaffNotificationEmail({
      heading: "New prayer request",
      intro: confidential
        ? "Marked confidential — the full request is only visible in Pastoral Care."
        : "Open Pastoral Care to read and respond.",
      fields: [
        { label: "From", value: name || "Anonymous" },
        { label: "Contact", value: contact || user?.email || null },
        { label: "Confidential", value: confidential ? "Yes" : "No" },
      ],
      actionLabel: "Open Pastoral Care",
      actionUrl: `${SITE_URL}/pastor/care`,
    }),
  }).catch(() => {});

  return { status: "success", message: PRAYER_RECEIVED_MESSAGE };
}

export async function submitConnectionCard(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const organizationId = await getOrganizationId();
  if (!organizationId) return { status: "error", message: "Something went wrong. Please try again." };

  const firstName = String(formData.get("firstName") || "").trim();
  const lastName = String(formData.get("lastName") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const interest = String(formData.get("interest") || "").trim();
  const message = String(formData.get("message") || "").trim();

  if (!firstName || !lastName || !email) {
    return { status: "error", message: "Please fill in your name and email." };
  }

  const screening = await screenPublicSubmission(formData, { firstName, lastName, email, phone, interest, message }, "connection-card");
  if (screening.outcome === "throttle") return { status: "error", message: THROTTLED_MESSAGE };
  if (screening.outcome === "drop") return { status: "success", message: CONNECTION_CARD_MESSAGE };

  const supabase = await createClient();
  const { error } = await supabase.from("contact_submissions").insert({
    organization_id: organizationId,
    kind: "connection_card",
    first_name: firstName,
    last_name: lastName,
    email,
    phone: phone || null,
    interest: interest || null,
    message: message || null,
  });

  if (error) return { status: "error", message: "We couldn't send your message. Please try again." };

  await notifyOffice(organizationId, {
    subject: `New contact form message from ${firstName} ${lastName}`,
    html: renderStaffNotificationEmail({
      heading: "New contact form message",
      intro: "Someone reached out through the website — follow up soon.",
      fields: [
        { label: "Name", value: `${firstName} ${lastName}` },
        { label: "Email", value: email },
        { label: "Phone", value: phone || null },
        { label: "Interested in", value: interest || null },
        { label: "Message", value: message || null },
      ],
      actionLabel: "Open in the church platform",
      actionUrl: `${SITE_URL}/admin/visitors`,
    }),
  }).catch(() => {});

  return { status: "success", message: CONNECTION_CARD_MESSAGE };
}

/**
 * A non-member asking to join the church — distinct from the general
 * connection card: this one is a decisive "make me a member" ask, so it
 * shows up on admin/visitors with its own Approve/Decline actions, and
 * approving it provisions the applicant a real member login (see
 * lib/members/invite.ts) rather than just changing a status label.
 */
export async function submitMembershipRequest(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const organizationId = await getOrganizationId();
  if (!organizationId) return { status: "error", message: "Something went wrong. Please try again." };

  const firstName = String(formData.get("firstName") || "").trim();
  const lastName = String(formData.get("lastName") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const message = String(formData.get("message") || "").trim();

  if (!firstName || !lastName || !email) {
    return { status: "error", message: "Please fill in your name and email." };
  }

  const screening = await screenPublicSubmission(formData, { firstName, lastName, email, phone, message }, "join-request");
  if (screening.outcome === "throttle") return { status: "error", message: THROTTLED_MESSAGE };
  if (screening.outcome === "drop") return { status: "success", message: JOIN_REQUEST_MESSAGE };

  const supabase = await createClient();
  const { error } = await supabase.from("contact_submissions").insert({
    organization_id: organizationId,
    kind: "connection_card",
    first_name: firstName,
    last_name: lastName,
    email,
    phone: phone || null,
    interest: MEMBERSHIP_REQUEST_MARKER,
    message: message || null,
  });

  if (error) return { status: "error", message: "We couldn't send your request. Please try again." };

  await notifyOffice(organizationId, {
    subject: `${firstName} ${lastName} asked to join the church`,
    html: renderStaffNotificationEmail({
      heading: "New request to join the church",
      intro: "Review and approve from Visitor Follow-up — approving creates their member account and emails them an invitation.",
      fields: [
        { label: "Name", value: `${firstName} ${lastName}` },
        { label: "Email", value: email },
        { label: "Phone", value: phone || null },
        { label: "Message", value: message || null },
      ],
      actionLabel: "Review request",
      actionUrl: `${SITE_URL}/admin/visitors`,
    }),
  }).catch(() => {});

  return { status: "success", message: JOIN_REQUEST_MESSAGE };
}

export async function registerForEvent(eventId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = registrationInput.safeParse(Object.fromEntries(['isMember','guestName','guestEmail','guestPhone','quantity','attendees','requirements','notes','consent'].map(k => [k, String(formData.get(k) ?? '')])));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Check the information and try again." };
  const input = parsed.data;
  const [profile, org] = await Promise.all([getCurrentProfile(), getOrganizationId()]);
  if (!org) return { status: "error", message: "Registration is temporarily unavailable. Please contact the church office." };
  if (input.isMember === 'yes' && (!profile || profile.organization_id !== org)) return { status: "error", message: "Church members must sign in with their church account before registering." };
  if (profile?.membership_status === 'deceased') return { status: "error", message: "Please contact the church office about this member record." };
  if (!rateLimit(`event-registration:${await callerIp()}`, 20, 60 * 60 * 1000).allowed) return { status: "error", message: "Too many registration attempts. Please try again later or contact the church office." };
  const admin = createServiceRoleClient();
  const details = { attendees: input.attendees.split('\n').map(name => name.trim()).filter(Boolean), requirements: input.requirements, consent_at: new Date().toISOString() };
  const { data, error } = await admin.rpc('register_church_event', { org, event: eventId, person: profile?.organization_id === org ? profile.id : null, member: input.isMember === 'yes', contact_name: input.guestName, contact_email: input.guestEmail, contact_phone: input.guestPhone, party_size: input.quantity, details, additional_notes: input.notes });
  if (error) return { status: "error", message: error.code === 'P0001' ? error.message : "We couldn't complete your registration. Please contact the church office or try again." };
  const result = data as { id: string; created: boolean };
  if (!result.created) return { status: "success", message: "You are already registered for this event. Contact the church office if you need to change your details." };
  // The database transaction has already delivered the staff inbox alert.
  // Email is an additional channel and a mail failure must not lose registration.
  try {
    const { data: event } = await admin.from('events').select('title').eq('id', eventId).eq('organization_id', org).single();
    await notifyOffice(org, { subject: `Event registration — ${event?.title ?? 'Church event'}`, html: await renderStaffNotificationEmail({ heading: 'New event registration', fields: [
      { label: 'Event', value: event?.title ?? '' }, { label: 'Name', value: input.guestName }, { label: 'Email', value: input.guestEmail }, { label: 'Phone', value: input.guestPhone }, { label: 'Church member', value: input.isMember }, { label: 'Number attending', value: String(input.quantity) }, { label: 'Other attendees', value: input.attendees }, { label: 'Special requirements', value: input.requirements }, { label: 'Notes', value: input.notes },
    ], actionUrl: `${SITE_URL}/admin/events/${eventId}/registrations` }) });
  } catch { console.error('Event registration saved; supplementary office email unavailable.'); }
  revalidatePath('/events');
  revalidatePath('/admin/events');
  return { status: "success", message: "You're registered! Your details have been sent to the church office. We look forward to seeing you there." };
}

export async function joinGroup(groupId: string, _prev: ActionState): Promise<ActionState> {
  const { user, profileId } = await currentProfileId();
  if (!user || !profileId) {
    return { status: "error", message: "Please sign in first so a group leader can follow up with you." };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("group_members")
    .insert({ group_id: groupId, profile_id: profileId, status: "requested" });

  if (error) {
    if (error.code === "23505") return { status: "success", message: "You've already requested to join this group." };
    return { status: "error", message: "Something went wrong. Please try again." };
  }
  return { status: "success", message: "Request sent! A group leader will follow up with you soon." };
}

export async function applyForShift(shiftId: string, _prev: ActionState): Promise<ActionState> {
  const { user, profileId } = await currentProfileId();
  if (!user || !profileId) {
    return { status: "error", message: "Please sign in first to sign up for a serving shift." };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("volunteer_assignments").insert({
    shift_id: shiftId,
    profile_id: profileId,
    status: "confirmed",
    responded_at: new Date().toISOString(),
  });

  if (error) {
    if (error.code === "23505") return { status: "success", message: "You're already signed up for this shift." };
    return { status: "error", message: "Something went wrong. Please try again." };
  }
  return { status: "success", message: "You're signed up to serve. Thank you!" };
}

/** Old forms must also leave the site without creating a giving intent. */
export async function submitGivingIntent(_prev: ActionState, _formData: FormData): Promise<ActionState> {
  redirect(PAYMENT_URL);
}
