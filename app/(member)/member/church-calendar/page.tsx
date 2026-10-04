import type { Metadata } from "next";
import Link from "next/link";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, getUserPermissions } from "@/lib/auth/session";
import { loadChurchCalendar } from "@/lib/calendar/church-calendar";
import { syncStaleConnectionsForProfiles } from "@/lib/calendar/integrations";
import { ChurchCalendar } from "@/components/calendar/church-calendar";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { AutoRefresh } from "@/components/auto-refresh";

export const metadata: Metadata = { title: "Church calendar" };

export default async function ChurchCalendarPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const supabase = await createClient();
  const [{ layers, items }, permissions, { data: myTeamRow }] = await Promise.all([
    loadChurchCalendar(profile.organization_id),
    getUserPermissions(profile.organization_id),
    supabase.from("pastoral_team_members").select("id").eq("profile_id", profile.id).eq("is_active", true).maybeSingle(),
  ]);
  const people = layers.filter((l) => !l.isChurch);
  // Anyone opening this calendar gets Google's latest: connections checked in the last 30 seconds are left alone.
  after(() => syncStaleConnectionsForProfiles(people.map((p) => p.id), 30_000));
  const canManage = Boolean(myTeamRow) || permissions.has("pastoral_calendar.manage");

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1>Church calendar</h1>
          <p>
            Church events and the schedule of the pastor and pastoral team, all in one place. Switch people on and off
            above the calendar. It stays up to date on its own as their calendars change. All times are Jamaica time.
          </p>
        </div>
        <div className="office-toolbar">
          <Link className="secondary-button compact" href="/member/counsel">Request time with the pastor</Link>
          <Link className="secondary-button compact" href="/member/calendar">Put it on my phone</Link>
          {canManage && (
            <Link className="secondary-button compact" href="/member/team-calendar">Manage my calendar</Link>
          )}
        </div>
      </div>

      <div className="panel">
        <ChurchCalendar layers={layers} items={items} />
        {people.length <= 1 && (
          <p className="form-note">
            Deacons, deaconesses and elders appear here automatically, each in their own colour, as soon as they are
            added to the pastoral team.
          </p>
        )}
        <p className="form-note">
          Entries marked private by the person who owns the calendar show only as grey &ldquo;Busy&rdquo; blocks, so you
          can see when someone is unavailable without seeing why.
        </p>
      </div>

      <RealtimeRefresh tables={["pastoral_calendar_events", "events"]} />
      <AutoRefresh seconds={60} />
    </>
  );
}
