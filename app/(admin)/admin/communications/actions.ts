"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, getOrganizationId, getUserPermissions } from "@/lib/auth/session";
import { sendMail, isEmailConfigured } from "@/lib/email/resend";
import { renderComposedEmail } from "@/lib/email/templates";
import type { ActionState } from "@/app/(public)/actions";

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
