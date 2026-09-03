import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationId, getUserPermissions } from "@/lib/auth/session";
import { AccessDenied } from "@/components/access-denied";
import { AttendanceSubmitForm, ScheduleForm, ScheduleToggle } from "./attendance-forms";

export const metadata: Metadata = { title: "Attendance" };

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function AdminAttendancePage() {
  const organizationId = await getOrganizationId();
  const permissions = await getUserPermissions(organizationId ?? "");
  const canManage = permissions.has("attendance.manage");
  const canSubmit = canManage || permissions.has("attendance.submit");
  if (!canSubmit) return <AccessDenied />;

  const supabase = await createClient();
  const [{ data: schedules }, { data: recent }] = await Promise.all([
    supabase.from("service_schedules").select("id, label, day_of_week, service_time, is_active").order("day_of_week"),
    supabase
      .from("attendance_records")
      .select("id, service_date, headcount, notes, service_schedules(label)")
      .order("service_date", { ascending: false })
      .limit(20),
  ]);

  const activeSchedules = (schedules ?? []).filter((s) => s.is_active);

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1>Attendance</h1>
          <p>
            Record the headcount for each scheduled service — ideally right after service, by 1PM Sundays for the
            Sunday count. Members see this on their dashboard right away.
          </p>
        </div>
      </div>

      {canManage && (
        <div className="panel">
          <h2>Weekly service schedule</h2>
          <p className="form-note">Set by the pastor or church exec — this is what attendance gets recorded against.</p>
          {schedules?.map((s) => (
            <div key={s.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--color-border)" }}>
              <span>
                {s.label} — {DAY_NAMES[s.day_of_week]}s at {s.service_time.slice(0, 5)}
              </span>
              <ScheduleToggle id={s.id} isActive={s.is_active} />
            </div>
          ))}
          <div style={{ marginTop: 16 }}>
            <ScheduleForm />
          </div>
        </div>
      )}

      <div className="panel">
        <h2>Record this week&apos;s attendance</h2>
        {activeSchedules.length === 0 ? (
          <p className="panel-empty">No active services set up yet.</p>
        ) : (
          <AttendanceSubmitForm schedules={activeSchedules.map((s) => ({ id: s.id, label: s.label }))} />
        )}
      </div>

      <div className="panel">
        <h2>Recent submissions</h2>
        {(!recent || recent.length === 0) && <p className="panel-empty">Nothing recorded yet.</p>}
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Service</th>
                <th>Headcount</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {recent?.map((r) => {
                const schedule = r.service_schedules as unknown as { label: string } | null;
                return (
                  <tr key={r.id}>
                    <td>{new Date(r.service_date).toLocaleDateString("en-JM", { dateStyle: "medium" })}</td>
                    <td>{schedule?.label}</td>
                    <td>{r.headcount}</td>
                    <td>{r.notes}</td>
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
