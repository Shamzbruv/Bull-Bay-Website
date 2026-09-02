import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/session";

export const metadata: Metadata = { title: "My Groups" };

export default async function MyGroupsPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const { data: memberships } = await supabase
    .from("group_members")
    .select("id, role, status, groups(name, slug)")
    .eq("profile_id", profile?.id ?? "");

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1>My Groups</h1>
          <p>Small groups and ministries you&apos;re part of.</p>
        </div>
      </div>
      <div className="panel">
        {(!memberships || memberships.length === 0) && <p className="panel-empty">You haven&apos;t joined a group yet.</p>}
        {memberships?.map((m) => {
          const group = m.groups as unknown as { name: string; slug: string } | null;
          if (!group) return null;
          return (
            <div key={m.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--color-border)" }}>
              <Link href={`/groups/${group.slug}`}>{group.name}</Link>
              <span className="badge">{m.status === "requested" ? "Pending approval" : m.role}</span>
            </div>
          );
        })}
        <Link className="link-button" href="/groups" style={{ marginTop: 16 }}>
          Find another group <span>→</span>
        </Link>
      </div>
    </>
  );
}
