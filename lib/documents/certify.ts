import { createServiceRoleClient } from "@/lib/supabase/server";
import { generateDocumentPdf, type PreparingSigner } from "@/lib/documents/pdf";
import { getLogoBuffer, getStaffAssetBuffer } from "@/lib/documents/assets";
import { documentDelivery } from "@/lib/documents/delivery";
import { cleanDesign } from "@/lib/documents/design";
import { queueOfficeEmail } from "@/lib/office/email";
import { recordOfficeAction, roleMembers } from "@/lib/office/context";
import { notifyUsers } from "@/lib/notifications";
import { fullName, primaryRoleName } from "@/lib/members/name";
import { SITE_URL } from "@/lib/org";

type Db = ReturnType<typeof createServiceRoleClient>;

export type Certifier = {
  userId: string;
  /** For the Pastor's notification: who used his signature. */
  name: string;
  permissions: Set<string>;
};

/** The person who typed up a document, for the third signature column.
 *  Kept even without a name on file: their title prints in its place. */
export async function preparingSigner(db: Db, org: string, authUserId: string | null, signerAuthUserId?: string | null): Promise<PreparingSigner | undefined> {
  if (!authUserId || authUserId === signerAuthUserId) return undefined;
  const { data: person } = await db
    .from("profiles")
    .select("first_name,last_name,signature_path")
    .eq("organization_id", org)
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  if (!person) return undefined;
  const name = fullName(person);
  const title = await primaryRoleName(db, org, authUserId);
  if (!name && !title) return undefined;
  return { name, title, signatureImage: await getStaffAssetBuffer(person.signature_path) };
}

/** How the Pastor's notification names whoever signed: their name, or for
 *  an account with no name on file, their title. */
export async function certifierName(org: string, authUserId: string, profile: { first_name?: string | null; last_name?: string | null }) {
  return fullName(profile) || (await primaryRoleName(createServiceRoleClient(), org, authUserId)) || "Someone in the church office";
}

/** The Pastor (the one person with the pastor role) and which of his
 *  signing images are on file, his own or the church-level fallback. */
export async function pastorSigningAssets(org: string) {
  const db = createServiceRoleClient();
  const [pastors, { data: authority }] = await Promise.all([
    roleMembers(org, ["pastor"]),
    db.from("integration_settings").select("value").eq("key", `document_authority:${org}`).maybeSingle(),
  ]);
  const assets = authority?.value as { signature_path?: string; stamp_path?: string } | undefined;
  const pastor = pastors[0] ?? null;
  const { data: files } = pastor
    ? await db.from("profiles").select("signature_path,stamp_path").eq("id", pastor.id).maybeSingle()
    : { data: null };
  return {
    pastor: pastor ? { id: pastor.id, authUserId: pastor.auth_user_id, name: fullName(pastor) || "The Pastor" } : null,
    hasSignature: Boolean(files?.signature_path || assets?.signature_path),
    hasStamp: Boolean(files?.stamp_path || assets?.stamp_path),
  };
}

/** Whether the Pastor's signature and the church stamp are on file, without
 *  which nothing can be certified. */
export async function pastorSigningReady(org: string): Promise<boolean> {
  const { hasSignature, hasStamp } = await pastorSigningAssets(org);
  return hasSignature && hasStamp;
}

/**
 * Applies the Pastor's signature and the church stamp to a document waiting
 * for him, saves the numbered PDF and emails it to its recipient.
 *
 * With `urgentReason`, someone in the office is signing on his behalf
 * because it can't wait (documents.urgent_sign). The reason is kept on the
 * document and every pastor is told at once, by bell and by email: who
 * used his signature, on what, sent to whom, and why.
 */
export async function certifyPreparedDocument({ org, requestId, actor, urgentReason }: { org: string; requestId: string; actor: Certifier; urgentReason?: string | null }): Promise<string> {
  const urgent = Boolean(urgentReason?.trim());
  if (urgent) {
    if (!actor.permissions.has("documents.urgent_sign")) throw new Error("Your role can't sign documents on the Pastor's behalf.");
  } else if (!actor.permissions.has("documents.certify") && !actor.permissions.has("documents.sign_delegate")) {
    throw new Error("Only the Pastor or Executive Assistant may apply the signature and church stamp.");
  }
  const db = createServiceRoleClient();
  const { data: request } = await db.from("document_requests").select("*").eq("organization_id", org).eq("id", requestId).maybeSingle();
  if (!request?.prepared_body || request.status !== "pending_pastor") throw new Error("Prepare the document and submit it for certification first.");
  const [{ data: member }, { data: authority }, pastors] = await Promise.all([
    request.requester_profile_id
      ? db.from("profiles").select("id,first_name,last_name,email").eq("organization_id", org).eq("id", request.requester_profile_id).maybeSingle()
      : Promise.resolve({ data: null }),
    db.from("integration_settings").select("value").eq("key", `document_authority:${org}`).maybeSingle(),
    roleMembers(org, ["pastor"]),
  ]);
  // Checked and refused here rather than papered over: a document bearing
  // the church stamp and the Pastor's signature must not go out to nobody,
  // or with a blank name on it.
  const delivery = documentDelivery(request, member);

  const assetConfig = authority?.value as { signature_path?: string; stamp_path?: string; signer_name?: string } | undefined;
  const actorIsPastor = pastors.some((p) => p.auth_user_id === actor.userId);
  const signerId = pastors.find((p) => p.auth_user_id === actor.userId)?.id ?? pastors[0]?.id;
  const { data: signerProfile } = signerId
    ? await db.from("profiles").select("auth_user_id,signature_path,stamp_path,first_name,last_name").eq("id", signerId).maybeSingle()
    : { data: null };
  // The Pastor certifying his own letter doesn't need his name twice.
  const preparer = await preparingSigner(db, org, request.prepared_by, signerProfile?.auth_user_id);
  const [logo, signatureImage, stampImage] = await Promise.all([
    getLogoBuffer(),
    getStaffAssetBuffer(signerProfile?.signature_path || assetConfig?.signature_path || null),
    getStaffAssetBuffer(signerProfile?.stamp_path || assetConfig?.stamp_path || null),
  ]);
  if (!signatureImage || !stampImage) {
    throw new Error("The Pastor's signature and the church stamp aren't on file yet. He uploads them on his Documents page (Your signature & stamp); nothing can be certified until then.");
  }
  const snapshot = (request.template_snapshot ?? {}) as { layout?: string; design?: unknown; email_template_id?: string };
  const design = cleanDesign(snapshot.design);
  const signerName = assetConfig?.signer_name || design.signer_name || fullName(signerProfile) || "Pastor";
  // Only someone else signing for him is "urgent"; the Pastor ticking the
  // box on his own document is just certifying it.
  const reason = urgent && !actorIsPastor ? urgentReason!.trim().slice(0, 1000) : null;

  const { data: numbered, error: lockError } = await db
    .from("document_requests")
    .update({ status: "stamped", certified_by: actor.userId, certified_at: new Date().toISOString(), signer_profile_id: signerId ?? null, urgent_reason: reason })
    .eq("organization_id", org)
    .eq("id", requestId)
    .eq("status", "pending_pastor")
    .select("document_number")
    .maybeSingle();
  if (lockError || !numbered?.document_number) throw new Error("This document is already being certified. Refresh before trying again.");
  const number = numbered.document_number;
  const path = `documents/${requestId}/${number}.pdf`;
  const otherPastors = pastors.filter((p) => p.auth_user_id && p.auth_user_id !== actor.userId);
  try {
    const pdf = await generateDocumentPdf({
      documentNumber: number,
      title: request.title,
      bodyParagraphs: request.prepared_body.split(/\n\s*\n/).filter(Boolean),
      recipientName: delivery.nameOnDocument,
      issuedDate: new Date().toLocaleDateString("en-JM", { dateStyle: "long", timeZone: "America/Jamaica" }),
      logoImage: logo,
      layout: snapshot.layout,
      design,
      signer: { name: signerName, title: "Pastor, New Testament Church of God, Bull Bay", signatureImage, stampImage },
      preparer,
    });
    const { error: uploadError } = await db.storage.from("member-resources").upload(path, pdf, { contentType: "application/pdf", upsert: true });
    if (uploadError) throw new Error("The PDF could not be saved.");
    await recordOfficeAction(org, actor.userId, "document.signature_stamp_applied", "document_requests", requestId, {
      signer_name: signerName,
      document_number: number,
      authority: reason ? "urgent_office_signature" : actor.permissions.has("documents.sign_delegate") ? "executive_delegation" : "pastor_approval",
      sent_to: delivery.outside ? "outside_recipient" : "member",
      ...(reason ? { urgent_reason: reason } : {}),
    });
    await notifyUsers(
      org,
      otherPastors.map((p) => p.auth_user_id!),
      reason
        ? {
            title: "Urgent: your signature and the church stamp were used",
            body: `${actor.name} signed and stamped ${request.title} (${number}) for ${delivery.greetingName}. Reason: ${reason}`,
            url: `/pastor/documents?request=${requestId}`,
            type: "document_signature",
          }
        : {
            title: "Your signature and the church stamp were used",
            body: `${actor.name} certified ${request.title} (${number}).`,
            url: `/pastor/documents?request=${requestId}`,
            type: "document_signature",
          },
    );
    const { error: finishError } = await db.from("document_requests").update({ status: "completed", pdf_path: path }).eq("id", requestId).eq("status", "stamped");
    if (finishError) throw finishError;
  } catch (error) {
    await db
      .from("document_requests")
      .update({ status: "pending_pastor", certified_by: null, certified_at: null, pdf_path: null, urgent_reason: null })
      .eq("id", requestId)
      .eq("status", "stamped");
    throw error;
  }

  if (reason) {
    // By email as well as the bell, so he hears of it even away from the site.
    for (const pastor of otherPastors) {
      if (!pastor.email) continue;
      await queueOfficeEmail({
        org,
        recipient: pastor.email,
        template: "staff-notification",
        fields: {
          heading: "Your signature and the church stamp were used",
          intro: `${actor.name} applied your signature and the church stamp to an urgent document without waiting for you.`,
          details: `Document: ${request.title} (${number})\nSent to: ${delivery.greetingName} <${delivery.email}>\nReason given: ${reason}`,
          action_url: `${SITE_URL}/pastor/documents?request=${requestId}`,
        },
        dedupeKey: `urgent-signature-${requestId}-${pastor.id}`,
        actor: actor.userId,
      }).catch((error: unknown) => console.error("[documents] pastor email for urgent signature failed:", error instanceof Error ? error.message : error));
    }
  }

  const template = delivery.outside
    ? "document-sent"
    : snapshot.email_template_id || (snapshot.layout === "certificate" ? "certificate-ready" : "document-ready");
  const result = await queueOfficeEmail({
    org,
    recipient: delivery.email,
    template,
    fields: {
      recipient_name: delivery.greetingName,
      document_title: request.title,
      certificate_title: request.title,
      document_number: number,
      action_url: delivery.outside ? SITE_URL : `${SITE_URL}/member/documents`,
    },
    attachmentPath: path,
    attachmentName: `${number}.pdf`,
    dedupeKey: `document-${requestId}`,
    actor: actor.userId,
  });
  const sentTo = delivery.outside ? delivery.greetingName : "the recipient";
  const emailed = result.sent ? `The PDF was emailed to ${sentTo}.` : "The PDF email is queued for retry; check Email delivery.";
  return reason
    ? `Signed on the Pastor's behalf as ${number}. ${emailed} The Pastor has been told.`
    : `Certified as ${number}. ${emailed}`;
}
