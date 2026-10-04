import { GoogleApiError, type GoogleApi } from "@/lib/calendar/google-api";
import {
  contentOfSite,
  findMissing,
  googleBodyForSite,
  googlePatchForSite,
  hashContent,
  importedSiteEventId,
  mergeEvents,
  planHours,
  type EventKind,
  type HoursBlock,
  type Link,
  type Op,
  type SiteEvent,
} from "@/lib/calendar/sync-core";

/**
 * Runs one two-way sync between a pastoral-team calendar on the website and
 * one connected Google calendar: read both sides, let sync-core decide, then
 * carry the decisions out and write down what happened. One change failing
 * never stops the rest; whatever failed is reported on the connection.
 */

const DAY_MS = 86_400_000;
export const WINDOW_PAST_DAYS = 90;
export const WINDOW_FUTURE_DAYS = 400;
/** Lookups made to confirm "gone from Google" per run; the rest wait for the next run. */
const MAX_CONFIRMATIONS = 25;

export type NewSiteEvent = {
  id: string;
  profile_id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  kind: EventKind;
  visibility: "public" | "private";
  location: string | null;
  meeting_url: string | null;
  source: "google";
};

export type SiteEventChanges = Pick<NewSiteEvent, "title" | "starts_at" | "ends_at" | "visibility" | "location" | "meeting_url">;

export type LogEntry = {
  direction: "from_google" | "to_google" | "info";
  action: "created" | "updated" | "deleted" | "restored" | "error" | "info";
  title: string | null;
  detail: string;
};

/** Everything the engine needs from the database. */
export type SyncStore = {
  /** Takes the connection's lock; false when another sync already holds it. */
  claim(connectionId: string): Promise<boolean>;
  release(connectionId: string): Promise<void>;
  loadSiteEvents(profileId: string, linkedEventIds: string[], windowStartIso: string): Promise<SiteEvent[]>;
  loadHours(profileId: string): Promise<HoursBlock[]>;
  loadLinks(connectionId: string): Promise<Link[]>;
  setLink(connectionId: string, link: Link): Promise<void>;
  removeLink(connectionId: string, eventId: string): Promise<void>;
  createSiteEvent(event: NewSiteEvent): Promise<void>;
  /** The calendar owner's profile is passed to each of these so a bad id can never reach another person's entries. */
  updateSiteEvent(profileId: string, id: string, changes: SiteEventChanges): Promise<void>;
  deleteSiteEvent(profileId: string, id: string): Promise<void>;
  siteEventExists(profileId: string, id: string): Promise<boolean>;
  writeLog(connectionId: string, entries: LogEntry[]): Promise<void>;
  finish(connectionId: string, outcome: { at: Date; error: string | null }): Promise<void>;
};

export type SyncSummary = {
  skipped: boolean;
  fromGoogle: { created: number; updated: number; deleted: number };
  toGoogle: { created: number; updated: number; deleted: number };
  errors: string[];
};

type Target = { connectionId: string; profileId: string };

const quote = (title: string) => `“${title}”`;

export async function runSync(args: { target: Target; store: SyncStore; google: GoogleApi; now?: Date }): Promise<SyncSummary> {
  const { target, store, google } = args;
  const now = args.now ?? new Date();
  const summary: SyncSummary = {
    skipped: false,
    fromGoogle: { created: 0, updated: 0, deleted: 0 },
    toGoogle: { created: 0, updated: 0, deleted: 0 },
    errors: [],
  };
  if (!(await store.claim(target.connectionId))) return { ...summary, skipped: true };

  const log: LogEntry[] = [];
  try {
    const windowStart = new Date(now.getTime() - WINDOW_PAST_DAYS * DAY_MS);
    const windowEnd = new Date(now.getTime() + WINDOW_FUTURE_DAYS * DAY_MS);

    const links = await store.loadLinks(target.connectionId);
    const [googleEvents, managed] = await Promise.all([google.listWindow(windowStart.toISOString(), windowEnd.toISOString()), google.listManaged()]);
    const site = await store.loadSiteEvents(target.profileId, links.map((l) => l.eventId), windowStart.toISOString());

    // Absence from a list is weak evidence, and acting on it deletes real
    // entries, so ask Google directly before treating anything as deleted.
    const confirmedGone = new Set<string>();
    for (const id of findMissing(site, googleEvents, links, windowStart, windowEnd).slice(0, MAX_CONFIRMATIONS)) {
      const found = await google.get(id);
      if (!found || found.status === "cancelled") confirmedGone.add(id);
    }

    for (const op of mergeEvents({ connectionId: target.connectionId, site, google: googleEvents, links, confirmedGone })) {
      try {
        await applyOp(op, target, store, google, summary, log);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        summary.errors.push(message);
        log.push({ direction: opDirection(op), action: "error", title: opTitle(op), detail: `Could not ${opVerb(op)} ${quote(opTitle(op) ?? "an entry")}: ${message}` });
      }
    }

    const hoursOps = planHours(await store.loadHours(target.profileId), managed);
    let hoursChanged = 0;
    for (const op of hoursOps) {
      try {
        if (op.type === "delete") await google.remove(op.id);
        else if (op.type === "update") await google.replace(op.id, op.body);
        else await insertOrReplace(google, op.body);
        hoursChanged += 1;
      } catch (error) {
        summary.errors.push(error instanceof Error ? error.message : "Working hours could not be updated");
      }
    }
    if (hoursChanged) log.push({ direction: "to_google", action: "info", title: null, detail: `Working hours updated in Google Calendar (${hoursChanged} ${hoursChanged === 1 ? "change" : "changes"}).` });

    await store.writeLog(target.connectionId, log).catch(() => {});
    await store.finish(target.connectionId, { at: now, error: summary.errors.length ? `${summary.errors.length} ${summary.errors.length === 1 ? "change" : "changes"} could not be synced. ${summary.errors[0]}` : null });
    return summary;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    await store.finish(target.connectionId, { at: now, error: message }).catch(() => {});
    throw error;
  } finally {
    await store.release(target.connectionId).catch(() => {});
  }
}

async function insertOrReplace(google: GoogleApi, body: Parameters<GoogleApi["insert"]>[0]) {
  try {
    return await google.insert(body);
  } catch (error) {
    // The id was used before and its tombstone still exists: write over it.
    if (error instanceof GoogleApiError && error.status === 409) return google.replace(body.id, body);
    throw error;
  }
}

async function applyOp(op: Op, target: Target, store: SyncStore, google: GoogleApi, summary: SyncSummary, log: LogEntry[]): Promise<void> {
  const { connectionId, profileId } = target;
  switch (op.type) {
    case "site_create": {
      const id = importedSiteEventId(connectionId, op.googleEventId);
      await store.createSiteEvent({
        id,
        profile_id: profileId,
        title: op.content.title,
        starts_at: op.content.startsAt,
        ends_at: op.content.endsAt,
        kind: op.kind,
        visibility: op.content.isPrivate ? "private" : "public",
        location: op.content.location,
        meeting_url: op.content.meetingUrl,
        source: "google",
      });
      await store.setLink(connectionId, { eventId: id, googleEventId: op.googleEventId, syncedHash: hashContent(op.content), googleUpdated: op.googleUpdated });
      summary.fromGoogle.created += 1;
      log.push({ direction: "from_google", action: "created", title: op.content.title, detail: `Added ${quote(op.content.title)} from Google Calendar.` });
      return;
    }
    case "site_update": {
      await store.updateSiteEvent(profileId, op.event.id, {
        title: op.content.title,
        starts_at: op.content.startsAt,
        ends_at: op.content.endsAt,
        visibility: op.content.isPrivate ? "private" : "public",
        location: op.content.location,
        meeting_url: op.content.meetingUrl,
      });
      await store.setLink(connectionId, { eventId: op.event.id, googleEventId: op.googleEventId, syncedHash: hashContent(op.content), googleUpdated: op.googleUpdated });
      summary.fromGoogle.updated += 1;
      log.push({ direction: "from_google", action: "updated", title: op.content.title, detail: `Updated ${quote(op.content.title)} from Google Calendar (${op.fields.join(", ")})${op.reason ? `: ${op.reason}` : ""}.` });
      return;
    }
    case "site_delete": {
      await store.deleteSiteEvent(profileId, op.event.id);
      await store.removeLink(connectionId, op.event.id);
      summary.fromGoogle.deleted += 1;
      log.push({ direction: "from_google", action: "deleted", title: op.event.title, detail: `Removed ${quote(op.event.title)} because it was deleted in Google Calendar.` });
      return;
    }
    case "google_create": {
      const body = googleBodyForSite(op.event);
      const created = await insertOrReplace(google, body);
      await store.setLink(connectionId, { eventId: op.event.id, googleEventId: body.id, syncedHash: hashContent(contentOfSite(op.event)), googleUpdated: created.updated ?? null });
      summary.toGoogle.created += 1;
      log.push(
        op.restored
          ? { direction: "to_google", action: "restored", title: op.event.title, detail: `Put ${quote(op.event.title)} back in Google Calendar: appointments booked by members can only be changed in the church platform.` }
          : { direction: "to_google", action: "created", title: op.event.title, detail: `Added ${quote(op.event.title)} to Google Calendar.` },
      );
      return;
    }
    case "google_update": {
      const updated = await google.patch(op.googleEventId, googlePatchForSite(op.event, op.google.description));
      await store.setLink(connectionId, { eventId: op.event.id, googleEventId: op.googleEventId, syncedHash: hashContent(contentOfSite(op.event)), googleUpdated: updated.updated ?? null });
      summary.toGoogle.updated += 1;
      log.push(
        op.restored
          ? { direction: "to_google", action: "restored", title: op.event.title, detail: `Put ${quote(op.event.title)} back as it was booked: appointments made by members can only be changed in the church platform.` }
          : { direction: "to_google", action: "updated", title: op.event.title, detail: `Updated ${quote(op.event.title)} in Google Calendar (${op.fields.join(", ")})${op.reason ? `: ${op.reason}` : ""}.` },
      );
      return;
    }
    case "google_delete": {
      // Never remove the Google copy of something that still exists on the website.
      if (op.eventId && (await store.siteEventExists(profileId, op.eventId))) return;
      await google.remove(op.googleEventId);
      if (op.eventId) await store.removeLink(connectionId, op.eventId);
      summary.toGoogle.deleted += 1;
      log.push({ direction: "to_google", action: "deleted", title: op.title, detail: `Removed ${quote(op.title)} from Google Calendar because it no longer exists on the website.` });
      return;
    }
    case "link_set":
      await store.setLink(connectionId, op.link);
      return;
    case "link_remove":
      await store.removeLink(connectionId, op.eventId);
      return;
  }
}

function opDirection(op: Op): LogEntry["direction"] {
  return op.type.startsWith("site_") ? "from_google" : op.type.startsWith("google_") ? "to_google" : "info";
}

function opTitle(op: Op): string | null {
  switch (op.type) {
    case "site_create":
      return op.content.title;
    case "site_update":
    case "site_delete":
    case "google_create":
    case "google_update":
      return op.event.title;
    case "google_delete":
      return op.title;
    default:
      return null;
  }
}

function opVerb(op: Op): string {
  switch (op.type) {
    case "site_create":
      return "add";
    case "site_update":
    case "google_update":
      return "update";
    case "site_delete":
    case "google_delete":
      return "remove";
    case "google_create":
      return "send";
    default:
      return "record";
  }
}
