import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

/**
 * Issues a short-lived signed URL for a digital product download, only
 * after verifying the caller owns the entitlement and it hasn't expired,
 * been revoked, or hit its download limit. The digital-products bucket has
 * no public/authenticated Storage policy at all — this route (service
 * role) is the only way in.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("id").eq("auth_user_id", user.id).maybeSingle();
  if (!profile) return NextResponse.json({ error: "Profile not found." }, { status: 404 });

  const { data: entitlement } = await supabase
    .from("digital_entitlements")
    .select("id, profile_id, revoked_at, expires_at, max_downloads, download_count, products(digital_asset_path, name)")
    .eq("id", id)
    .maybeSingle();

  if (!entitlement || entitlement.profile_id !== profile.id) {
    return NextResponse.json({ error: "Download not found." }, { status: 404 });
  }
  if (entitlement.revoked_at) return NextResponse.json({ error: "This download has been revoked." }, { status: 403 });
  if (entitlement.expires_at && new Date(entitlement.expires_at) < new Date()) {
    return NextResponse.json({ error: "This download link has expired." }, { status: 403 });
  }
  if (entitlement.max_downloads && entitlement.download_count >= entitlement.max_downloads) {
    return NextResponse.json({ error: "Download limit reached. Contact us for help." }, { status: 403 });
  }

  const product = entitlement.products as unknown as { digital_asset_path: string | null; name: string } | null;
  if (!product?.digital_asset_path) {
    return NextResponse.json({ error: "No file is attached to this product yet." }, { status: 404 });
  }

  const admin = createServiceRoleClient();
  const { data: signed, error } = await admin.storage
    .from("digital-products")
    .createSignedUrl(product.digital_asset_path, 300);

  if (error || !signed) return NextResponse.json({ error: "Couldn't generate a download link." }, { status: 500 });

  await admin
    .from("digital_entitlements")
    .update({ download_count: entitlement.download_count + 1 })
    .eq("id", entitlement.id);

  return NextResponse.json({ url: signed.signedUrl });
}
