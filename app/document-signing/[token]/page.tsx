import type { Metadata } from "next";
import { signingRequest } from "@/lib/documents/officiant";
import { SigningForm } from "./signing-form";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Officiating pastor acknowledgement", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default async function SigningPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const current = await signingRequest(token);
  return <main className="panel" style={{ maxWidth: 800, margin: "40px auto", padding: 24 }}>
    <h1>Officiating pastor acknowledgement</h1>
    {!current ? <p>This link has expired, been replaced, or the document is no longer awaiting a signature. Please contact the church office.</p> : <>
      <h2>{current.request.title}</h2><p>Officiating pastor: <strong>{current.signer.name}</strong></p>
      <div style={{ whiteSpace: "pre-wrap", margin: "24px 0" }}>{current.request.prepared_body}</div>
      {current.signer.signed_at ? <p>Your acknowledgement and signature have already been saved. Thank you.</p> : <SigningForm token={token} />}
    </>}
  </main>;
}
