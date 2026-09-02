import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { formatJmd } from "@/lib/money";
import { DownloadButton } from "./download-button";

export const metadata: Metadata = { title: "Orders & Downloads" };

export default async function MyOrdersPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const [{ data: orders }, { data: entitlements }] = await Promise.all([
    supabase
      .from("orders")
      .select("id, order_number, status, total_minor, created_at")
      .eq("customer_profile_id", profile?.id ?? "")
      .order("created_at", { ascending: false }),
    supabase
      .from("digital_entitlements")
      .select("id, revoked_at, expires_at, products(name)")
      .eq("profile_id", profile?.id ?? ""),
  ]);

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1>Orders &amp; Downloads</h1>
          <p>Your shop orders and any digital downloads you own.</p>
        </div>
      </div>

      <div className="panel">
        <h2>Orders</h2>
        {(!orders || orders.length === 0) && <p className="panel-empty">No orders yet.</p>}
        <div className="data-table-wrap">
          {orders && orders.length > 0 && (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td>{o.order_number}</td>
                    <td>{new Date(o.created_at).toLocaleDateString("en-JM", { dateStyle: "medium", timeZone: "America/Jamaica" })}</td>
                    <td>{formatJmd(o.total_minor)}</td>
                    <td>
                      <span className="badge">{o.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="panel">
        <h2>Downloads</h2>
        {(!entitlements || entitlements.length === 0) && <p className="panel-empty">No digital products yet.</p>}
        {entitlements?.map((e) => {
          const product = e.products as unknown as { name: string } | null;
          const revoked = Boolean(e.revoked_at);
          return (
            <div key={e.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--color-border)" }}>
              <span>{product?.name}</span>
              {revoked ? <span className="badge red">Revoked</span> : <DownloadButton entitlementId={e.id} />}
            </div>
          );
        })}
      </div>
    </>
  );
}
