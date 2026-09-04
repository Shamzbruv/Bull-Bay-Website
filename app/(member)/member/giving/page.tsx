import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { getActiveFunds } from "@/lib/data/public";
import { formatJmd } from "@/lib/money";
import { GivingForm } from "@/app/(public)/give/giving-form";

export const metadata: Metadata = { title: "My Giving" };

export default async function MyGivingPage() {
  const [profile, funds] = await Promise.all([getCurrentProfile(), getActiveFunds()]);
  const supabase = await createClient();
  const { data: donations } = await supabase
    .from("donations")
    .select("id, amount_minor, status, receipt_number, created_at, donation_allocations(amount_minor, funds(name))")
    .eq("donor_profile_id", profile?.id ?? "")
    .order("created_at", { ascending: false });

  const total = (donations ?? []).filter((d) => d.status === "completed").reduce((s, d) => s + d.amount_minor, 0);

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1>My Giving</h1>
          <p>Give directly from here, and see your full giving history and receipts.</p>
        </div>
      </div>

      {funds.length > 0 && (
        <div className="panel">
          <h2>Give now</h2>
          <GivingForm funds={funds.map((f) => ({ id: f.id, name: f.name }))} signedIn />
        </div>
      )}

      <div className="stat-grid">
        <div className="stat-card">
          <b>{formatJmd(total)}</b>
          <span>Total given</span>
        </div>
        <div className="stat-card">
          <b>{donations?.length ?? 0}</b>
          <span>Gifts recorded</span>
        </div>
      </div>
      <div className="panel">
        <h2>History</h2>
        {(!donations || donations.length === 0) && <p className="panel-empty">No gifts recorded yet.</p>}
        <div className="data-table-wrap">
          {donations && donations.length > 0 && (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Fund</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Receipt</th>
                </tr>
              </thead>
              <tbody>
                {donations.map((d) => {
                  const allocations = (d.donation_allocations ?? []) as unknown as { amount_minor: number; funds: { name: string } | null }[];
                  return (
                    <tr key={d.id}>
                      <td>{new Date(d.created_at).toLocaleDateString("en-JM", { dateStyle: "medium", timeZone: "America/Jamaica" })}</td>
                      <td>{allocations.map((a) => a.funds?.name).join(", ")}</td>
                      <td>{formatJmd(d.amount_minor)}</td>
                      <td>
                        <span className="badge">{d.status}</span>
                      </td>
                      <td>{d.receipt_number ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
