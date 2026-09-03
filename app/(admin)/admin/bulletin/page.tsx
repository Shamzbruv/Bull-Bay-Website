import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationId, getUserPermissions } from "@/lib/auth/session";
import { AccessDenied } from "@/components/access-denied";
import { AnnouncementForm, PublishToggle } from "./bulletin-forms";

export const metadata: Metadata = { title: "Bulletin" };

export default async function AdminBulletinPage() {
  const organizationId = await getOrganizationId();
  const permissions = await getUserPermissions(organizationId ?? "");
  if (!permissions.has("content.manage")) return <AccessDenied />;

  const supabase = await createClient();
  const { data: announcements } = await supabase
    .from("announcements")
    .select("id, title, body, status, published_at, created_at")
    .eq("organization_id", organizationId ?? "")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1>Bulletin</h1>
          <p>Weekly news and notices from the office — shown on every member&apos;s dashboard.</p>
        </div>
      </div>

      <div className="panel">
        <h2>New announcement</h2>
        <AnnouncementForm />
      </div>

      <div className="panel">
        <h2>All announcements</h2>
        {(!announcements || announcements.length === 0) && <p className="panel-empty">Nothing posted yet.</p>}
        {announcements?.map((a) => (
          <div key={a.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--color-border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <b>{a.title}</b>
              <PublishToggle id={a.id} isPublished={a.status === "published"} />
            </div>
            <p style={{ margin: "4px 0 0", fontSize: ".85rem", whiteSpace: "pre-wrap" }}>{a.body}</p>
          </div>
        ))}
      </div>
    </>
  );
}
