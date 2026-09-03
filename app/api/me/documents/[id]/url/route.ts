import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  // RLS already scopes document_requests to the requester or staff — this
  // just also confirms it's actually completed before issuing a link.
  const { data: request } = await supabase.from("document_requests").select("pdf_path, status").eq("id", id).maybeSingle();
  if (!request || !request.pdf_path || request.status !== "completed") {
    return NextResponse.json({ error: "This document isn't ready yet." }, { status: 404 });
  }

  const admin = createServiceRoleClient();
  const { data: signed, error } = await admin.storage.from("member-resources").createSignedUrl(request.pdf_path, 300);
  if (error || !signed) return NextResponse.json({ error: "Couldn't generate a download link." }, { status: 500 });

  return NextResponse.json({ url: signed.signedUrl });
}
