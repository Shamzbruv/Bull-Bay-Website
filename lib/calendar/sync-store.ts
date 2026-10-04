import { createServiceRoleClient } from "@/lib/supabase/server";
import type { LogEntry, SyncStore } from "@/lib/calendar/sync-engine";
import type { EventKind, SiteEvent } from "@/lib/calendar/sync-core";

const LOCK_MINUTES = 5;
const LOG_KEEP = 300;
const LOG_DAYS = 30;

/** The sync engine's view of the database: service role, since it acts for the calendar's owner rather than a signed-in user. */
export function databaseSyncStore(organizationId: string): SyncStore {
  const db = createServiceRoleClient();

  return {
    async claim(connectionId) {
      const now = new Date();
      const { data, error } = await db
        .from("calendar_connections")
        .update({ sync_lock_until: new Date(now.getTime() + LOCK_MINUTES * 60_000).toISOString() })
        .eq("id", connectionId)
        .or(`sync_lock_until.is.null,sync_lock_until.lt.${now.toISOString()}`)
        .select("id");
      if (error) throw error;
      return (data ?? []).length > 0;
    },

    async release(connectionId) {
      await db.from("calendar_connections").update({ sync_lock_until: null }).eq("id", connectionId);
    },

    async loadSiteEvents(profileId, linkedEventIds, windowStartIso) {
      const rowToEvent = (row: {
        id: string;
        title: string;
        starts_at: string;
        ends_at: string;
        kind: string;
        visibility: string;
        location: string | null;
        meeting_url: string | null;
        counsel_request_id: string | null;
        updated_at: string;
      }): SiteEvent => ({
        id: row.id,
        title: row.title,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
        kind: row.kind as EventKind,
        visibility: row.visibility === "public" ? "public" : "private",
        location: row.location,
        meetingUrl: row.meeting_url,
        updatedAt: row.updated_at,
        // Appointments are booked through the request flow, which owns their lifecycle.
        readOnly: row.counsel_request_id !== null || row.kind === "appointment",
      });
      const columns = "id, title, starts_at, ends_at, kind, visibility, location, meeting_url, counsel_request_id, updated_at";

      const [own, requests] = await Promise.all([
        db.from("pastoral_calendar_events").select(columns).throwOnError().eq("profile_id", profileId).gte("ends_at", windowStartIso).order("starts_at").limit(5000),
        db.from("counsel_requests").select("scheduled_event_id").throwOnError().eq("requester_profile_id", profileId).eq("status", "scheduled"),
      ]);
      const events = new Map<string, SiteEvent>((own.data ?? []).map((row) => [row.id, rowToEvent(row)]));

      // Entries already mirrored but older than the window are still this
      // calendar's: keep them in view so they are compared, not "deleted".
      const agedOut = linkedEventIds.filter((id) => !events.has(id));
      if (agedOut.length) {
        const { data } = await db.from("pastoral_calendar_events").select(columns).throwOnError().eq("profile_id", profileId).in("id", agedOut);
        for (const row of data ?? []) events.set(row.id, rowToEvent(row));
      }

      // A member who booked time with someone sees it, read-only and without
      // the other person's private details, on their own calendar too. An
      // entry of someone else's that is no longer such a booking is simply
      // not returned, which is what removes it from this Google calendar.
      const booked = (requests.data ?? []).flatMap((r) => (r.scheduled_event_id ? [r.scheduled_event_id] : [])).filter((id) => !events.has(id));
      if (booked.length) {
        const { data } = await db.from("pastoral_calendar_events").select(columns).throwOnError().in("id", booked);
        for (const row of data ?? []) {
          events.set(row.id, { ...rowToEvent(row), title: "Pastoral appointment", kind: "appointment", visibility: "private", location: null, meetingUrl: null, readOnly: true });
        }
      }
      return [...events.values()];
    },

    async loadHours(profileId) {
      const { data } = await db.from("pastoral_calendar_availability").select("id, day_of_week, start_time, end_time, label").throwOnError().eq("profile_id", profileId);
      return (data ?? []).map((h) => ({ id: h.id, dayOfWeek: h.day_of_week, startTime: h.start_time, endTime: h.end_time, label: h.label }));
    },

    async loadLinks(connectionId) {
      const { data } = await db.from("calendar_event_links").select("event_id, google_event_id, synced_hash, google_updated").throwOnError().eq("connection_id", connectionId);
      return (data ?? []).map((l) => ({ eventId: l.event_id, googleEventId: l.google_event_id, syncedHash: l.synced_hash, googleUpdated: l.google_updated }));
    },

    async setLink(connectionId, link) {
      const { error } = await db.from("calendar_event_links").upsert(
        { connection_id: connectionId, event_id: link.eventId, google_event_id: link.googleEventId, synced_hash: link.syncedHash, google_updated: link.googleUpdated, synced_at: new Date().toISOString() },
        { onConflict: "connection_id,event_id" },
      );
      if (error) throw error;
    },

    async removeLink(connectionId, eventId) {
      const { error } = await db.from("calendar_event_links").delete().eq("connection_id", connectionId).eq("event_id", eventId);
      if (error) throw error;
    },

    async createSiteEvent(event) {
      const { error } = await db.from("pastoral_calendar_events").insert(event);
      // The id is derived from the Google entry, so "already there" means an
      // earlier run got this far: not a failure.
      if (error && error.code !== "23505") throw new Error(error.message);
    },

    async updateSiteEvent(profileId, id, changes) {
      const { error } = await db.from("pastoral_calendar_events").update(changes).eq("id", id).eq("profile_id", profileId);
      if (error) throw new Error(error.message);
    },

    async deleteSiteEvent(profileId, id) {
      const { error } = await db.from("pastoral_calendar_events").delete().eq("id", id).eq("profile_id", profileId);
      if (error) throw new Error(error.message);
    },

    async siteEventExists(profileId, id) {
      const { data } = await db.from("pastoral_calendar_events").select("id").eq("id", id).eq("profile_id", profileId).maybeSingle();
      return Boolean(data);
    },

    async writeLog(connectionId, entries: LogEntry[]) {
      if (entries.length) {
        const { error } = await db.from("calendar_sync_log").insert(
          entries.map((e) => ({ connection_id: connectionId, organization_id: organizationId, direction: e.direction, action: e.action, title: e.title, detail: e.detail })),
        );
        if (error) throw error;
      }
      // Keep the history readable: a month, and no more than a few hundred lines.
      await db.from("calendar_sync_log").delete().eq("connection_id", connectionId).lt("created_at", new Date(Date.now() - LOG_DAYS * 86_400_000).toISOString());
      const { data: cutoff } = await db.from("calendar_sync_log").select("id").eq("connection_id", connectionId).order("id", { ascending: false }).range(LOG_KEEP, LOG_KEEP).maybeSingle();
      if (cutoff) await db.from("calendar_sync_log").delete().eq("connection_id", connectionId).lte("id", cutoff.id);
    },

    async finish(connectionId, outcome) {
      await db.from("calendar_connections").update({ last_synced_at: outcome.at.toISOString(), last_error: outcome.error }).eq("id", connectionId);
    },
  };
}
