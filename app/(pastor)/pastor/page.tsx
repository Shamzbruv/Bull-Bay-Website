import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationId, getUserPermissions } from "@/lib/auth/session";
import { formatJmd } from "@/lib/money";
import { TrendAreaChart, ComparisonBarChart } from "@/components/charts";
import { BroadcastForm } from "./broadcast-form";

export const metadata: Metadata = { title: "Pastor Workspace" };

const MONTH_LABEL = (d: Date) => d.toLocaleDateString("en-JM", { month: "short" });

export default async function PastorDashboardPage() {
  const organizationId = await getOrganizationId();
  const permissions = organizationId ? await getUserPermissions(organizationId) : new Set<string>();
  const canSeeGiving = permissions.has("giving.read") || permissions.has("giving.manage");
  const canBroadcast = permissions.has("broadcasts.send");
  const supabase = await createClient();

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5, 1);

  const [
    { data: prayers },
    { data: cases },
    { count: draftSermons },
    { count: pendingDocs },
    { count: openCounsel },
    { count: memberCount },
    { data: recentAttendance },
    { data: recentProfiles },
    { data: recentDonations },
    { data: broadcasts },
  ] = await Promise.all([
    supabase
      .from("prayer_requests")
      .select("id, submitter_name, request_body, status, created_at")
      .eq("organization_id", organizationId ?? "")
      .in("status", ["new", "in_progress"])
      .order("created_at", { ascending: false })
      .limit(6),
    supabase.from("care_cases").select("id, category, status").eq("organization_id", organizationId ?? "").neq("status", "closed"),
    supabase.from("sermons").select("id", { count: "exact", head: true }).eq("organization_id", organizationId ?? "").eq("status", "draft"),
    supabase.from("document_requests").select("id", { count: "exact", head: true }).in("status", ["submitted", "in_review", "prepared", "pending_pastor"]),
    supabase.from("counsel_requests").select("id", { count: "exact", head: true }).eq("status", "requested"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("organization_id", organizationId ?? "").in("membership_status", ["member", "attendee"]),
    supabase.from("attendance_records").select("service_date, headcount").order("service_date", { ascending: false }).limit(60),
    supabase.from("profiles").select("created_at").eq("organization_id", organizationId ?? "").gte("created_at", sixMonthsAgo.toISOString()),
    canSeeGiving
      ? supabase.from("donations").select("amount_minor, created_at").eq("organization_id", organizationId ?? "").eq("status", "completed").gte("created_at", sixMonthsAgo.toISOString())
      : Promise.resolve({ data: null }),
    supabase.from("pastor_broadcasts").select("id, title, body, created_at").order("created_at", { ascending: false }).limit(5),
  ]);

  // Attendance: sum headcount per service_date, last 8 distinct weeks.
  const byDate = new Map<string, number>();
  for (const r of recentAttendance ?? []) byDate.set(r.service_date, (byDate.get(r.service_date) ?? 0) + r.headcount);
  const attendanceTrend = [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-8)
    .map(([date, total]) => ({ label: new Date(date).toLocaleDateString("en-JM", { month: "short", day: "numeric" }), attendance: total }));

  // Membership growth + giving, bucketed by month for the last 6 months.
  const months: { key: string; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: MONTH_LABEL(d) });
  }
  const growthByMonth = new Map(months.map((m) => [m.key, 0]));
  for (const p of recentProfiles ?? []) {
    const d = new Date(p.created_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (growthByMonth.has(key)) growthByMonth.set(key, (growthByMonth.get(key) ?? 0) + 1);
  }
  const membershipTrend = months.map((m) => ({ label: m.label, newMembers: growthByMonth.get(m.key) ?? 0 }));

  const givingByMonth = new Map(months.map((m) => [m.key, 0]));
  for (const d of recentDonations ?? []) {
    const dt = new Date(d.created_at);
    const key = `${dt.getFullYear()}-${dt.getMonth()}`;
    if (givingByMonth.has(key)) givingByMonth.set(key, (givingByMonth.get(key) ?? 0) + d.amount_minor);
  }
  const givingTrend = months.map((m) => ({ label: m.label, giving: Math.round((givingByMonth.get(m.key) ?? 0) / 100) }));

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1>Today</h1>
          <p>A run-down of the whole church — attendance, growth, giving, and what needs your attention.</p>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <b>{memberCount ?? 0}</b>
          <span>Active members</span>
        </div>
        <div className="stat-card">
          <b>{attendanceTrend.at(-1)?.attendance ?? "—"}</b>
          <span>Last recorded attendance</span>
        </div>
        <div className="stat-card">
          <b>{prayers?.length ?? 0}</b>
          <span>Prayer requests to review</span>
        </div>
        <div className="stat-card">
          <b>{cases?.length ?? 0}</b>
          <span>Open pastoral care cases</span>
        </div>
        <div className="stat-card">
          <b>{openCounsel ?? 0}</b>
          <span>Counsel requests waiting</span>
        </div>
        <div className="stat-card">
          <b>{pendingDocs ?? 0}</b>
          <span>Documents to certify/prepare</span>
        </div>
        <div className="stat-card">
          <b>{draftSermons ?? 0}</b>
          <span>Sermons in draft</span>
        </div>
      </div>

      <div className="panel">
        <h2>Attendance, last 8 recorded services</h2>
        {attendanceTrend.length > 0 ? (
          <TrendAreaChart data={attendanceTrend} dataKey="attendance" label="Attendance" />
        ) : (
          <p className="panel-empty">No attendance recorded yet — the secretary team logs this weekly.</p>
        )}
      </div>

      <div className="panel">
        <h2>Membership growth, last 6 months</h2>
        <ComparisonBarChart data={membershipTrend} bars={[{ key: "newMembers", label: "New profiles" }]} />
      </div>

      {canSeeGiving && (
        <div className="panel">
          <h2>Giving, last 6 months</h2>
          <TrendAreaChart data={givingTrend} dataKey="giving" label="Giving (JMD)" formatter={(v) => formatJmd(v * 100)} />
          <Link className="link-button" href="/admin/giving">
            Open the finance dashboard <span>→</span>
          </Link>
        </div>
      )}

      {canBroadcast && (
        <div className="panel">
          <h2>From the Pastor&apos;s Desk</h2>
          <p className="form-note">Sent straight to every member&apos;s dashboard.</p>
          <BroadcastForm />
          {broadcasts && broadcasts.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <h3 style={{ fontSize: ".9rem" }}>Recently sent</h3>
              {broadcasts.map((b) => (
                <div key={b.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--color-border)" }}>
                  <b style={{ fontSize: ".88rem" }}>{b.title}</b>
                  <p style={{ margin: "2px 0 0", fontSize: ".82rem", color: "var(--color-muted-2)" }}>
                    {new Date(b.created_at).toLocaleDateString("en-JM", { dateStyle: "medium" })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="panel">
        <h2>Prayer requests</h2>
        {(!prayers || prayers.length === 0) && <p className="panel-empty">Nothing pending — great work.</p>}
        {prayers?.map((p) => (
          <div key={p.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--color-border)" }}>
            <p style={{ margin: 0, fontSize: ".88rem" }}>{p.request_body}</p>
            <small style={{ color: "var(--color-muted)" }}>
              {p.submitter_name ?? "Anonymous"} • {new Date(p.created_at).toLocaleDateString("en-JM")}
            </small>
          </div>
        ))}
        <Link className="link-button" href="/pastor/care">
          View pastoral care <span>→</span>
        </Link>
      </div>
    </>
  );
}
