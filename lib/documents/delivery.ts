import { fullName } from "@/lib/members/name";

// Who a finished document is emailed to, and which names it prints. A
// document normally goes to the member it was prepared for; it can instead
// go to someone who isn't in the members list (an embassy, a school, a
// guest speaker), typed in by the office. A member may still be set then:
// a letter about them, sent straight to a third party, stays on their
// record.

export type MemberRecipient = { first_name: string | null; last_name: string | null; email: string | null };

export type OutsideRecipient = { name: string; email: string; address: string | null };

export type DeliveryFields = {
  requester_profile_id: string | null;
  recipient_name: string | null;
  recipient_email: string | null;
  /** The template fields the office filled in. */
  details?: unknown;
};

export type Delivery = {
  /** Where the PDF is emailed. */
  email: string;
  /** "Dear ___," in the email. */
  greetingName: string;
  /** The name a certificate is "presented to". */
  nameOnDocument: string;
  /** Sent to someone not in the members list. */
  outside: boolean;
};

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** The recipient typed into a form (fields outside_name, outside_email,
 *  outside_address). */
export function readOutsideRecipient(form: FormData): OutsideRecipient {
  const name = String(form.get("outside_name") ?? "").trim().slice(0, 200);
  const email = String(form.get("outside_email") ?? "").trim().slice(0, 320);
  const address = String(form.get("outside_address") ?? "").trim().slice(0, 1000);
  if (!name) throw new Error("Enter the name of the person or organisation receiving this document.");
  if (!EMAIL.test(email)) throw new Error("Enter a valid email address for the recipient.");
  return { name, email, address: address || null };
}

/** The reason given for signing on the Pastor's behalf, or null when the
 *  form wasn't marked urgent. */
export function urgentReasonFrom(form: FormData): string | null {
  if (form.get("urgent") !== "on") return null;
  const reason = String(form.get("urgent_reason") ?? "").trim().slice(0, 1000);
  if (!reason) throw new Error("Say why this can't wait for the Pastor. He sees your reason.");
  return reason;
}

function filled(details: unknown, key: string): string {
  const value = details && typeof details === "object" ? (details as Record<string, unknown>)[key] : undefined;
  return typeof value === "string" ? value.trim() : "";
}

/** The name a certificate is "presented to": the child on a dedication
 *  certificate (the email goes to the parents), else the member it's about,
 *  else the person the office typed in. */
export function nameOnDocument(request: DeliveryFields, member: Pick<MemberRecipient, "first_name" | "last_name"> | null): string {
  return filled(request.details, "child_name") || fullName(member) || filled(request.details, "member_name") || request.recipient_name?.trim() || "";
}

/** Refuses, rather than guesses, when a document has nowhere to go or no
 *  name to print: it carries the Pastor's signature and the church stamp. */
export function documentDelivery(request: DeliveryFields, member: MemberRecipient | null): Delivery {
  const memberName = fullName(member);
  if (request.recipient_email) {
    const outsideName = request.recipient_name?.trim();
    if (!outsideName) throw new Error("This document's recipient has no name. Add one before certifying it.");
    return { email: request.recipient_email, greetingName: outsideName, nameOnDocument: nameOnDocument(request, member), outside: true };
  }
  if (!member) throw new Error("Choose who this document goes to before certifying it.");
  if (!member.email) throw new Error("The recipient needs an email address so the PDF can be delivered.");
  if (!memberName) throw new Error("This member has no name on file. Add their first and last name in People before certifying this document.");
  return { email: member.email, greetingName: memberName, nameOnDocument: nameOnDocument(request, member), outside: false };
}

/** One line for office lists: who the document is for and where it goes. */
export function recipientSummary(request: DeliveryFields, member: Pick<MemberRecipient, "first_name" | "last_name"> | null): string {
  const memberName = fullName(member);
  if (request.recipient_email) {
    const outsideName = request.recipient_name?.trim() || request.recipient_email;
    return memberName ? `${memberName}, sent to ${outsideName}` : `${outsideName} (not a member)`;
  }
  return memberName || "(no name on file)";
}
