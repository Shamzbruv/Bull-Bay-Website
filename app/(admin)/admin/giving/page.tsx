import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationId, getUserPermissions } from "@/lib/auth/session";
import { AccessDenied } from "@/components/access-denied";
import { formatJmd } from "@/lib/money";
import { FundForm } from "./fund-form";
import { CompleteButton } from "./complete-button";

export const metadata: Metadata = { title: "Giving" };

export default async function AdminGivingPage() {
  const organizationId = await getOrganizationId();
  const permissions = await getUserPermissions(organizationId ?? "");
  if (!permissions.has("giving.read")) return <AccessDenied />;
  const canManage = permissions.has("giving.manage");

  const supabase = await createClient();
  const [{ data: funds }, { data: donations }] = await Promise.all([
    supabase.from("funds").select("id, name, code, is_active").eq("organization_id", organizationId ?? "").order("name"),
    supabase
      .from("donations")
      .select("id, donor_name, donor_email, amount_minor, status, created_at, donation_allocations(funds(name))")
      .eq("organization_id", organizationId ?? "")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const totalCompleted = (donations ?? []).filter((d) => d.status === "completed").reduce((s, d) => s + d.amount_minor, 0);
  const totalPending = (donations ?? []).filter((d) => d.status === "pending").reduce((s, d) => s + d.amount_minor, 0);

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1>Giving</h1>
          <p>Funds, donation ledger, and reconciliation.</p>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <b>{formatJmd(totalCompleted)}</b>
          <span>Confirmed giving</span>
        </div>
        <div className="stat-card">
          <b>{formatJmd(totalPending)}</b>
          <span>Pending intents (no live gateway yet)</span>
        </div>
      </div>

      {canManage && (
        <div className="panel">
          <h2>Funds</h2>
          {funds?.map((f) => (
            <div key={f.id} style={{ padding: "6px 0" }}>
              {f.name} <span className="badge gray">{f.code}</span>
            </div>
          ))}
          <div style={{ marginTop: 16 }}>
            <FundForm />
          </div>
        </div>
      )}

      <div className="panel">
        <h2>Donation ledger</h2>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Donor</th>
                <th>Fund</th>
                <th>Amount</th>
                <th>Status</th>
                {canManage && <th />}
              </tr>
            </thead>
            <tbody>
              {donations?.map((d) => {
                const allocations = (d.donation_allocations ?? []) as unknown as { funds: { name: string } | null }[];
                return (
                  <tr key={d.id}>
                    <td>{new Date(d.created_at).toLocaleDateString("en-JM", { dateStyle: "medium", timeZone: "America/Jamaica" })}</td>
                    <td>{d.donor_name ?? d.donor_email ?? "Anonymous"}</td>
                    <td>{allocations.map((a) => a.funds?.name).join(", ")}</td>
                    <td>{formatJmd(d.amount_minor)}</td>
                    <td>
                      <span className="badge">{d.status}</span>
                    </td>
                    {canManage && <td>{d.status === "pending" && <CompleteButton donationId={d.id} />}</td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {(!donations || donations.length === 0) && <p className="panel-empty">No gifts recorded yet.</p>}
      </div>
    </>
  );
}
