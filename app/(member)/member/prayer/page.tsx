import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { MemberPrayerForm } from "./member-prayer-form";

export const metadata: Metadata = { title: "Prayer Request" };

export default async function MemberPrayerPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const { data: myRequests } = profile
    ? await supabase
        .from("prayer_requests")
        .select("id, request_body, visibility, status, created_at")
        .eq("submitter_profile_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(20)
    : { data: null };

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1>Prayer Request</h1>
          <p>You don&apos;t have to carry it alone — send your request straight to the pastor and prayer team.</p>
        </div>
      </div>

      <div className="panel">
        <MemberPrayerForm />
      </div>

      <div className="panel">
        <h2>Your requests</h2>
        {(!myRequests || myRequests.length === 0) && <p className="panel-empty">You haven&apos;t sent a prayer request yet.</p>}
        {myRequests?.map((r) => (
          <div key={r.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--color-border)" }}>
            <p style={{ margin: 0, fontSize: ".88rem", whiteSpace: "pre-wrap" }}>{r.request_body}</p>
            <small style={{ color: "var(--color-muted)" }}>
              {new Date(r.created_at).toLocaleDateString("en-JM", { dateStyle: "medium" })} •{" "}
              {r.visibility === "confidential" ? "Confidential" : "Prayer team"} • <span className="badge">{r.status}</span>
            </small>
          </div>
        ))}
      </div>
    </>
  );
}
