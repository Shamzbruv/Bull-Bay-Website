import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { spansWholeDays } from "@/lib/calendar/dates";

/**
 * Data for the member-facing Church calendar: published church events plus
 * the schedule of every active pastoral-team member (the pastor, and
 * deacons/deaconesses/elders as they are added to the team).
 *
 * Privacy: an entry a team member marked private — and every counselling
 * appointment, which is private by definition — reaches the browser only as
 * an anonymous "Busy" block. Its title, location and video link are dropped
 * here, on the server, so a member's browser never receives them.
 */

export type CalendarItemKind = "church" | "meeting" | "busy" | "day_off" | "appointment";

export type CalendarLayer = {
  id: string;
  label: string;
  roleTitle: string | null;
  color: string;
  isChurch: boolean;
  hours: { dayOfWeek: number; startTime: string; endTime: string; label: string | null }[];
};

export type CalendarItem = {
  id: string;
  layerId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  location: string | null;
  meetingUrl: string | null;
  category: string | null;
  hidden: boolean;
  kind: CalendarItemKind;
};

export const CHURCH_LAYER_ID = "church";

const PAST_DAYS = 60;
const FUTURE_DAYS = 400;
const DAY_MS = 86_400_000;

const CHURCH_COLOR = "#2f6f4e";
const PERSON_COLORS = ["#173f89", "#a8341f", "#8a6a1c", "#5b3f8c", "#0f766e", "#b45309", "#9d174d", "#475569"];

export async function loadChurchCalendar(organizationId: string): Promise<{ layers: CalendarLayer[]; items: CalendarItem[] }> {
  const supabase = await createClient();
  const admin = createServiceRoleClient();
  const from = new Date(Date.now() - PAST_DAYS * DAY_MS).toISOString();
  const to = new Date(Date.now() + FUTURE_DAYS * DAY_MS).toISOString();

  const [{ data: churchEvents }, { data: team }] = await Promise.all([
    supabase
      .from("events")
      .select("id, title, starts_at, ends_at, category, location_name, online_url")
      .throwOnError()
      .eq("organization_id", organizationId)
      .eq("status", "published")
      .lte("starts_at", to)
      .or(`ends_at.gte.${from},and(ends_at.is.null,starts_at.gte.${from})`)
      .order("starts_at")
      .limit(1000),
    supabase
      .from("pastoral_team_members")
      .select("profile_id, role_title, is_pastor, sort_order, profiles(first_name, last_name)")
      .throwOnError()
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .order("is_pastor", { ascending: false })
      .order("sort_order"),
  ]);

  const people = team ?? [];
  const personIds = people.map((t) => t.profile_id);

  const [{ data: personEvents }, { data: hours }] = personIds.length
    ? await Promise.all([
        admin
          .from("pastoral_calendar_events")
          .select("id, profile_id, title, starts_at, ends_at, kind, visibility, location, meeting_url")
          .throwOnError()
          .in("profile_id", personIds)
          .lt("starts_at", to)
          .gte("ends_at", from)
          .order("starts_at")
          .limit(2000),
        admin.from("pastoral_calendar_availability").select("profile_id, day_of_week, start_time, end_time, label").throwOnError().in("profile_id", personIds),
      ])
    : [{ data: [] }, { data: [] }];

  const layers: CalendarLayer[] = [
    { id: CHURCH_LAYER_ID, label: "Church events", roleTitle: null, color: CHURCH_COLOR, isChurch: true, hours: [] },
    ...people.map((t, index) => {
      const profile = t.profiles as unknown as { first_name: string | null; last_name: string | null } | null;
      const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim();
      return {
        id: t.profile_id,
        label: name || t.role_title,
        roleTitle: t.role_title,
        color: PERSON_COLORS[index % PERSON_COLORS.length]!,
        isChurch: false,
        hours: (hours ?? [])
          .filter((h) => h.profile_id === t.profile_id)
          .map((h) => ({ dayOfWeek: h.day_of_week, startTime: h.start_time, endTime: h.end_time, label: h.label })),
      };
    }),
  ];

  const items: CalendarItem[] = [
    ...(churchEvents ?? []).map((e): CalendarItem => {
      const endsAt = e.ends_at ?? new Date(new Date(e.starts_at).getTime() + 3_600_000).toISOString();
      return {
        id: `church-${e.id}`,
        layerId: CHURCH_LAYER_ID,
        title: e.title,
        startsAt: e.starts_at,
        endsAt,
        allDay: spansWholeDays(e.starts_at, endsAt),
        location: e.location_name,
        meetingUrl: e.online_url,
        category: e.category,
        hidden: false,
        kind: "church",
      };
    }),
    ...(personEvents ?? []).map((e): CalendarItem => {
      const hidden = e.visibility !== "public" || e.kind === "appointment";
      return {
        id: `person-${e.id}`,
        layerId: e.profile_id,
        title: hidden ? "Busy" : e.title,
        startsAt: e.starts_at,
        endsAt: e.ends_at,
        allDay: spansWholeDays(e.starts_at, e.ends_at),
        location: hidden ? null : e.location,
        meetingUrl: hidden ? null : e.meeting_url,
        category: null,
        hidden,
        kind: hidden ? "busy" : (e.kind as CalendarItemKind),
      };
    }),
  ];

  return { layers, items };
}
