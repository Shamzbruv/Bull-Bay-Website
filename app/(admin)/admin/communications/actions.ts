"use server";

import { randomBytes } from "node:crypto";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { getAuthUser, getCurrentProfile, getOrganizationId, getUserPermissions } from "@/lib/auth/session";
import { sendMail, isEmailConfigured } from "@/lib/email/resend";
import { renderComposedEmail } from "@/lib/email/templates";
import { fillText, queueRawOfficeEmail } from "@/lib/office/email";
import { recordOfficeAction } from "@/lib/office/context";
import { mergeTemplate } from "@/lib/documents/merge";
import { cleanDesign, type DocumentDesign } from "@/lib/documents/design";
import { generateDocumentPdf, type CasualSender } from "@/lib/documents/pdf";
import { getLogoBuffer, getStaffAssetBuffer } from "@/lib/documents/assets";
import { fullName, primaryRoleName } from "@/lib/members/name";
import { SITE_NAME, SITE_URL } from "@/lib/org";
import type { ActionState } from "@/app/(public)/actions";

const EMAIL_RE = /^\S+@\S+\.\S+$/;
const MAX_FIELD_LENGTH = 20000;
const SEND_BATCH_SIZE = 4;

const unixLineEndings = (text: string) => text.replace(/\r\n?/g, "\n");

export async function sendComposedEmail(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const organizationId = await getOrganizationId();
  const permissions = organizationId ? await getUserPermissions(organizationId) : new Set<string>();
  if (!organizationId || !permissions.has("communications.send")) return { status: "error", message: "You don't have permission to do this." };

  if (!isEmailConfigured()) {
    return {
      status: "error",
      message: "Email sending isn't connected yet — add the Resend API key, then this will go out immediately.",
    };
  }

  const audience = String(formData.get("audience") || "single");
  const singleEmail = String(formData.get("single_email") || "").trim();
  const heading = String(formData.get("heading") || "").trim();
  const bodyText = String(formData.get("body") || "").trim();
  const replyTo = String(formData.get("reply_to") || "").trim();

  if (!heading || !bodyText) return { status: "error", message: "Add a heading and a message." };
  if (!replyTo) return { status: "error", message: "This inbox doesn't accept replies — add an email address people should reply to." };
  if (!/^\S+@\S+\.\S+$/.test(replyTo)) return { status: "error", message: "Enter a valid reply-to email address." };
  if (audience === "single" && !singleEmail) return { status: "error", message: "Enter the recipient's email." };
  if (audience === "single" && !/^\S+@\S+\.\S+$/.test(singleEmail)) return { status: "error", message: "Enter a valid recipient email address." };

  const senderProfile = await getCurrentProfile();
  const senderName = senderProfile ? `${senderProfile.first_name ?? ""} ${senderProfile.last_name ?? ""}`.trim() : undefined;
  const html = renderComposedEmail({ heading, bodyText, senderName });

  const supabase = await createClient();
  let recipients: string[] = [];
  if (audience === "single") {
    recipients = [singleEmail];
  } else {
    const { data } = await supabase
      .from("profiles")
      .select("email")
      .eq("organization_id", organizationId)
      .eq("communication_email_opt_in", true)
      .not("email", "is", null);
    recipients = [...new Set((data ?? []).map((p) => p.email).filter((e): e is string => Boolean(e)))];
  }
  if (recipients.length === 0) return { status: "error", message: "No recipients found." };

  const results = await Promise.allSettled(recipients.map((to) => sendMail({ to, subject: heading, html, replyTo })));
  const sent = results.filter((r) => r.status === "fulfilled" && r.value.sent).length;

  return {
    status: sent > 0 ? "success" : "error",
    message: sent > 0 ? `Sent to ${sent} of ${recipients.length} recipient${recipients.length === 1 ? "" : "s"}.` : "Couldn't send. Please try again.",
  };
}

/**
 * Sends an existing email template or an existing letter template straight
 * from Communications — no pastor review, no document_requests row, no
 * certification. That's deliberate: this is for the correspondence staff
 * need to send today (a notice, a reference letter, a reminder), not the
 * documents and certificates that carry the church's official certifying
 * signature and stamp. Those still go through
 * Admin → Documents → Pastor's desk, unchanged by any of this.
 *
 * `kind` picks which table `templateId` names a row in. Everything after
 * that point — merge, validate, render, send — is identical for both,
 * which is why they share one action instead of two near-duplicates.
 */
export async function sendTemplateCommunication(
  kind: "email" | "letter",
  templateId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const organizationId = await getOrganizationId();
  const permissions = organizationId ? await getUserPermissions(organizationId) : new Set<string>();
  if (!organizationId || !permissions.has("communications.send")) return { status: "error", message: "You don't have permission to do this." };
  if (!isEmailConfigured()) {
    return { status: "error", message: "Email sending isn't connected yet — add the Resend API key, then this will go out immediately." };
  }

  const audience = String(formData.get("audience") || "single");
  const singleEmail = String(formData.get("single_email") || "").trim();
  const replyTo = String(formData.get("reply_to") || "").trim();
  const sendMode = String(formData.get("send_mode") || "body") === "attachment" ? "attachment" : "body";
  const includeSentBy = formData.get("include_sent_by") === "on";

  if (!replyTo || !EMAIL_RE.test(replyTo)) return { status: "error", message: "Enter a valid reply-to email address." };
  if (audience === "single" && (!singleEmail || !EMAIL_RE.test(singleEmail))) {
    return { status: "error", message: "Enter a valid recipient email address." };
  }

  const db = createServiceRoleClient();
  const [authUser, senderProfile] = await Promise.all([getAuthUser(), getCurrentProfile()]);

  // The two merge fields every send fills in itself, so the form never asks
  // for them (template-send-form.tsx hides the same two).
  const fields: Record<string, string> = { church_name: SITE_NAME, action_url: `${SITE_URL}/member` };
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("field_")) continue;
    // Browsers submit a textarea's line breaks as \r\n.
    const text = unixLineEndings(String(value)).trim();
    if (text.length > MAX_FIELD_LENGTH) {
      return { status: "error", message: `"${key.slice(6).replaceAll("_", " ")}" is too long — keep it under ${MAX_FIELD_LENGTH.toLocaleString("en-US")} characters.` };
    }
    fields[key.slice(6)] = text;
  }
  const issuedDate = new Date().toLocaleDateString("en-JM", { dateStyle: "long", timeZone: "America/Jamaica" });

  let title: string;
  let bodyParagraphs: string[];
  let design: DocumentDesign;
  let format: "document" | "correspondence" = "document";
  let bodyHasDate = false;

  if (kind === "email") {
    const { data: template } = await db.from("email_templates").select("*").eq("organization_id", organizationId).eq("id", templateId).maybeSingle();
    if (!template) return { status: "error", message: "Choose an available email template." };
    title = fillText(String(formData.get("subject") || template.subject).trim() || template.subject, fields);
    bodyParagraphs = mergeTemplate(unixLineEndings(template.body), fields);
    design = {};
  } else {
    // Letters only. A certificate sent from here would have neither the
    // pastor's signature nor the church seal, yet look like an official one.
    const { data: template } = await db.from("document_templates").select("*").eq("organization_id", organizationId).eq("id", templateId).eq("is_active", true).eq("layout", "letter").maybeSingle();
    if (!template) return { status: "error", message: "Choose an available letter template." };
    title = String(formData.get("subject") || template.name).trim() || template.name;
    bodyParagraphs = mergeTemplate(unixLineEndings(template.body), fields);
    design = cleanDesign(template.design);
    format = "correspondence";
    bodyHasDate = /\{\{\s*date_today\s*\}\}/.test(template.body);
  }

  if (/\{\{[^}]+\}\}/.test(title) || bodyParagraphs.some((p) => /\{\{[^}]+\}\}/.test(p))) {
    return { status: "error", message: "Fill in every field before sending — something was left blank." };
  }

  // Recipients, resolved after validating the template so a mistyped
  // address doesn't waste a PDF render on a request that was going to
  // fail anyway.
  let recipients: string[];
  if (audience === "single") {
    recipients = [singleEmail];
  } else {
    const { data } = await db.from("profiles").select("email").eq("organization_id", organizationId).eq("communication_email_opt_in", true).not("email", "is", null);
    recipients = [...new Set((data ?? []).map((p) => p.email).filter((e): e is string => Boolean(e)))];
  }
  if (recipients.length === 0) return { status: "error", message: "No recipients found." };

  // "Sent by" — the actual person sending this, plainly labelled, with
  // their own signature if they've uploaded one. Never the pastor's
  // signature or the church stamp: this path exists specifically so staff
  // don't need either to send something today.
  let sentBy: CasualSender | undefined;
  if (includeSentBy && authUser) {
    const senderName = fullName(senderProfile) || senderProfile?.email || undefined;
    if (senderName) {
      sentBy = {
        name: senderName,
        title: await primaryRoleName(db, organizationId, authUser.id),
        signatureImage: senderProfile?.signature_path ? await getStaffAssetBuffer(senderProfile.signature_path) : null,
      };
    }
  }

  let html: string;
  let attachmentPath: string | undefined;
  let attachmentName: string | undefined;

  if (sendMode === "attachment") {
    const pdf = await generateDocumentPdf({
      title,
      bodyParagraphs,
      recipientName: fields.recipient_name || singleEmail || "Recipient",
      issuedDate,
      logoImage: await getLogoBuffer(),
      layout: "letter",
      design,
      format,
      dateLine: format === "correspondence" && !bodyHasDate ? issuedDate : undefined,
      sentBy,
    });
    const path = `communications/${organizationId}/${Date.now()}-${randomBytes(4).toString("hex")}.pdf`;
    const { error: uploadError } = await db.storage.from("member-resources").upload(path, pdf, { contentType: "application/pdf" });
    if (uploadError) return { status: "error", message: "Couldn't prepare the attachment. Please try again." };
    attachmentPath = path;
    attachmentName = `${title.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "letter"}.pdf`;
    const coverNote = String(formData.get("cover_note") || "").trim() || "Please see the attached letter.";
    html = renderComposedEmail({ heading: title, bodyText: coverNote, senderName: sentBy?.name });
  } else {
    html = renderComposedEmail({ heading: title, bodyText: bodyParagraphs.join("\n\n"), senderName: sentBy?.name });
  }

  // A few at a time rather than all at once: the email provider rate-limits
  // bursts, and a whole congregation fired in parallel would mostly bounce.
  const sendAt = Date.now();
  const results: PromiseSettledResult<{ sent: boolean }>[] = [];
  for (let start = 0; start < recipients.length; start += SEND_BATCH_SIZE) {
    const batch = recipients.slice(start, start + SEND_BATCH_SIZE);
    results.push(
      ...(await Promise.allSettled(
        batch.map((to, offset) =>
          queueRawOfficeEmail({
            org: organizationId,
            recipient: to,
            subject: title,
            html,
            replyTo,
            dedupeKey: `comm-${kind}-${templateId}-${sendAt}-${start + offset}`,
            actor: authUser?.id,
            attachmentPath,
            attachmentName,
          }),
        ),
      )),
    );
  }
  const sent = results.filter((r) => r.status === "fulfilled" && r.value.sent).length;
  // A delivery that was saved but didn't go out is retried by the background
  // worker, so telling the sender to "try again" would send it twice.
  const savedForRetry = results.filter((r) => r.status === "fulfilled" && !r.value.sent).length;

  if (authUser) {
    await recordOfficeAction(organizationId, authUser.id, "communications.sent", kind === "email" ? "email_templates" : "document_templates", templateId, {
      mode: sendMode,
      audience,
      recipients: String(recipients.length),
    }).catch(() => {});
  }

  const plural = (n: number) => `${n} recipient${n === 1 ? "" : "s"}`;
  if (sent === recipients.length) return { status: "success", message: `Sent to ${plural(sent)}.` };
  if (sent > 0 || savedForRetry > 0) {
    return {
      status: "success",
      message: `Sent to ${sent} of ${plural(recipients.length)}. The other ${savedForRetry} didn't go through just now — they're saved and will retry automatically; follow them under Admin → Emails.`,
    };
  }
  return { status: "error", message: "Couldn't send. Please try again." };
}
