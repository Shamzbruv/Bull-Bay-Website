import type { Metadata } from "next";
import { pastorSignatureInvitation, PASTOR_SIGNATURE_CONSENT } from "@/lib/documents/pastor-signatures";
import { PastorSignatureForm } from "./signature-form";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Add your pastor signature", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default async function PastorSignaturePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invitation = await pastorSignatureInvitation(token);
  return <main className="panel" style={{ maxWidth: 760, margin: "40px auto", padding: 24 }}><p>New Testament Church of God, Bull Bay</p><h1>Add your pastor signature</h1>
    {!invitation ? <p>This invitation has expired, been replaced, or been revoked. Please contact the church office for a new invitation.</p> : invitation.accepted_at ? <p>Your signature authorization has already been saved. Thank you. Contact the church office if you want to withdraw it.</p> : <><p>Enter your name, review the authorization, and sign below. You do not need an account.</p><PastorSignatureForm token={token} consent={PASTOR_SIGNATURE_CONSENT} /></>}
  </main>;
}
