import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationId, getUserPermissions } from "@/lib/auth/session";
import { AccessDenied } from "@/components/access-denied";
import { formatJmd } from "@/lib/money";
import { TrendAreaChart, BreakdownPieChart } from "@/components/charts";
import { FundForm } from "./fund-form";
import { CompleteButton } from "./complete-button";
import { ExpenseForm, InServiceGivingForm } from "./finance-forms";

export const metadata: Metadata = { title: "Finance" };

export default async function AdminGivingPage() {
  const organizationId = await getOrganizationId();
  const permissions = await getUserPermissions(organizationId ?? "");
  if (!permissions.has("giving.read") && !permissions.has("giving.manage")) return <AccessDenied />;
  const canManage = permissions.has("giving.manage");

  const supabase = await createClient();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5, 1);

  const [{ data: funds }, { data: donations }, { data: expenses }, { data: recentSales }] = await Promise.all([
    supabase.from("funds").select("id, name, code, is_active").eq("organization_id", organizationId ?? "").order("name"),
    supabase
      .from("donations")
      .select("id, donor_name, donor_email, amount_minor, status, created_at, donation_allocations(amount_minor, funds(name))")
      .eq("organization_id", organizationId ?? "")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("expenses")
      .select("id, category, vendor, description, amount_minor, expense_date, created_at")
      .eq("organization_id", organizationId ?? "")
      .order("expense_date", { ascending: false })
      .limit(100),
    supabase
      .from("payments")
      .select("id, amount_minor, status, provider, created_at, orders(order_number, customer_name)")
      .eq("organization_id", organizationId ?? "")
      .eq("status", "succeeded")
      .order("created_at", { ascending: false })
      .limit(15),
  ]);

  const completedDonations = (donations ?? []).filter((d) => d.status === "completed");
  const totalCompleted = completedDonations.reduce((s, d) => s + d.amount_minor, 0);
  const totalPending = (donations ?? []).filter((d) => d.status === "pending").reduce((s, d) => s + d.amount_minor, 0);
  const totalExpenses = (expenses ?? []).reduce((s, e) => s + e.amount_minor, 0);
  const netPosition = totalCompleted - totalExpenses;

  // Income vs. expenses, last 6 months.
  const months: { key: string; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString("en-JM", { month: "short" }) });
  }
  const monthKey = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${d.getMonth()}`;
  };
  const incomeByMonth = new Map(months.map((m) => [m.key, 0]));
  for (const d of completedDonations) {
    const k = monthKey(d.created_at);
    if (incomeByMonth.has(k)) incomeByMonth.set(k, (incomeByMonth.get(k) ?? 0) + d.amount_minor);
  }
  const expenseByMonth = new Map(months.map((m) => [m.key, 0]));
  for (const e of expenses ?? []) {
    const k = monthKey(e.expense_date);
    if (expenseByMonth.has(k)) expenseByMonth.set(k, (expenseByMonth.get(k) ?? 0) + e.amount_minor);
  }
  const netTrend = months.map((m) => ({ label: m.label, net: Math.round(((incomeByMonth.get(m.key) ?? 0) - (expenseByMonth.get(m.key) ?? 0)) / 100) }));

  // Fund breakdown, from completed donation allocations.
  const fundTotals = new Map<string, number>();
  for (const d of completedDonations) {
    const allocations = (d.donation_allocations ?? []) as unknown as { amount_minor: number; funds: { name: string } | null }[];
    for (const a of allocations) {
      const name = a.funds?.name ?? "Unallocated";
      fundTotals.set(name, (fundTotals.get(name) ?? 0) + a.amount_minor / 100);
    }
  }
  const fundBreakdown = [...fundTotals.entries()].map(([name, value]) => ({ name, value: Math.round(value) }));

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1>Finance</h1>
          <p>Giving, expenses, and every shop sale — the church&apos;s full financial picture in one place.</p>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <b>{formatJmd(totalCompleted)}</b>
          <span>Confirmed giving</span>
        </div>
        <div className="stat-card">
          <b>{formatJmd(totalExpenses)}</b>
          <span>Recorded expenses</span>
        </div>
        <div className="stat-card">
          <b style={{ color: netPosition >= 0 ? "var(--color-olive-700)" : "#a8341f" }}>{formatJmd(netPosition)}</b>
          <span>Net position</span>
        </div>
        <div className="stat-card">
          <b>{formatJmd(totalPending)}</b>
          <span>Pending intents</span>
        </div>
      </div>

      <div className="panel">
        <h2>Income vs. expenses, last 6 months</h2>
        <TrendAreaChart data={netTrend} dataKey="net" label="Net (JMD)" formatter={(v) => formatJmd(v * 100)} />
      </div>

      {fundBreakdown.length > 0 && (
        <div className="panel">
          <h2>Giving by fund</h2>
          <BreakdownPieChart data={fundBreakdown} />
        </div>
      )}

      {canManage && (
        <>
          <div className="panel">
            <h2>Record in-service giving</h2>
            <p className="form-note">Cash, cheque, or bank collections that didn&apos;t come through the online form.</p>
            <InServiceGivingForm funds={(funds ?? []).map((f) => ({ id: f.id, name: f.name }))} />
          </div>

          <div className="panel">
            <h2>Record an expense</h2>
            <ExpenseForm funds={(funds ?? []).map((f) => ({ id: f.id, name: f.name }))} />
          </div>

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
        </>
      )}

      <div className="panel">
        <h2>Recent shop sales</h2>
        {(!recentSales || recentSales.length === 0) && <p className="panel-empty">No completed sales yet.</p>}
        {recentSales?.map((s) => {
          const order = s.orders as unknown as { order_number: string; customer_name: string | null } | null;
          return (
            <div key={s.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--color-border)", fontSize: ".88rem" }}>
              <span>
                {order?.order_number} — {order?.customer_name ?? "Guest"}
              </span>
              <b>{formatJmd(s.amount_minor)}</b>
            </div>
          );
        })}
      </div>

      <div className="panel">
        <h2>Expense ledger</h2>
        {(!expenses || expenses.length === 0) && <p className="panel-empty">No expenses recorded yet.</p>}
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Vendor</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {expenses?.map((e) => (
                <tr key={e.id}>
                  <td>{new Date(e.expense_date).toLocaleDateString("en-JM", { dateStyle: "medium" })}</td>
                  <td>{e.category}</td>
                  <td>{e.vendor}</td>
                  <td>{formatJmd(e.amount_minor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
