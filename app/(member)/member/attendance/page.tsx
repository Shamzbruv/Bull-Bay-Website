import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { TrendAreaChart } from "@/components/charts";

export const metadata: Metadata = { title: "Attendance" };

export default async function MemberAttendancePage() {
  const supabase = await createClient();
  const { data: records } = await supabase
    .from("attendance_records")
    .select("id, service_date, headcount, service_schedules(label)")
    .order("service_date", { ascending: false })
    .limit(52);

  const trend = [...(records ?? [])]
    .reverse()
    .slice(-10)
    .map((r) => ({ label: new Date(r.service_date).toLocaleDateString("en-JM", { month: "short", day: "numeric" }), attendance: r.headcount }));

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1>Attendance</h1>
          <p>How many people were at each recent service — recorded by the church office right after service.</p>
        </div>
      </div>

      <div className="panel">
        <h2>Recent trend</h2>
        {trend.length > 0 ? <TrendAreaChart data={trend} dataKey="attendance" label="Attendance" /> : <p className="panel-empty">No attendance recorded yet.</p>}
      </div>

      <div className="panel">
        <h2>History</h2>
        {(!records || records.length === 0) && <p className="panel-empty">Nothing recorded yet.</p>}
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Service</th>
                <th>Attendance</th>
              </tr>
            </thead>
            <tbody>
              {records?.map((r) => {
                const schedule = r.service_schedules as unknown as { label: string } | null;
                return (
                  <tr key={r.id}>
                    <td>{new Date(r.service_date).toLocaleDateString("en-JM", { dateStyle: "medium" })}</td>
                    <td>{schedule?.label}</td>
                    <td>{r.headcount}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
