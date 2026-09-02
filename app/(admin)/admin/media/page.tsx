import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationId, getUserPermissions } from "@/lib/auth/session";
import { AccessDenied } from "@/components/access-denied";

export const metadata: Metadata = { title: "Media" };

export default async function AdminMediaPage() {
  const organizationId = await getOrganizationId();
  const permissions = await getUserPermissions(organizationId ?? "");
  if (!permissions.has("sermons.manage")) return <AccessDenied />;

  const supabase = await createClient();
  const { data: sermons } = await supabase
    .from("sermons")
    .select("id, title, status, preached_at")
    .eq("organization_id", organizationId ?? "")
    .order("preached_at", { ascending: false })
    .limit(20);

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1>Media</h1>
          <p>Sermons are created and edited from the pastor workspace&apos;s sermon planner.</p>
        </div>
      </div>
      <div className="panel">
        <h2>Recent sermons</h2>
        {sermons?.map((s) => (
          <div key={s.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--color-border)" }}>
            <span>{s.title}</span>
            <span className="badge">{s.status}</span>
          </div>
        ))}
        {(!sermons || sermons.length === 0) && <p className="panel-empty">No sermons yet.</p>}
        <Link className="link-button" href="/pastor/sermons" style={{ marginTop: 16 }}>
          Open sermon planner <span>→</span>
        </Link>
      </div>
    </>
  );
}
