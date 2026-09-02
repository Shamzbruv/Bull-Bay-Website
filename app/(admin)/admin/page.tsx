import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationId } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Admin Dashboard" };

export default async function AdminDashboardPage() {
  const organizationId = await getOrganizationId();
  const supabase = await createClient();

  const [{ count: newVisitors }, { count: upcomingEvents }, { count: pendingOrders }, { count: pendingDonations }, { count: groupRequests }] =
    await Promise.all([
      supabase.from("contact_submissions").select("id", { count: "exact", head: true }).eq("organization_id", organizationId ?? "").eq("status", "new"),
      supabase.from("events").select("id", { count: "exact", head: true }).eq("organization_id", organizationId ?? "").eq("status", "published").gte("starts_at", new Date().toISOString()),
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("organization_id", organizationId ?? "").eq("status", "pending"),
      supabase.from("donations").select("id", { count: "exact", head: true }).eq("organization_id", organizationId ?? "").eq("status", "pending"),
      supabase.from("group_members").select("id", { count: "exact", head: true }).eq("status", "requested"),
    ]);

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p>What needs attention across the church platform.</p>
        </div>
      </div>
      <div className="stat-grid">
        <div className="stat-card">
          <b>{newVisitors ?? 0}</b>
          <span>New visitor enquiries</span>
        </div>
        <div className="stat-card">
          <b>{upcomingEvents ?? 0}</b>
          <span>Upcoming published events</span>
        </div>
        <div className="stat-card">
          <b>{pendingOrders ?? 0}</b>
          <span>Pending shop orders</span>
        </div>
        <div className="stat-card">
          <b>{pendingDonations ?? 0}</b>
          <span>Pending gift intents</span>
        </div>
        <div className="stat-card">
          <b>{groupRequests ?? 0}</b>
          <span>Group join requests</span>
        </div>
      </div>
    </>
  );
}
