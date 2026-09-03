import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { DAY_NAMES } from "@/lib/pastoral/reasons";
import { CounselRequestForm } from "./request-form";

export const metadata: Metadata = { title: "Pastor & Calendar" };

export default async function MemberCounselPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data: team } = await supabase
    .from("pastoral_team_members")
    .select("profile_id, role_title, is_pastor, is_trained_counselor, bio, profiles(first_name, last_name)")
    .eq("is_active", true)
    .order("is_pastor", { ascending: false })
    .order("sort_order");

  const pastor = team?.find((t) => t.is_pastor) ?? null;

  const [{ data: pastorHours }, { data: upcoming }, { data: myRequests }, { data: myTeamRow }] = await Promise.all([
    pastor
      ? supabase.from("pastoral_calendar_availability").select("day_of_week, start_time, end_time, label").eq("profile_id", pastor.profile_id).order("day_of_week")
      : Promise.resolve({ data: null }),
    pastor
      ? supabase
          .from("pastoral_calendar_events")
          .select("id, title, starts_at, ends_at, kind")
          .eq("profile_id", pastor.profile_id)
          .eq("visibility", "public")
          .gte("ends_at", new Date().toISOString())
          .order("starts_at")
          .limit(8)
      : Promise.resolve({ data: null }),
    profile
      ? supabase
          .from("counsel_requests")
          .select("id, reason, status, is_urgent, preferred_date, created_at, profiles:requested_with_profile_id(first_name, last_name)")
          .eq("requester_profile_id", profile.id)
          .order("created_at", { ascending: false })
          .limit(15)
      : Promise.resolve({ data: null }),
    profile ? supabase.from("pastoral_team_members").select("id").eq("profile_id", profile.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  const teamOptions = (team ?? []).map((t) => {
    const p = t.profiles as unknown as { first_name: string | null; last_name: string | null } | null;
    return {
      profileId: t.profile_id,
      name: `${p?.first_name ?? ""} ${p?.last_name ?? ""}`.trim() || t.role_title,
      isPastor: t.is_pastor,
      isTrainedCounselor: t.is_trained_counselor,
      roleTitle: t.role_title,
      bio: t.bio,
    };
  });

  const pastorName = pastor
    ? `${(pastor.profiles as unknown as { first_name: string | null; last_name: string | null } | null)?.first_name ?? ""} ${
        (pastor.profiles as unknown as { first_name: string | null; last_name: string | null } | null)?.last_name ?? ""
      }`.trim()
    : null;

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1>Pastor &amp; Calendar</h1>
          <p>See when the pastor is available, and request time with him or a member of the pastoral team.</p>
        </div>
        {myTeamRow && (
          <Link className="secondary-button compact" href="/member/team-calendar">
            Manage my calendar
          </Link>
        )}
      </div>

      <div className="panel">
        <h2>{pastorName ? `Pastor ${pastorName}'s hours` : "Pastor's hours"}</h2>
        {!pastor && <p className="panel-empty">The pastor&apos;s calendar hasn&apos;t been set up yet.</p>}
        {pastor && (
          <>
            {DAY_NAMES.map((day, i) => {
              const rows = pastorHours?.filter((h) => h.day_of_week === i) ?? [];
              return (
                <div key={day} style={{ padding: "6px 0", borderBottom: "1px solid var(--color-border)", fontSize: ".9rem" }}>
                  <b style={{ display: "inline-block", width: 100 }}>{day}</b>
                  {rows.length === 0 ? (
                    <span style={{ color: "var(--color-muted-2)" }}>Not available</span>
                  ) : (
                    rows.map((r, idx) => (
                      <span key={idx} style={{ marginRight: 12 }}>
                        {r.start_time.slice(0, 5)}–{r.end_time.slice(0, 5)} {r.label && `(${r.label})`}
                      </span>
                    ))
                  )}
                </div>
              );
            })}
            {upcoming && upcoming.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <h3 style={{ fontSize: ".92rem", marginBottom: 8 }}>Coming up</h3>
                {upcoming.map((e) => (
                  <div key={e.id} style={{ fontSize: ".85rem", padding: "4px 0" }}>
                    <span className="badge gray" style={{ marginRight: 8 }}>
                      {e.kind.replace("_", " ")}
                    </span>
                    {e.title} — {new Date(e.starts_at).toLocaleDateString("en-JM", { dateStyle: "medium" })}
                    {new Date(e.starts_at).toDateString() !== new Date(e.ends_at).toDateString() &&
                      ` to ${new Date(e.ends_at).toLocaleDateString("en-JM", { dateStyle: "medium" })}`}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        <p className="form-note" style={{ marginTop: 14 }}>
          Need something outside these hours? Send the request anyway — it will be flagged urgent so it isn&apos;t
          missed.
        </p>
      </div>

      <div className="panel">
        <h2>Request help from the pastoral team</h2>
        {teamOptions
          .filter((t) => !t.isPastor)
          .map((t) => (
            <div key={t.profileId} style={{ padding: "8px 0", borderBottom: "1px solid var(--color-border)" }}>
              <b>{t.name}</b> — {t.roleTitle}{" "}
              {t.isTrainedCounselor && <span className="badge blue">trained counselor</span>}
              {t.bio && <p style={{ margin: "4px 0 0", fontSize: ".82rem", color: "var(--color-muted-2)" }}>{t.bio}</p>}
            </div>
          ))}
        {teamOptions.filter((t) => !t.isPastor).length === 0 && <p className="panel-empty">No other pastoral team members listed yet.</p>}
      </div>

      <div className="panel">
        <h2>Request a meeting</h2>
        {teamOptions.length === 0 ? (
          <p className="panel-empty">Requests aren&apos;t available yet — check back soon.</p>
        ) : (
          <CounselRequestForm team={teamOptions} />
        )}
      </div>

      <div className="panel">
        <h2>Your requests</h2>
        {(!myRequests || myRequests.length === 0) && <p className="panel-empty">You haven&apos;t sent any requests yet.</p>}
        {myRequests?.map((r) => {
          const withWhom = r.profiles as unknown as { first_name: string | null; last_name: string | null } | null;
          return (
            <div key={r.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--color-border)", fontSize: ".88rem" }}>
              <span>
                {r.reason} — with {withWhom?.first_name} {withWhom?.last_name}
                {r.preferred_date && ` · ${new Date(r.preferred_date).toLocaleDateString("en-JM", { dateStyle: "medium" })}`}
              </span>
              <span>
                {r.is_urgent && <span className="badge gray" style={{ marginRight: 6 }}>urgent</span>}
                <span className="badge blue">{r.status}</span>
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}
