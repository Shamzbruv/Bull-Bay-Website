import type { Metadata } from "next";
import { TrendAreaChart, ComparisonBarChart } from "@/components/charts";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { formatJmd } from "@/lib/money";
import { addQueryError, loadDashboardContext } from "@/components/dashboard/dashboard-data";
import {
  ActivityItem,
  ActivityList,
  ChartFrame,
  DashboardColumns,
  DashboardHero,
  DashboardHome,
  DashboardPanel,
  EmptyState,
  HeroSnapshot,
  MetricGrid,
  MetricLink,
  MutedNote,
  QueryErrorNotice,
  StatusPill,
} from "@/components/dashboard/dashboard-home";
import { BroadcastForm } from "./broadcast-form";

export const metadata: Metadata = { title: "Pastor Workspace" };

const CHURCH_TIME_ZONE = "America/Jamaica";

function jamaicaParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CHURCH_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return { year: value("year"), month: value("month"), day: value("day"), hour: value("hour") };
}

function churchDayBounds(now: Date) {
  const { year, month, day } = jamaicaParts(now);
  const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const start = new Date(`${dateKey}T00:00:00-05:00`);
  return { start, end: new Date(start.getTime() + 86_400_000) };
}

function churchDate(value: string | Date) {
  return new Date(value).toLocaleDateString("en-JM", {
    dateStyle: "medium",
    timeZone: CHURCH_TIME_ZONE,
  });
}

function churchTime(value: string | Date) {
  return new Date(value).toLocaleTimeString("en-JM", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: CHURCH_TIME_ZONE,
  });
}

function churchMonthKey(value: string | Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CHURCH_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date(value));
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  return `${year}-${month}`;
}

export default async function PastorDashboardPage() {
  const context = await loadDashboardContext(true);
  const { supabase, profile, permissions } = context;
  const errors = [...context.errors];
  const organizationId = profile?.organization_id ?? "";
  const profileId = profile?.id ?? "";
  const now = new Date();
  const { start: todayStart, end: todayEnd } = churchDayBounds(now);
  const localNow = jamaicaParts(now);
  const sixMonthsAgo = new Date(Date.UTC(localNow.year, localNow.month - 6, 1));

  const canManageCare = permissions.has("care.manage");
  const canReadPrayer = permissions.has("care.read") || canManageCare;
  const hasPastoralWorkspace = permissions.has("pastoral_workspace.access") || canReadPrayer || permissions.has("sermons.manage") || permissions.has("documents.certify");
  const canCertify = permissions.has("documents.certify");
  const canManageSermons = permissions.has("sermons.manage");
  const canSeePeople = permissions.has("people.read") || permissions.has("people.write");
  const canSeeGiving = permissions.has("giving.read") || permissions.has("giving.manage");
  const canBroadcast = permissions.has("broadcasts.send");

  const noRows = () => Promise.resolve({ data: null, count: null, error: null });

  const counselPromise = hasPastoralWorkspace
    ? (() => {
        let query = supabase
          .from("counsel_requests")
          .select("id, reason, details, is_urgent, status, preferred_date, preferred_time, created_at, profiles:requester_profile_id(first_name, last_name)", { count: "exact" })
          .eq("organization_id", organizationId)
          .eq("is_urgent", true)
          .eq("status", "requested")
          .order("created_at", { ascending: true })
          .limit(6);
        if (!canManageCare) query = query.eq("requested_with_profile_id", profileId);
        return query;
      })()
    : noRows();

  const [
    prayerResult,
    caseResult,
    counselResult,
    sermonResult,
    documentResult,
    memberResult,
    attendanceResult,
    profileGrowthResult,
    donationResult,
    broadcastResult,
    scheduleResult,
  ] = await Promise.all([
    canReadPrayer
      ? supabase
          .from("prayer_requests")
          .select("id, submitter_name, request_body, status, visibility, created_at", { count: "exact" })
          .eq("organization_id", organizationId)
          .in("status", ["new", "in_progress"])
          .order("created_at", { ascending: false })
          .limit(6)
      : noRows(),
    hasPastoralWorkspace
      ? supabase
          .from("care_cases")
          .select("id, category, status, summary, created_at", { count: "exact" })
          .eq("organization_id", organizationId)
          .neq("status", "closed")
          .order("updated_at", { ascending: false })
          .limit(5)
      : noRows(),
    counselPromise,
    canManageSermons
      ? supabase.from("sermons").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("status", "draft")
      : noRows(),
    canCertify
      ? supabase
          .from("document_requests")
          .select("id, title, purpose, created_at, profiles:requester_profile_id(first_name, last_name)", { count: "exact" })
          .eq("organization_id", organizationId)
          .eq("status", "pending_pastor")
          .order("created_at", { ascending: true })
          .limit(5)
      : noRows(),
    canSeePeople
      ? supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", organizationId)
          .in("membership_status", ["member", "attendee"])
      : noRows(),
    supabase
      .from("attendance_records")
      .select("service_date, headcount")
      .eq("organization_id", organizationId)
      .order("service_date", { ascending: false })
      .limit(60),
    canSeePeople
      ? supabase
          .from("profiles")
          .select("created_at")
          .eq("organization_id", organizationId)
          .gte("created_at", sixMonthsAgo.toISOString())
      : noRows(),
    canSeeGiving
      ? supabase
          .from("donations")
          .select("amount_minor, created_at")
          .eq("organization_id", organizationId)
          .eq("status", "completed")
          .gte("created_at", sixMonthsAgo.toISOString())
      : noRows(),
    canBroadcast
      ? supabase
          .from("pastor_broadcasts")
          .select("id, title, body, created_at")
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: false })
          .limit(4)
      : noRows(),
    profileId
      ? supabase
          .from("pastoral_calendar_events")
          .select("id, title, starts_at, ends_at, kind, visibility")
          .eq("profile_id", profileId)
          .lt("starts_at", todayEnd.toISOString())
          .gt("ends_at", todayStart.toISOString())
          .order("starts_at", { ascending: true })
      : noRows(),
  ]);

  const queryErrors: [boolean, string, { message: string } | null][] = [
    [canReadPrayer, "Prayer requests", prayerResult.error],
    [hasPastoralWorkspace, "Care cases", caseResult.error],
    [hasPastoralWorkspace, "Urgent counsel requests", counselResult.error],
    [canManageSermons, "Sermon drafts", sermonResult.error],
    [canCertify, "Documents to sign", documentResult.error],
    [canSeePeople, "Member totals", memberResult.error],
    [true, "Attendance trend", attendanceResult.error],
    [canSeePeople, "Member growth", profileGrowthResult.error],
    [canSeeGiving, "Giving trend", donationResult.error],
    [canBroadcast, "Pastor's Desk", broadcastResult.error],
    [Boolean(profileId), "Today's calendar", scheduleResult.error],
  ];
  for (const [enabled, label, error] of queryErrors) {
    if (enabled) addQueryError(errors, label, error);
  }

  const byDate = new Map<string, number>();
  for (const record of attendanceResult.data ?? []) {
    byDate.set(record.service_date, (byDate.get(record.service_date) ?? 0) + record.headcount);
  }
  const attendanceTrend = [...byDate.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(-8)
    .map(([date, attendance]) => ({
      label: new Date(`${date}T12:00:00-05:00`).toLocaleDateString("en-JM", { month: "short", day: "numeric", timeZone: CHURCH_TIME_ZONE }),
      attendance,
    }));

  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(Date.UTC(localNow.year, localNow.month - 6 + index, 1));
    return {
      key: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`,
      label: date.toLocaleDateString("en-JM", { month: "short", timeZone: "UTC" }),
    };
  });

  const growthByMonth = new Map(months.map((month) => [month.key, 0]));
  for (const person of profileGrowthResult.data ?? []) {
    const key = churchMonthKey(person.created_at);
    if (growthByMonth.has(key)) growthByMonth.set(key, (growthByMonth.get(key) ?? 0) + 1);
  }
  const membershipTrend = months.map((month) => ({ label: month.label, newMembers: growthByMonth.get(month.key) ?? 0 }));

  const givingByMonth = new Map(months.map((month) => [month.key, 0]));
  for (const donation of donationResult.data ?? []) {
    const key = churchMonthKey(donation.created_at);
    if (givingByMonth.has(key)) givingByMonth.set(key, (givingByMonth.get(key) ?? 0) + donation.amount_minor);
  }
  const givingTrend = months.map((month) => ({ label: month.label, giving: Math.round((givingByMonth.get(month.key) ?? 0) / 100) }));

  const schedule = scheduleResult.data ?? [];
  const urgentCounsel = counselResult.data ?? [];
  const careCases = caseResult.data ?? [];
  const prayers = prayerResult.data ?? [];
  const documents = documentResult.data ?? [];
  const firstName = profile?.first_name?.trim();
  const greeting = localNow.hour < 12 ? "Good morning" : localNow.hour < 18 ? "Good afternoon" : "Good evening";
  const urgentTotal = counselResult.error ? null : (counselResult.count ?? urgentCounsel.length);
  const careTotal = caseResult.error ? null : (caseResult.count ?? careCases.length);
  const scheduleSummary = schedule[0]
    ? `${churchTime(schedule[0].starts_at)} · ${schedule[0].title}`
    : "Your calendar is open. Add office hours, appointments, or time away.";

  return (
    <DashboardHome>
      <RealtimeRefresh tables={["pastor_broadcasts", "attendance_records"]} />

      <DashboardHero
        eyebrow="Pastoral workspace"
        title={firstName ? `${greeting}, ${firstName}.` : "Here is today’s pastoral picture."}
        description="Care for people first, keep today’s commitments close, and see the ministry signals that shape the next decision."
        primaryAction={{ href: "/pastor/care", label: urgentTotal ? "Review urgent care" : "Open pastoral care" }}
        secondaryAction={{ href: "/member/team-calendar", label: "Manage my calendar" }}
        variant="pastor"
        aside={
          <HeroSnapshot
            label="Today’s schedule"
            value={scheduleResult.error ? "Unavailable" : schedule.length ? `${schedule.length} calendar item${schedule.length === 1 ? "" : "s"}` : "Calendar is clear"}
            detail={scheduleResult.error ? "Refresh to retry the calendar query." : scheduleSummary}
            href="/member/team-calendar"
          />
        }
      />

      <QueryErrorNotice errors={errors} />

      <MetricGrid>
        <MetricLink href="/pastor/care" icon="!" tone="rose" value={counselResult.error ? "—" : (urgentTotal ?? 0)} label="Urgent care requests" detail="Open requests that need a pastoral response" />
        <MetricLink href="/pastor/care" icon="♡" tone="plum" value={prayerResult.error ? "—" : (prayerResult.count ?? prayers.length)} label="Prayers to triage" detail="New and in-progress prayer requests" />
        <MetricLink href="/pastor/documents" icon="▤" tone="gold" value={documentResult.error ? "—" : (documentResult.count ?? documents.length)} label="Documents to sign" detail="Prepared documents waiting on your desk" />
        <MetricLink href="/pastor/care" icon="◌" tone="blue" value={caseResult.error ? "—" : (careTotal ?? 0)} label="Open care cases" detail="Cases you own or have permission to see" />
        {canSeePeople && (
          <MetricLink href="/admin/people" icon="⌁" tone="green" value={memberResult.error ? "—" : (memberResult.count ?? 0)} label="Members and attendees" detail="Open the people directory" />
        )}
        {canManageSermons && (
          <MetricLink href="/pastor/sermons" icon="✦" tone="neutral" value={sermonResult.error ? "—" : (sermonResult.count ?? 0)} label="Sermons in draft" detail="Continue preparing or publish a message" />
        )}
      </MetricGrid>

      <DashboardColumns>
        <DashboardPanel
          eyebrow="People first"
          title="Urgent care"
          description="Urgent counsel requests appear first, followed by active cases in your care."
          action={{ href: "/pastor/care", label: "Pastoral care desk" }}
          tone="warm"
        >
          {counselResult.error || caseResult.error ? (
            <EmptyState title="Part of the care queue is unavailable" description="Refresh this page, or open Pastoral Care to retry." action={{ href: "/pastor/care", label: "Open care desk" }} />
          ) : urgentCounsel.length || careCases.length ? (
            <ActivityList>
              {urgentCounsel.map((request) => {
                const requester = request.profiles as unknown as { first_name: string | null; last_name: string | null } | null;
                const requesterName = `${requester?.first_name ?? ""} ${requester?.last_name ?? ""}`.trim() || "A member";
                return (
                  <ActivityItem
                    key={request.id}
                    href="/pastor/care"
                    eyebrow="Urgent counsel request"
                    title={request.reason}
                    body={request.details ?? `${requesterName} asked for pastoral support.`}
                    meta={`${requesterName} · ${churchDate(request.created_at)}`}
                    badge="Urgent"
                    badgeTone="rose"
                  />
                );
              })}
              {careCases.slice(0, 3).map((careCase) => (
                <ActivityItem
                  key={careCase.id}
                  href={`/pastor/care/${careCase.id}`}
                  eyebrow={careCase.category ?? "Pastoral care"}
                  title={careCase.summary ?? "Care case awaiting an update"}
                  meta={`Opened ${churchDate(careCase.created_at)}`}
                  badge={careCase.status.replaceAll("_", " ")}
                  badgeTone={careCase.status === "in_progress" ? "blue" : "gold"}
                />
              ))}
            </ActivityList>
          ) : (
            <EmptyState title="No urgent care is waiting" description="The pastoral queue is clear right now." action={{ href: "/pastor/care", label: "Review all care" }} />
          )}
        </DashboardPanel>

        <DashboardPanel
          eyebrow="Your day"
          title="Today’s schedule"
          description="Appointments, office blocks, and time-away entries on your calendar."
          action={{ href: "/member/team-calendar", label: "Edit calendar" }}
          tone="softBlue"
        >
          {scheduleResult.error ? (
            <EmptyState title="Today’s schedule is unavailable" description="Open your calendar or refresh to try again." action={{ href: "/member/team-calendar", label: "Open calendar" }} />
          ) : schedule.length ? (
            <ActivityList>
              {schedule.map((event) => (
                <ActivityItem
                  key={event.id}
                  href="/member/team-calendar"
                  eyebrow={event.kind.replaceAll("_", " ")}
                  title={event.title}
                  meta={`${churchTime(event.starts_at)}–${churchTime(event.ends_at)}`}
                  badge={event.visibility}
                  badgeTone={event.visibility === "private" ? "neutral" : "blue"}
                />
              ))}
            </ActivityList>
          ) : (
            <EmptyState title="Your calendar is open today" description="Add an appointment, office block, or day-off entry." action={{ href: "/member/team-calendar", label: "Add calendar item" }} />
          )}
        </DashboardPanel>
      </DashboardColumns>

      <DashboardColumns balanced>
        {canCertify && (
          <DashboardPanel
            eyebrow="Pastor’s office"
            title="Documents awaiting signature"
            description="Prepared letters and certificates ready for your review."
            action={{ href: "/pastor/documents", label: "Certification desk" }}
          >
            {!profile?.signature_path && (
              <EmptyState title="Add your signature first" description="A stored signature is required before a certified PDF can be released." action={{ href: "/pastor/documents", label: "Set up signature" }} />
            )}
            {documentResult.error ? (
              <EmptyState title="The document queue is unavailable" description="Open the certification desk or refresh to retry." action={{ href: "/pastor/documents", label: "Open documents" }} />
            ) : documents.length ? (
              <ActivityList>
                {documents.map((document) => {
                  const requester = document.profiles as unknown as { first_name: string | null; last_name: string | null } | null;
                  const requesterName = `${requester?.first_name ?? ""} ${requester?.last_name ?? ""}`.trim() || "Member";
                  return (
                    <ActivityItem
                      key={document.id}
                      href="/pastor/documents"
                      eyebrow={`Waiting since ${churchDate(document.created_at)}`}
                      title={document.title}
                      body={document.purpose ?? `Prepared for ${requesterName}`}
                      meta={requesterName}
                      badge="Sign"
                      badgeTone="gold"
                    />
                  );
                })}
              </ActivityList>
            ) : (
              <EmptyState title="Nothing is waiting for signature" description="Prepared requests will arrive here from the pastor’s office." action={{ href: "/pastor/documents", label: "Review documents" }} />
            )}
          </DashboardPanel>
        )}

        {canReadPrayer && (
          <DashboardPanel
            eyebrow="Prayer triage"
            title="Requests to hold in prayer"
            description="Review the newest requests and move each one through the care process."
            action={{ href: "/pastor/care", label: "All prayer requests" }}
            tone="warm"
          >
            {prayerResult.error ? (
              <EmptyState title="Prayer requests are unavailable" description="Open Pastoral Care or refresh to retry." action={{ href: "/pastor/care", label: "Open care desk" }} />
            ) : prayers.length ? (
              <ActivityList>
                {prayers.map((prayer) => (
                  <ActivityItem
                    key={prayer.id}
                    href="/pastor/care"
                    eyebrow={prayer.submitter_name ?? "Anonymous"}
                    title={prayer.request_body}
                    meta={`${churchDate(prayer.created_at)} · ${prayer.visibility.replaceAll("_", " ")}`}
                    badge={prayer.status.replaceAll("_", " ")}
                    badgeTone={prayer.status === "new" ? "rose" : "blue"}
                  />
                ))}
              </ActivityList>
            ) : (
              <EmptyState title="The prayer queue is clear" description="New requests will appear here for review." action={{ href: "/pastor/care", label: "Open pastoral care" }} />
            )}
          </DashboardPanel>
        )}
      </DashboardColumns>

      <DashboardColumns balanced>
        <DashboardPanel
          eyebrow="Congregational rhythm"
          title="Attendance · last 8 services"
          description="Recorded headcount across recent services."
          action={{ href: "/admin/attendance", label: "Attendance desk" }}
        >
          {attendanceResult.error ? (
            <EmptyState title="Attendance could not be loaded" description="Open the attendance desk or refresh to retry." action={{ href: "/admin/attendance", label: "Open attendance" }} />
          ) : attendanceTrend.length ? (
            <ChartFrame>
              <TrendAreaChart data={attendanceTrend} dataKey="attendance" label="Attendance" />
            </ChartFrame>
          ) : (
            <EmptyState title="No attendance is recorded yet" description="Once the office submits a service count, the trend will appear here." action={{ href: "/admin/attendance", label: "Record attendance" }} />
          )}
        </DashboardPanel>

        {canSeePeople && (
          <DashboardPanel
            eyebrow="People"
            title="New profiles · last 6 months"
            description="A simple view of recent growth in the church directory."
            action={{ href: "/admin/people", label: "People directory" }}
          >
            {profileGrowthResult.error ? (
              <EmptyState title="Member growth could not be loaded" description="Open the people directory or refresh to retry." action={{ href: "/admin/people", label: "Open people" }} />
            ) : (
              <ChartFrame>
                <ComparisonBarChart data={membershipTrend} bars={[{ key: "newMembers", label: "New profiles", color: "#70863a" }]} />
              </ChartFrame>
            )}
          </DashboardPanel>
        )}
      </DashboardColumns>

      {canSeeGiving && (
        <DashboardPanel
          eyebrow="Stewardship"
          title="Giving · last 6 months"
          description="Completed gifts grouped by month; finance details remain in the protected ledger."
          action={{ href: "/admin/giving", label: "Finance dashboard" }}
          tone="softBlue"
        >
          {donationResult.error ? (
            <EmptyState title="Giving could not be loaded" description="Open Finance or refresh to retry the protected query." action={{ href: "/admin/giving", label: "Open Finance" }} />
          ) : givingTrend.some((month) => month.giving > 0) ? (
            <ChartFrame>
              <TrendAreaChart data={givingTrend} dataKey="giving" label="Giving (JMD)" formatter={(value) => formatJmd(value * 100)} />
            </ChartFrame>
          ) : (
            <EmptyState title="No completed gifts in this period" description="The chart will appear after Finance confirms giving." action={{ href: "/admin/giving", label: "Review Finance" }} />
          )}
        </DashboardPanel>
      )}

      {canBroadcast && (
        <DashboardColumns>
          <DashboardPanel
            eyebrow="Speak to the church"
            title="From the Pastor’s Desk"
            description="Write a short update that appears immediately on every member’s home dashboard."
            tone="warm"
          >
            <BroadcastForm />
          </DashboardPanel>

          <DashboardPanel eyebrow="Recently shared" title="Past messages" action={{ href: "/member", label: "View member home" }}>
            {broadcastResult.error ? (
              <EmptyState title="Past messages are unavailable" description="Refresh to retry; you can still use the form if it is shown." />
            ) : broadcastResult.data?.length ? (
              <ActivityList>
                {broadcastResult.data.map((broadcast) => (
                  <ActivityItem key={broadcast.id} title={broadcast.title} body={broadcast.body} meta={churchDate(broadcast.created_at)} />
                ))}
              </ActivityList>
            ) : (
              <>
                <MutedNote>Your first Pastor’s Desk message will remain here after it is sent.</MutedNote>
                <div style={{ marginTop: 14 }}>
                  <StatusPill tone="gold">Ready for your first message</StatusPill>
                </div>
              </>
            )}
          </DashboardPanel>
        </DashboardColumns>
      )}
    </DashboardHome>
  );
}
