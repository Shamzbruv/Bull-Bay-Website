import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationId } from "@/lib/auth/session";
import { DeleteButton } from "@/components/delete-button";
import { deleteSermon } from "@/app/(pastor)/pastor/actions";
import { SermonForm } from "./sermon-form";

export const metadata: Metadata = { title: "Sermons" };

export default async function PastorSermonsPage() {
  const organizationId = await getOrganizationId();
  const supabase = await createClient();
  const { data: sermons } = await supabase
    .from("sermons")
    .select("id, title, status, preached_at, slug")
    .eq("organization_id", organizationId ?? "")
    .order("preached_at", { ascending: false });

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1>Sermons</h1>
          <p>Publish and manage sermon records — powers the public sermon library.</p>
        </div>
      </div>

      <div className="panel">
        <h2>New sermon</h2>
        <SermonForm />
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
                      <Link href={`/pastor/sermons/${s.id}`}>Edit</Link>
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
