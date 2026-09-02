import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { HouseholdForm } from "./household-form";

export const metadata: Metadata = { title: "My Household" };

export default async function HouseholdPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  let householdName = "";
  let members: { id: string; first_name: string | null; last_name: string | null }[] = [];
  if (profile?.household_id) {
    const { data: household } = await supabase.from("households").select("name").eq("id", profile.household_id).single();
    householdName = household?.name ?? "";
    const { data: memberRows } = await supabase
      .from("profiles")
      .select("id, first_name, last_name")
      .eq("household_id", profile.household_id);
    members = memberRows ?? [];
  }

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1>My Household</h1>
          <p>Manage your family/household record.</p>
        </div>
      </div>
      {members.length > 0 && (
        <div className="panel">
          <h2>Household members</h2>
          {members.map((m) => (
            <div key={m.id} style={{ padding: "6px 0" }}>
              {m.first_name} {m.last_name}
            </div>
          ))}
        </div>
      )}
      <HouseholdForm initialName={householdName} />
    </>
  );
}
