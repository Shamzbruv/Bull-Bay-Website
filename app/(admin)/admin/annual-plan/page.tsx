import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationId, getUserPermissions } from "@/lib/auth/session";
import { AccessDenied } from "@/components/access-denied";
import { PlanItemForm } from "./plan-item-form";
import { PromoteForm } from "./promote-form";
import { StatusSelect } from "./status-select";

export const metadata: Metadata = { title: "Annual Plan" };

const MONTH_ORDER = ["September", "October", "November", "December", "January", "February", "March", "April", "May", "June", "July", "August"];

export default async function AdminAnnualPlanPage() {
  const organizationId = await getOrganizationId();
  const permissions = await getUserPermissions(organizationId ?? "");
  if (!permissions.has("events.manage")) return <AccessDenied />;

  const supabase = await createClient();
  const { data: churchYear } = await supabase.from("church_years").select("id, label").eq("status", "active").maybeSingle();
  const { data: items } = await supabase
    .from("annual_plan_items")
    .select("*")
    .eq("church_year_id", churchYear?.id ?? "")
    .order("month");

  const sorted = [...(items ?? [])].sort((a, b) => MONTH_ORDER.indexOf(a.month) - MONTH_ORDER.indexOf(b.month));

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1>Annual Plan {churchYear?.label}</h1>
          <p>Month-only actions from the church calendar. Promote an item to a real event once it has a confirmed date.</p>
        </div>
      </div>

      <div className="panel">
        <h2>Add a plan item</h2>
        <PlanItemForm />
      </div>

      <div className="panel">
        <h2>All plan items</h2>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Month</th>
                <th>Title</th>
                <th>Category</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((item) => (
                <tr key={item.id}>
                  <td>{item.month}</td>
                  <td>{item.title}</td>
                  <td>{item.category}</td>
                  <td>
                    <StatusSelect id={item.id} status={item.status} />
                  </td>
                  <td>{!item.event_id && item.status !== "cancelled" && <PromoteForm itemId={item.id} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(!items || items.length === 0) && <p className="panel-empty">No plan items yet.</p>}
      </div>
    </>
  );
}
