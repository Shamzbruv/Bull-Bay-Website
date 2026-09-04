import type { Metadata } from "next";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { addQueryError, loadDashboardContext } from "@/components/dashboard/dashboard-data";
import {
  ActivityItem,
  ActivityList,
  DashboardColumns,
  DashboardHero,
  DashboardHome,
  DashboardPanel,
  EmptyState,
  HeroSnapshot,
  MetricGrid,
  MetricLink,
  ProgressMeter,
  QueryErrorNotice,
  QuickActionGrid,
  QuickActionLink,
  SetupItem,
  SetupList,
} from "@/components/dashboard/dashboard-home";

export const metadata: Metadata = { title: "My Church" };

const CHURCH_TIME_ZONE = "America/Jamaica";

type ServiceSchedule = {
  id: string;
  label: string;
  day_of_week: number;
  service_time: string;
};

function jamaicaDateParts(date: Date) {
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

function nextScheduledService(schedules: ServiceSchedule[], now: Date) {
  const { year, month, day } = jamaicaDateParts(now);
  const localDayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay();

  return schedules
    .map((schedule) => {
      let daysAhead = (schedule.day_of_week - localDayOfWeek + 7) % 7;
      const time = schedule.service_time.slice(0, 8);
      let calendarDate = new Date(Date.UTC(year, month - 1, day + daysAhead));
      let dateKey = calendarDate.toISOString().slice(0, 10);
      let startsAt = new Date(`${dateKey}T${time}-05:00`);

      if (startsAt <= now) {
        daysAhead += 7;
        calendarDate = new Date(Date.UTC(year, month - 1, day + daysAhead));
        dateKey = calendarDate.toISOString().slice(0, 10);
        startsAt = new Date(`${dateKey}T${time}-05:00`);
      }

      return { ...schedule, startsAt };
    })
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())[0];
}

function churchDateTime(value: string | Date) {
  return new Date(value).toLocaleString("en-JM", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: CHURCH_TIME_ZONE,
  });
}

function churchDate(value: string | Date) {
  return new Date(value).toLocaleDateString("en-JM", {
    dateStyle: "medium",
    timeZone: CHURCH_TIME_ZONE,
  });
}

export default async function MemberDashboardPage() {
  const context = await loadDashboardContext();
  const { supabase, profile } = context;
  const errors = [...context.errors];
  const organizationId = profile?.organization_id ?? "";
  const profileId = profile?.id ?? "";
  const now = new Date();
  const nowIso = now.toISOString();

  const [
    registrationResult,
    groupResult,
    shiftResult,
    broadcastResult,
    announcementResult,
    attendanceResult,
    scheduleResult,
  ] = await Promise.all([
    supabase
      .from("event_registrations")
      .select("id, events!inner(title, starts_at, slug)", { count: "exact" })
      .eq("profile_id", profileId)
      .eq("status", "registered")
      .gte("events.starts_at", nowIso)
      .limit(6),
    supabase
      .from("group_members")
      .select("id, groups(name, slug)", { count: "exact" })
      .eq("profile_id", profileId)
      .eq("status", "active")
      .limit(4),
    supabase
      .from("volunteer_assignments")
      .select("shift_id, status, volunteer_shifts!inner(starts_at, volunteer_opportunities(title))", { count: "exact" })
      .eq("profile_id", profileId)
      .gte("volunteer_shifts.starts_at", nowIso)
      .limit(5),
    supabase
      .from("pastor_broadcasts")
      .select("id, title, body, created_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("announcements")
      .select("id, title, body, published_at")
      .eq("organization_id", organizationId)
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(4),
    supabase
      .from("attendance_records")
      .select("headcount, service_date, service_schedules(label)")
      .eq("organization_id", organizationId)
      .order("service_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("service_schedules")
      .select("id, label, day_of_week, service_time")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .order("sort_order"),
  ]);

  addQueryError(errors, "Event registrations", registrationResult.error);
  addQueryError(errors, "Groups", groupResult.error);
  addQueryError(errors, "Serving assignments", shiftResult.error);
  addQueryError(errors, "Pastor's Desk", broadcastResult.error);
  addQueryError(errors, "Bulletin", announcementResult.error);
  addQueryError(errors, "Attendance", attendanceResult.error);
  addQueryError(errors, "Service schedule", scheduleResult.error);

  const registrations = (registrationResult.data ?? [])
    .map((registration) => ({
      id: registration.id,
      event: registration.events as unknown as { title: string; starts_at: string; slug: string } | null,
    }))
    .filter((registration): registration is { id: string; event: { title: string; starts_at: string; slug: string } } => Boolean(registration.event))
    .sort((a, b) => a.event.starts_at.localeCompare(b.event.starts_at));

  const groups = (groupResult.data ?? [])
    .map((membership) => ({
      id: membership.id,
      group: membership.groups as unknown as { name: string; slug: string } | null,
    }))
    .filter((membership): membership is { id: string; group: { name: string; slug: string } } => Boolean(membership.group));

  const shifts = (shiftResult.data ?? [])
    .map((assignment) => ({
      id: assignment.shift_id,
      status: assignment.status,
      shift: assignment.volunteer_shifts as unknown as {
        starts_at: string;
        volunteer_opportunities: { title: string } | null;
      } | null,
    }))
    .filter(
      (assignment): assignment is {
        id: string;
        status: string;
        shift: { starts_at: string; volunteer_opportunities: { title: string } | null };
      } => Boolean(assignment.shift),
    )
    .sort((a, b) => a.shift.starts_at.localeCompare(b.shift.starts_at));

  const lastAttendance = attendanceResult.data;
  const lastService = lastAttendance?.service_schedules as unknown as { label: string } | null;
  const nextService = nextScheduledService((scheduleResult.data ?? []) as ServiceSchedule[], now);
  const firstName = profile?.first_name?.trim();
  const { hour } = jamaicaDateParts(now);
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const profileChecks = [profile?.first_name, profile?.last_name, profile?.phone, profile?.city, profile?.emergency_contact_name];
  const profileProgress = profile ? Math.round((profileChecks.filter(Boolean).length / profileChecks.length) * 100) : 0;
  const setupChecks = [profileProgress === 100, Boolean(profile?.household_id), Boolean(profile?.communication_email_opt_in || profile?.communication_sms_opt_in)];
  const setupProgress = Math.round((setupChecks.filter(Boolean).length / setupChecks.length) * 100);

  return (
    <DashboardHome>
      <RealtimeRefresh tables={["pastor_broadcasts", "announcements", "attendance_records"]} />

      <DashboardHero
        eyebrow="Your church home"
        title={firstName ? `${greeting}, ${firstName}.` : "Welcome home."}
        description="Stay close to what is happening at Bull Bay, care for your household, and reach the church office from one place."
        primaryAction={{ href: "/member/events", label: "See what’s coming" }}
        secondaryAction={{ href: "/live", label: "Watch live" }}
        aside={
          <HeroSnapshot
            label="Next service"
            value={nextService?.label ?? "Schedule pending"}
            detail={nextService ? churchDateTime(nextService.startsAt) : "Browse the church calendar while the weekly schedule is being prepared."}
            href="/calendar"
          />
        }
      />

      <QueryErrorNotice errors={errors} />

      <MetricGrid>
        <MetricLink
          href="/member/attendance"
          icon="◎"
          tone="blue"
          value={attendanceResult.error ? "—" : (lastAttendance?.headcount ?? "Not yet")}
          label="Latest service attendance"
          detail={lastAttendance ? `${lastService?.label ?? "Service"} · ${churchDate(lastAttendance.service_date)}` : "See the congregation’s weekly attendance"}
        />
        <MetricLink
          href="/member/events"
          icon="◇"
          tone="gold"
          value={registrationResult.error ? "—" : (registrationResult.count ?? registrations.length)}
          label="Upcoming registrations"
          detail="Review your plans and discover another event"
        />
        <MetricLink
          href="/member/groups"
          icon="⌁"
          tone="green"
          value={groupResult.error ? "—" : (groupResult.count ?? groups.length)}
          label="Groups you belong to"
          detail="Open your groups or find a place to connect"
        />
        <MetricLink
          href="/member/serving"
          icon="✦"
          tone="plum"
          value={shiftResult.error ? "—" : (shiftResult.count ?? shifts.length)}
          label="Upcoming serving turns"
          detail="See assignments and respond to your team"
        />
      </MetricGrid>

      <DashboardColumns>
        <DashboardPanel
          eyebrow="A word for the family"
          title="From the Pastor’s Desk"
          description="Recent encouragement and direction shared with the congregation."
          tone="softBlue"
        >
          {broadcastResult.error ? (
            <EmptyState title="The Pastor’s Desk is unavailable" description="Refresh this page, or try again a little later." />
          ) : broadcastResult.data?.length ? (
            <ActivityList>
              {broadcastResult.data.map((broadcast) => (
                <ActivityItem
                  key={broadcast.id}
                  eyebrow={churchDate(broadcast.created_at)}
                  title={broadcast.title}
                  body={broadcast.body}
                />
              ))}
            </ActivityList>
          ) : (
            <EmptyState
              title="No message has been posted yet"
              description="The next word from the Pastor’s Desk will appear here."
              action={{ href: "/sermons", label: "Browse sermons" }}
            />
          )}
        </DashboardPanel>

        <DashboardPanel
          eyebrow="Church office"
          title="How can we help?"
          description="Send a request or take care of something important."
          tone="warm"
        >
          <QuickActionGrid>
            <QuickActionLink href="/prayer" icon="♡" tone="rose" title="Request prayer" description="Share publicly or confidentially" />
            <QuickActionLink href="/member/documents" icon="▤" tone="gold" title="Request a document" description="Letters, certificates, or JP help" />
            <QuickActionLink href="/member/counsel" icon="◌" tone="plum" title="Talk with someone" description="Ask for pastoral care or counsel" />
            <QuickActionLink href="/give" icon="$" tone="green" title="Give" description="Offer securely or view giving options" />
          </QuickActionGrid>
        </DashboardPanel>
      </DashboardColumns>

      <DashboardColumns balanced>
        <DashboardPanel eyebrow="This week" title="Church bulletin" action={{ href: "/calendar", label: "Church calendar" }}>
          {announcementResult.error ? (
            <EmptyState title="The bulletin is unavailable" description="Refresh this page to try loading it again." />
          ) : announcementResult.data?.length ? (
            <ActivityList>
              {announcementResult.data.map((announcement) => (
                <ActivityItem
                  key={announcement.id}
                  eyebrow={announcement.published_at ? churchDate(announcement.published_at) : undefined}
                  title={announcement.title}
                  body={announcement.body}
                />
              ))}
            </ActivityList>
          ) : (
            <EmptyState
              title="The bulletin is quiet"
              description="There are no current notices. You can still see everything coming up."
              action={{ href: "/events", label: "Browse events" }}
            />
          )}
        </DashboardPanel>

        <DashboardPanel eyebrow="Your calendar" title="Registered events" action={{ href: "/member/events", label: "All events" }}>
          {registrationResult.error ? (
            <EmptyState title="Registrations are unavailable" description="Open your events page or refresh to try again." action={{ href: "/member/events", label: "Open events" }} />
          ) : registrations.length ? (
            <ActivityList>
              {registrations.map(({ id, event }) => (
                <ActivityItem key={id} href={`/events/${event.slug}`} eyebrow={churchDateTime(event.starts_at)} title={event.title} meta="You’re registered" badge="Registered" badgeTone="blue" />
              ))}
            </ActivityList>
          ) : (
            <EmptyState title="Nothing on your list yet" description="Find an event and register; it will show up here." action={{ href: "/events", label: "Find an event" }} />
          )}
        </DashboardPanel>
      </DashboardColumns>

      <DashboardColumns balanced>
        <DashboardPanel eyebrow="Belong" title="Your groups" action={{ href: "/member/groups", label: "Manage groups" }}>
          {groupResult.error ? (
            <EmptyState title="Groups are unavailable" description="Refresh this page to try loading your groups again." />
          ) : groups.length ? (
            <ActivityList>
              {groups.map(({ id, group }) => (
                <ActivityItem key={id} href={`/groups/${group.slug}`} title={group.name} meta="Active member" />
              ))}
            </ActivityList>
          ) : (
            <EmptyState title="Find your people" description="Join a ministry or small group and grow alongside others." action={{ href: "/groups", label: "Explore groups" }} />
          )}
        </DashboardPanel>

        <DashboardPanel eyebrow="Serve" title="Your next assignments" action={{ href: "/member/serving", label: "Serving schedule" }}>
          {shiftResult.error ? (
            <EmptyState title="Serving assignments are unavailable" description="Open the serving page or refresh to try again." action={{ href: "/member/serving", label: "Open serving" }} />
          ) : shifts.length ? (
            <ActivityList>
              {shifts.map(({ id, shift, status }) => (
                <ActivityItem
                  key={id}
                  href="/member/serving"
                  eyebrow={churchDateTime(shift.starts_at)}
                  title={shift.volunteer_opportunities?.title ?? "Serving assignment"}
                  badge={status.replaceAll("_", " ")}
                  badgeTone={status === "confirmed" ? "green" : "gold"}
                />
              ))}
            </ActivityList>
          ) : (
            <EmptyState title="Ready to lend a hand?" description="There are no upcoming assignments on your schedule." action={{ href: "/serve", label: "Find a place to serve" }} />
          )}
        </DashboardPanel>
      </DashboardColumns>

      {setupProgress < 100 && (
        <DashboardPanel
          eyebrow="Make My Church yours"
          title="Finish setting up your space"
          description="A few details help the church office care for you and keep you informed."
          tone="warm"
        >
          <ProgressMeter value={setupProgress} label="Account setup" />
          <SetupList>
            <SetupItem href="/member/profile" title="Complete your profile" description="Add contact, location, and emergency details." complete={profileProgress === 100} />
            <SetupItem href="/member/household" title="Set up your household" description="Keep the people in your home connected." complete={Boolean(profile?.household_id)} />
            <SetupItem href="/member/notifications" title="Choose notification preferences" description="Decide how the church should keep in touch." complete={Boolean(profile?.communication_email_opt_in || profile?.communication_sms_opt_in)} />
          </SetupList>
        </DashboardPanel>
      )}
    </DashboardHome>
  );
}
