import { getCurrentProfile } from "@/lib/auth/session";
import { createCalendarFeedToken } from "@/lib/calendar/feed-token";
import { SITE_URL } from "@/lib/org";
import { SyncCalendarPanel } from "../team-calendar/sync-calendar-panel";
export default async function CalendarPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;
  return <><div className="dashboard-header"><h1>My calendar</h1></div>
    <SyncCalendarPanel feedUrl={`${SITE_URL}/api/calendar/pastoral/${createCalendarFeedToken(profile.id)}`} />
    <div className="panel"><h2>Church events</h2><p>Subscribe separately to the published church events calendar.</p><SyncCalendarPanel publicFeed feedUrl={`${SITE_URL}/calendar.ics`} /></div>
  </>;
}
