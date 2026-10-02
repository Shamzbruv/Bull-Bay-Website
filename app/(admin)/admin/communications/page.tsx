import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationId, getUserPermissions } from "@/lib/auth/session";
import { AccessDenied } from "@/components/access-denied";
import { isEmailConfigured } from "@/lib/email/resend";
import { ComposeForm } from "./compose-form";
import { TemplateSendForm } from "./template-send-form";

export const metadata: Metadata = { title: "Communications" };

/**
 * Emails the system also sends by itself (an invitation, a password reset,
 * a document being certified). They are tagged, not hidden: staff do edit
 * these into their own wording, and a template someone made has to be
 * sendable from here whatever its slug happens to be.
 */
const SYSTEM_EMAIL_SLUGS = new Set([
  "invitation",
  "password-recovery",
  "role-changed",
  "form-invitation",
  "document-ready",
  "certificate-ready",
  "prayer-completed",
  "staff-notification",
]);

export default async function AdminCommunicationsPage() {
  const organizationId = await getOrganizationId();
  const permissions = await getUserPermissions(organizationId ?? "");
  if (!organizationId || !permissions.has("communications.send")) return <AccessDenied />;

  const supabase = await createClient();
  const [{ data: emailTemplates }, { data: letterTemplates }] = await Promise.all([
    supabase.from("email_templates").select("id, name, subject, body, slug").throwOnError().eq("organization_id", organizationId).order("name"),
    supabase
      .from("document_templates")
      .select("id, name, body, category")
      .throwOnError()
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .eq("layout", "letter")
      .order("name"),
  ]);

  const emailReady = isEmailConfigured();

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1>Communications</h1>
          <p>Send a branded, church-logo email to one person or the whole congregation — written fresh, or from a template already on file.</p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-heading">
          <div>
            <p className="section-kicker">Templates</p>
            <h2>Send a letter</h2>
          </div>
        </div>
        <p className="form-note">
          Every letter goes out on the full church letterhead, laid out as a proper letter — as a PDF attached to the
          email or written into the email itself, whichever you choose when you send. It goes straight away and does not
          wait for the Pastor&apos;s review. Certificates, and anything that must carry the Pastor&apos;s certified
          signature and the church seal, are issued from <Link href="/admin/documents">Documents</Link> instead.
        </p>
        {letterTemplates?.length ? (
          letterTemplates.map((t) => (
            <details key={t.id} className="dashboard-disclosure">
              <summary>
                <span>
                  <b>{t.name}</b>
                  {t.category && <small>{t.category}</small>}
                </span>
              </summary>
              <TemplateSendForm kind="letter" templateId={t.id} defaultSubject={t.name} mergeSourceTexts={[t.body]} />
            </details>
          ))
        ) : (
          <p className="panel-empty">
            No letter templates yet — create one from <Link href="/admin/documents">Documents</Link>.
          </p>
        )}
      </div>

      <div className="panel">
        <div className="panel-heading">
          <div>
            <p className="section-kicker">Templates</p>
            <h2>Send from an email template</h2>
          </div>
        </div>
        <p className="form-note">
          Every email template is here. Ones tagged <b>Automatic</b> are also sent by the system itself (invitations,
          document delivery and so on); sending one from here sends it once, right now, and leaves the automatic one
          untouched.
        </p>
        {emailTemplates?.length ? (
          emailTemplates.map((t) => (
            <details key={t.id} className="dashboard-disclosure">
              <summary>
                <span>
                  <b>{t.name}</b>
                  <small>{t.subject}</small>
                </span>
                {SYSTEM_EMAIL_SLUGS.has(t.slug) && <span className="badge gray">Automatic</span>}
              </summary>
              <TemplateSendForm kind="email" templateId={t.id} defaultSubject={t.subject} mergeSourceTexts={[t.subject, t.body]} />
            </details>
          ))
        ) : (
          <p className="panel-empty">
            No email templates yet — create one from <Link href="/admin/emails">Email templates</Link>.
          </p>
        )}
      </div>

      <div className="panel">
        <div className="panel-heading">
          <div>
            <p className="section-kicker">Write your own</p>
            <h2>A one-off message</h2>
          </div>
        </div>
        <ComposeForm emailReady={emailReady} />
      </div>
    </>
  );
}
