import type { Metadata } from "next";
import Link from "next/link";
import { officeContext } from "@/lib/office/context";
import { PASTOR_SIGNATURE_CONSENT } from "@/lib/documents/pastor-signatures";
import { InvitePastorForm, SignatureControls } from "./forms";
export const metadata: Metadata = { title: "Pastor signatures" };
export default async function PastorSignaturesPage() {
  const { db, org } = await officeContext("documents.manage");
  const { data: signatures, error } = await db.from("pastor_signature_authorizations").select("id,name,email,invited_at,accepted_at,expires_at,revoked_at").eq("organization_id", org).order("invited_at", { ascending: false }).limit(200);
  if (error) throw error;
  const now = new Date().getTime();
  return <><div className="dashboard-header"><div><h1>Pastor signatures</h1><p>Invite a pastor once, then select their authorized signature when preparing church documents.</p><Link href="/admin/documents" className="secondary-button">Back to documents</Link></div></div>
    <div className="panel"><h2>Add a pastor signature</h2><p>The pastor enters their own full name and draws their signature from a private email link. No account is required.</p><InvitePastorForm /><details><summary>Authorization the pastor will acknowledge</summary><p>{PASTOR_SIGNATURE_CONSENT}</p></details></div>
    <div className="panel"><h2>Invitations &amp; saved signatures</h2>{!signatures?.length && <p>No pastor signatures yet.</p>}{signatures?.map(s => <article key={s.id} style={{ padding: "16px 0", borderBottom: "1px solid var(--color-border)" }}><h3>{s.name || "Awaiting pastor’s name"}</h3><p>{s.email}</p><p>{s.revoked_at ? "Revoked" : s.accepted_at ? `Authorized for reuse · ${new Date(s.accepted_at).toLocaleString("en-JM", { timeZone: "America/Jamaica" })}` : Date.parse(s.expires_at) <= now ? "Invitation expired" : "Awaiting name, signature and acknowledgement"}</p>{!s.revoked_at && <SignatureControls id={s.id} accepted={Boolean(s.accepted_at)} />}</article>)}</div>
  </>;
}
