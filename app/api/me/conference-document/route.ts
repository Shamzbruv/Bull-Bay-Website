import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

/**
 * Any signed-in member/staff can download the current Church Members
 * Conference document — it's private-to-members, not staff-only. The file
 * itself lives in the member-resources bucket, which has no anonymous
 * Storage policy at all (see 0014_member_resources_storage.sql); this
 * route is the only path to it, via a 5-minute signed URL.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const admin = createServiceRoleClient();
  const path = "conference/Bull_Bay_Church_Members_Conference_2026-2027.pptx";
  const { data: signed, error } = await admin.storage.from("member-resources").createSignedUrl(path, 300);

  if (error || !signed) {
    return NextResponse.json({ error: "The conference document isn't available yet." }, { status: 404 });
  }

  return NextResponse.json({ url: signed.signedUrl });
}
