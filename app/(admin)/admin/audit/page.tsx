import type { Metadata } from "next";
import { Fragment } from "react";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationId, getUserPermissions } from "@/lib/auth/session";
import { AccessDenied } from "@/components/access-denied";

export const metadata: Metadata = { title: "Audit Log" };

/** "member.invited" -> "Member invited" */
function actionLabel(action: string) {
  const spaced = action.replaceAll(".", " ").replaceAll("_", " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function dayGroup(date: Date) {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (sameDay(date, today)) return "Today";
  if (sameDay(date, yesterday)) return "Yesterday";
  return date.toLocaleDateString("en-JM", { dateStyle: "full", timeZone: "America/Jamaica" });
}

export default async function AdminAuditPage() {
  const organizationId = await getOrganizationId();
  const permissions = await getUserPermissions(organizationId ?? "");
  if (!permissions.has("roles.manage")) return <AccessDenied />;

  const supabase = await createClient();
  const { data: logs } = await supabase
    .from("audit_logs")
    .select("id, actor_id, action, entity_type, entity_id, metadata, created_at")
    .eq("organization_id", organizationId ?? "")
    .order("created_at", { ascending: false })
    .limit(200);

  // audit_logs.actor_id points at auth.users, not profiles, so PostgREST
  // can't auto-join it — look the names up ourselves in one extra query.
  const actorIds = Array.from(new Set((logs ?? []).map((l) => l.actor_id).filter((id): id is string => Boolean(id))));
  const { data: actors } =
    actorIds.length > 0
      ? await supabase.from("profiles").select("auth_user_id, first_name, last_name, email").in("auth_user_id", actorIds)
      : { data: [] };
  const actorNames = new Map(
    (actors ?? []).map((a) => [a.auth_user_id, [a.first_name, a.last_name].filter(Boolean).join(" ") || a.email || "Unknown"]),
  );

  let lastGroup = "";

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1>Audit Log</h1>
          <p>Accountability trail for role changes, refunds, and access grants — every entry ties back to who did it.</p>
        </div>
      </div>
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>When</th>
              <th>Who</th>
              <th>Action</th>
              <th>Entity</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {logs?.map((l) => {
              const createdAt = new Date(l.created_at);
              const group = dayGroup(createdAt);
              const showGroup = group !== lastGroup;
              lastGroup = group;
              const who = l.actor_id ? (actorNames.get(l.actor_id) ?? "Unknown") : "System";
              const hasDetails = l.metadata && Object.keys(l.metadata as object).length > 0;
              return (
                <Fragment key={l.id}>
                  {showGroup && (
                    <tr key={`${l.id}-group`}>
                      <td colSpan={5} style={{ background: "var(--color-surface-sunken, #f4f5f2)", fontWeight: 700, fontSize: ".72rem", letterSpacing: ".04em", textTransform: "uppercase", color: "var(--color-muted)" }}>
                        {group}
                      </td>
                    </tr>
                  )}
                  <tr key={l.id}>
                    <td>{createdAt.toLocaleTimeString("en-JM", { timeStyle: "short", timeZone: "America/Jamaica" })}</td>
                    <td>
                      <strong>{who}</strong>
                    </td>
                    <td>
                      <span className="badge blue">{actionLabel(l.action)}</span>
                    </td>
                    <td>
                      {l.entity_type ? `${l.entity_type} ${l.entity_id ? `#${l.entity_id.slice(0, 8)}` : ""}` : "—"}
                    </td>
                    <td>
                      {hasDetails && (
                        <details>
                          <summary style={{ cursor: "pointer", fontSize: ".78rem", color: "var(--color-blue-600)" }}>View details</summary>
                          <pre
                            style={{
                              marginTop: 8,
                              padding: 10,
                              borderRadius: 8,
                              background: "var(--color-surface)",
                              fontSize: ".72rem",
                              whiteSpace: "pre-wrap",
                              wordBreak: "break-word",
                              maxWidth: 360,
                            }}
                          >
                            {JSON.stringify(l.metadata, null, 2)}
                          </pre>
                        </details>
                      )}
                    </td>
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      {(!logs || logs.length === 0) && <p className="panel-empty">No audited events yet.</p>}
    </>
  );
}
