import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationId, getUserPermissions } from "@/lib/auth/session";
import { AccessDenied } from "@/components/access-denied";
import { DeleteButton } from "@/components/delete-button";
import { deleteSermon } from "@/app/(pastor)/pastor/actions";
import { SermonForm } from "@/app/(pastor)/pastor/sermons/sermon-form";
import { LivestreamForm } from "./livestream-form";

export const metadata: Metadata = { title: "Media" };

/**
 * Full sermon media management, not just a read-only mirror of the
 * pastor workspace's sermon planner — anyone with sermons.manage (the
 * media team coordinator, content editors, church_admin, and
 * super_admin, all already granted it) manages it from here directly,
 * and the same content shows up at /pastor/sermons for the pastor. Admin
 * always has this too, as the fallback if the person who'd normally
 * handle it isn't available.
 */
export default async function AdminMediaPage() {
  const organizationId = await getOrganizationId();
  const permissions = await getUserPermissions(organizationId ?? "");
  if (!permissions.has("sermons.manage")) return <AccessDenied />;

  const supabase = await createClient();
  const [{ data: sermons }, { data: campus }] = await Promise.all([
    supabase
      .from("sermons")
      .select("id, title, status, preached_at").throwOnError()
      .eq("organization_id", organizationId ?? "")
      .order("preached_at", { ascending: false }),
    permissions.has("media.manage")
      ? supabase.from("campuses").select("livestream_url").throwOnError().eq("organization_id", organizationId ?? "").eq("is_primary", true).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1>Media</h1>
          <p>Publish and manage sermon records — powers the public sermon library and the homepage&apos;s latest message.</p>
        </div>
      </div>

      {permissions.has("media.manage") && (
        <div className="panel">
          <h2>Live page</h2>
          <p className="form-note">
            Powers the <Link href="/live">Live page</Link>&apos;s player. A YouTube channel link keeps showing whatever
            you&apos;re currently streaming with nothing to update each week; a one-off video or Facebook link works too,
            but has to be replaced after each stream.
          </p>
          <LivestreamForm currentUrl={campus?.livestream_url ?? null} />
        </div>
      )}

      <div className="panel">
        <h2>New sermon</h2>
        <SermonForm returnTo="/admin/media" />
      </div>

      <div className="panel">
        <h2>All sermons</h2>
        {(!sermons || sermons.length === 0) && <p className="panel-empty">No sermons yet.</p>}
        <div className="data-table-wrap">
          {sermons && sermons.length > 0 && (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Preached</th>
                  <th>Status</th>
                  <th />
                  <th />
                </tr>
              </thead>
              <tbody>
                {sermons.map((s) => (
                  <tr key={s.id}>
                    <td>{s.title}</td>
                    <td>{s.preached_at}</td>
                    <td>
                      <span className={`badge ${s.status === "published" ? "" : "gray"}`}>{s.status}</span>
                    </td>
                    <td>
                      <a href={`/pastor/sermons/${s.id}?from=admin`}>Edit</a>
                    </td>
                    <td>
                      <DeleteButton action={deleteSermon} id={s.id} confirmText={`Delete "${s.title}" permanently?`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
