import { NextResponse } from "next/server";
import { getCurrentProfile, getOrganizationId } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { currentConferenceDocument } from "@/lib/office/conference-document";

export async function POST() {
  const [profile, org] = await Promise.all([getCurrentProfile(), getOrganizationId()]);
  if (!profile) return NextResponse.json({ error: 'Please sign in with your church account.' }, { status: 401 });
  if (profile.organization_id !== org || profile.membership_status === 'deceased') return NextResponse.json({ error: 'This church account cannot access the conference document.' }, { status: 403 });
  try {
    const file = await currentConferenceDocument();
    if (!file) return NextResponse.json({ error: "The conference document isn't available yet." }, { status: 404 });
    const { data, error } = await createServiceRoleClient().storage.from('member-resources').createSignedUrl(`conference/${file.name}`, 300, { download: file.name });
    if (error || !data) throw new Error('The download could not be prepared. Please try again.');
    return NextResponse.json({ url: data.signedUrl }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Download unavailable.' }, { status: 503 }); }
}
