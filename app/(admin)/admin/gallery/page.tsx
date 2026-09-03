import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationId, getUserPermissions } from "@/lib/auth/session";
import { AccessDenied } from "@/components/access-denied";
import { GalleryImageCard, LivestreamForm, UploadForm } from "./gallery-forms";

export const metadata: Metadata = { title: "Gallery & Livestream" };

export default async function AdminGalleryPage() {
  const organizationId = await getOrganizationId();
  const permissions = await getUserPermissions(organizationId ?? "");
  if (!permissions.has("media.manage")) return <AccessDenied />;

  const supabase = await createClient();
  const [{ data: images }, { data: campus }] = await Promise.all([
    supabase.from("gallery_images").select("id, storage_path, caption, is_published").order("created_at", { ascending: false }),
    supabase.from("campuses").select("livestream_url").eq("organization_id", organizationId ?? "").maybeSingle(),
  ]);

  const withUrls = (images ?? []).map((img) => ({
    ...img,
    url: supabase.storage.from("gallery").getPublicUrl(img.storage_path).data.publicUrl,
  }));

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1>Gallery &amp; Livestream</h1>
          <p>What the media team keeps updated for the congregation — photos with a bit of story, and the live link.</p>
        </div>
      </div>

      <div className="panel">
        <h2>Livestream link</h2>
        <p className="form-note">This is what plays on the Live page and the homepage &quot;Watch Live&quot; button.</p>
        <LivestreamForm currentUrl={campus?.livestream_url ?? null} />
      </div>

      <div className="panel">
        <h2>Add a photo</h2>
        <UploadForm />
      </div>

      <div className="panel">
        <h2>Gallery ({withUrls.length})</h2>
        {withUrls.length === 0 && <p className="panel-empty">No photos yet.</p>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
          {withUrls.map((img) => (
            <GalleryImageCard key={img.id} id={img.id} url={img.url} caption={img.caption} isPublished={img.is_published} />
          ))}
        </div>
      </div>
    </>
  );
}
