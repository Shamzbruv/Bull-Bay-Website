import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { RequestHelpButton, RequestStatusActions } from "./request-button";

export const metadata: Metadata = { title: "Member Directory" };

export default async function DirectoryPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const [{ data: listings }, { data: received }, { data: sent }] = await Promise.all([
    supabase.from("professional_directory").select("profile_id, first_name, last_name, occupation, professional_bio").order("occupation"),
    profile
      ? supabase
          .from("professional_help_requests")
          .select("id, message, status, created_at, profiles:requester_profile_id(first_name, last_name)")
          .eq("target_profile_id", profile.id)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: null }),
    profile
      ? supabase
          .from("professional_help_requests")
          .select("id, message, status, created_at, profiles:target_profile_id(first_name, last_name)")
          .eq("requester_profile_id", profile.id)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: null }),
  ]);

  const others = (listings ?? []).filter((l): l is typeof l & { profile_id: string } => Boolean(l.profile_id) && l.profile_id !== profile?.id);

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1>Member Directory</h1>
          <p>Church family who&apos;ve offered to help each other out professionally — advice, services, or hiring.</p>
        </div>
      </div>

      {!profile?.open_to_professional_requests && (
        <div className="panel" style={{ background: "var(--color-surface-2)" }}>
          <p style={{ margin: 0, fontSize: ".88rem" }}>
            Want to be listed here too?{" "}
            <Link href="/member/profile" className="link-button" style={{ display: "inline" }}>
              Add your occupation on your profile
            </Link>
            .
          </p>
        </div>
      )}

      <div className="panel">
        <h2>Browse ({others.length})</h2>
        {others.length === 0 && <p className="panel-empty">No one is listed yet — be the first from your profile page.</p>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
          {others.map((l) => (
            <div key={l.profile_id} style={{ border: "1px solid var(--color-border)", borderRadius: 14, padding: 16 }}>
              <b>
                {l.first_name} {l.last_name}
              </b>
              <div>
                <span className="badge blue">{l.occupation}</span>
              </div>
              {l.professional_bio && <p style={{ fontSize: ".85rem", margin: "8px 0" }}>{l.professional_bio}</p>}
              <RequestHelpButton profileId={l.profile_id} name={l.first_name ?? "them"} />
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <h2>Requests you&apos;ve received</h2>
        {(!received || received.length === 0) && <p className="panel-empty">Nothing yet.</p>}
        {received?.map((r) => {
          const from = r.profiles as unknown as { first_name: string | null; last_name: string | null } | null;
          return (
            <div key={r.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--color-border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <b>
                  {from?.first_name} {from?.last_name}
                </b>
                <RequestStatusActions id={r.id} status={r.status} />
              </div>
              <p style={{ margin: "4px 0 0", fontSize: ".88rem" }}>{r.message}</p>
            </div>
          );
        })}
      </div>

      <div className="panel">
        <h2>Requests you&apos;ve sent</h2>
        {(!sent || sent.length === 0) && <p className="panel-empty">Nothing yet.</p>}
        {sent?.map((r) => {
          const to = r.profiles as unknown as { first_name: string | null; last_name: string | null } | null;
          return (
            <div key={r.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--color-border)", fontSize: ".88rem" }}>
              <span>
                {to?.first_name} {to?.last_name} — {r.message}
              </span>
              <span className="badge blue">{r.status}</span>
            </div>
          );
        })}
      </div>
    </>
  );
}
