import { notFound, redirect } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { hashToken } from "@/lib/forms/server";

export const metadata = { title: "Church form", robots: { index: false, follow: false }, referrer: "no-referrer" as const };

/** Invitation links used to open here; they now open the form itself. */
export default async function InvitationLink({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) notFound();
  const db = createServiceRoleClient();
  const { data: assignment } = await db.from("form_assignments").select("form_id").eq("token_hash", hashToken(token)).maybeSingle();
  if (!assignment) notFound();
  const { data: form } = await db.from("office_forms").select("public_id").eq("id", assignment.form_id).maybeSingle();
  if (!form) notFound();
  redirect(`/f/${form.public_id}?invite=${token}`);
}
