import { createHash } from "node:crypto";
import { jamaicaDateOf, spansWholeDays } from "@/lib/calendar/dates";

/**
 * The decision-making half of two-way Google Calendar sync. Everything in
 * here is pure — no database, no network — so the rules for "who changed
 * what, and which side wins" can be tested exhaustively.
 *
 * The model is a three-way merge. For every event mirrored between the
 * website and a Google calendar we remember `syncedHash`: a fingerprint of
 * the content both sides last agreed on. At the next sync, comparing each
 * side's fingerprint against that remembered one says exactly who changed:
 *
 *   website == Google                      already in step
 *   Google == remembered, website differs  edited on the website  -> push to Google
 *   website == remembered, Google differs  edited in Google       -> pull to the website
 *   both differ from remembered            conflict; the newer edit wins
 *
 * Counselling appointments booked by members are different: the platform
 * owns them (they have a request, notifications and a cancellation flow),
 * so for those the website always wins and an edit or deletion in Google is
 * put back.
 */

export type EventKind = "day_off" | "busy" | "appointment" | "meeting";

/** The fields the website and Google both hold, and so the only fields that sync. */
export type Content = {
  title: string;
  startsAt: string;
  endsAt: string;
  location: string | null;
  meetingUrl: string | null;
  isPrivate: boolean;
};

export type SiteEvent = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  kind: EventKind;
  visibility: "public" | "private";
  location: string | null;
  meetingUrl: string | null;
  updatedAt: string;
  /** The platform owns this entry: Google edits and deletions are reverted. */
  readOnly: boolean;
};

export type GoogleEvent = {
  id: string;
  status?: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: { date?: string; dateTime?: string; timeZone?: string };
  end?: { date?: string; dateTime?: string; timeZone?: string };
  transparency?: string;
  visibility?: string;
  hangoutLink?: string;
  conferenceData?: { entryPoints?: { entryPointType?: string; uri?: string }[] };
  recurringEventId?: string;
  recurrence?: string[];
  updated?: string;
  extendedProperties?: { private?: Record<string, string> };
  colorId?: string;
};

/** A full event, for creating one. */
export type GoogleEventBody = Omit<GoogleEvent, "updated">;

/** Only the synced fields, for changing one. A null clears the field in Google. */
export type GooglePatch = {
  summary: string;
  location: string | null;
  description: string;
  start: { date?: string; dateTime?: string; timeZone?: string };
  end: { date?: string; dateTime?: string; timeZone?: string };
  visibility: string;
};

export type Link = { eventId: string; googleEventId: string; syncedHash: string; googleUpdated: string | null };

export const TITLE_FALLBACK = "(No title)";
export const MAX_LOCATION = 200;
export const MAX_MEETING_URL = 500;
export const MAX_TITLE = 200;
const FOOTER = "Kept in step with the church platform: changes made here or on the website update both.";

// ---------------------------------------------------------------------------
// Identifiers

/** Events created on the website keep a predictable Google id (a-v and 0-9 only, as Google requires). */
export function googleIdForSiteEvent(eventId: string): string {
  return `e${eventId.replaceAll("-", "")}`;
}

function uuidFromHex(hex: string): string {
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/** The website event a platform-created Google event id points back to; null for any other id. */
export function siteEventIdFromGoogleId(googleId: string): string | null {
  const match = /^e([0-9a-f]{32})$/.exec(googleId);
  return match ? uuidFromHex(match[1]!) : null;
}

/**
 * The id given to a website row created from a Google event. Derived from
 * the Google event, so importing the same event twice — after a crash
 * between creating the row and saving the link, say — lands on the same row
 * instead of a duplicate.
 */
export function importedSiteEventId(connectionId: string, googleEventId: string): string {
  const bytes = createHash("sha256").update(`gcal-import:${connectionId}:${googleEventId}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  return uuidFromHex(bytes.toString("hex"));
}

/** Working-hours blocks the platform manages in Google (recurring "Available" entries). */
export function googleIdForAvailability(availabilityId: string): string {
  return `a${availabilityId.replaceAll("-", "")}`;
}

function isManaged(g: GoogleEvent): boolean {
  return g.extendedProperties?.private?.church_managed === "yes";
}

/** True for a working-hours block, or an occurrence of one. */
export function isAvailabilityEntry(g: GoogleEvent): boolean {
  return /^a[0-9a-f]{32}(_|$)/.test(g.id) || /^a[0-9a-f]{32}$/.test(g.recurringEventId ?? "");
}

// ---------------------------------------------------------------------------
// Content: what the two sides can agree on

const clean = (text: string | null | undefined): string => (text ?? "").replace(/\r\n?/g, "\n").trim();

function secondPrecision(iso: string): string {
  return new Date(iso).toISOString().replace(/\.\d{3}Z$/, "Z");
}

function httpsUrl(candidate: string | null | undefined): string | null {
  const url = clean(candidate);
  return /^https:\/\/\S+$/i.test(url) && url.length <= MAX_MEETING_URL ? url : null;
}

export function contentOfSite(e: SiteEvent): Content {
  return {
    title: clean(e.title),
    startsAt: secondPrecision(e.startsAt),
    endsAt: secondPrecision(e.endsAt),
    location: clean(e.location) || null,
    meetingUrl: clean(e.meetingUrl) || null,
    isPrivate: e.visibility !== "public",
  };
}

function googleInstant(point: GoogleEvent["start"]): string | null {
  if (point?.dateTime) return secondPrecision(point.dateTime);
  if (point?.date) return secondPrecision(`${point.date}T00:00:00-05:00`);
  return null;
}

const VIDEO_LINE = /^Video call:[ \t]*(https:\/\/\S+)[ \t]*$/im;

/**
 * The video link of a Google event. A "Video call:" line in the description
 * is checked first because it is what the website writes, so an edit made
 * on the website stays in force even where Google holds its own Meet link.
 */
function meetingUrlOfGoogle(g: GoogleEvent): string | null {
  const fromConference = g.conferenceData?.entryPoints?.find((p) => p.entryPointType === "video")?.uri;
  return httpsUrl(VIDEO_LINE.exec(g.description ?? "")?.[1]) ?? httpsUrl(g.hangoutLink) ?? httpsUrl(fromConference) ?? httpsUrl(g.location);
}

/** Null when the event has no usable start and end. */
export function contentOfGoogle(g: GoogleEvent): Content | null {
  const startsAt = googleInstant(g.start);
  let endsAt = googleInstant(g.end);
  if (!startsAt || !endsAt) return null;
  if (new Date(endsAt) <= new Date(startsAt)) endsAt = secondPrecision(new Date(new Date(startsAt).getTime() + 30 * 60_000).toISOString());
  const meetingUrl = meetingUrlOfGoogle(g);
  // The website puts a video link in Google's location field when there is
  // no physical place, so a location that is only that link is not an address.
  const location = clean(g.location);
  const physical = location && location !== meetingUrl ? location : "";
  return {
    title: (clean(g.summary) || TITLE_FALLBACK).slice(0, MAX_TITLE),
    startsAt,
    endsAt,
    location: physical ? physical.slice(0, MAX_LOCATION) : null,
    meetingUrl,
    isPrivate: g.visibility === "private" || g.visibility === "confidential",
  };
}

export function hashContent(c: Content): string {
  return createHash("sha256").update(JSON.stringify([c.title, c.startsAt, c.endsAt, c.location, c.meetingUrl, c.isPrivate])).digest("hex");
}

export function changedFields(before: Content, after: Content): string[] {
  const fields: string[] = [];
  if (before.title !== after.title) fields.push("title");
  if (before.startsAt !== after.startsAt || before.endsAt !== after.endsAt) fields.push("time");
  if (before.location !== after.location) fields.push("location");
  if (before.meetingUrl !== after.meetingUrl) fields.push("video link");
  if (before.isPrivate !== after.isPrivate) fields.push("privacy");
  return fields;
}

/** Imported entries block time, so they are "meeting" when they say where or how, else "busy". */
export function kindForImport(c: Content): EventKind {
  return c.location || c.meetingUrl ? "meeting" : "busy";
}

// ---------------------------------------------------------------------------
// Website event -> Google event

const COLOR_BY_KIND: Record<EventKind, string> = { appointment: "9", day_off: "5", meeting: "7", busy: "11" };

function googleTimes(c: Content): Pick<GooglePatch, "start" | "end"> {
  const wholeDays = spansWholeDays(c.startsAt, c.endsAt);
  return {
    start: wholeDays ? { date: jamaicaDateOf(c.startsAt) } : { dateTime: c.startsAt, timeZone: "America/Jamaica" },
    end: wholeDays ? { date: jamaicaDateOf(c.endsAt) } : { dateTime: c.endsAt, timeZone: "America/Jamaica" },
  };
}

/**
 * The description with its "Video call:" line set to `url`, or removed when
 * there is none. Everything else the person wrote is left alone.
 */
export function descriptionWithVideoLink(existing: string | null | undefined, url: string | null): string {
  const kept = clean(existing)
    .split("\n")
    .filter((line) => !/^Video call:/i.test(line.trim()))
    .join("\n")
    .trim();
  return [url ? `Video call: ${url}` : null, kept].filter(Boolean).join("\n\n");
}

/** A new Google event for a website entry. */
export function googleBodyForSite(e: SiteEvent): GoogleEventBody {
  const content = contentOfSite(e);
  return {
    id: googleIdForSiteEvent(e.id),
    status: "confirmed",
    summary: content.title,
    // Google shows LOCATION under the title on every client. A place and a
    // video link can both exist, so the link goes there only when there is
    // no place, and always to the description where it can be tapped.
    location: content.location ?? content.meetingUrl ?? undefined,
    description: descriptionWithVideoLink(FOOTER, content.meetingUrl),
    ...googleTimes(content),
    transparency: "opaque",
    visibility: content.isPrivate ? "private" : "default",
    colorId: COLOR_BY_KIND[e.kind],
    extendedProperties: { private: { church_managed: "yes", church_kind: "event", church_event_id: e.id } },
  };
}

/**
 * A change to an existing Google event. Only the synced fields are sent, so
 * attendees, reminders, Meet details and the rest of what someone set up in
 * Google survive an edit made on the website.
 */
export function googlePatchForSite(e: SiteEvent, existingDescription: string | undefined): GooglePatch {
  const content = contentOfSite(e);
  return {
    summary: content.title,
    location: content.location ?? content.meetingUrl,
    description: descriptionWithVideoLink(existingDescription, content.meetingUrl),
    ...googleTimes(content),
    visibility: content.isPrivate ? "private" : "default",
  };
}

// ---------------------------------------------------------------------------
// Working hours (one-way: the website is the only editor)

export type HoursBlock = { id: string; dayOfWeek: number; startTime: string; endTime: string; label: string | null };

export function googleBodyForHours(h: HoursBlock): GoogleEventBody {
  // 2024-01-07 is a Sunday, so adding day_of_week lands on that weekday.
  const date = new Date("2024-01-07T12:00:00Z");
  date.setUTCDate(date.getUTCDate() + h.dayOfWeek);
  const day = date.toISOString().slice(0, 10);
  return {
    id: googleIdForAvailability(h.id),
    status: "confirmed",
    summary: `Available${h.label ? `: ${h.label}` : ""}`,
    description: "Weekly working hours, managed on the church platform: change them there, not here.",
    start: { dateTime: `${day}T${h.startTime}-05:00`, timeZone: "America/Jamaica" },
    end: { dateTime: `${day}T${h.endTime}-05:00`, timeZone: "America/Jamaica" },
    recurrence: ["RRULE:FREQ=WEEKLY"],
    transparency: "transparent",
    colorId: "2",
  };
}

function fingerprint(body: GoogleEventBody): string {
  return createHash("sha256").update(JSON.stringify(body)).digest("hex").slice(0, 24);
}

export type HoursOp =
  | { type: "create"; body: GoogleEventBody }
  | { type: "update"; id: string; body: GoogleEventBody }
  | { type: "delete"; id: string };

/**
 * Brings Google's managed working-hours entries in line with the website. An
 * entry is only rewritten when its fingerprint changed, so an unchanged
 * schedule costs no Google writes at all.
 */
export function planHours(hours: HoursBlock[], existing: GoogleEvent[]): HoursOp[] {
  const ops: HoursOp[] = [];
  const managed = new Map(existing.filter((g) => isManaged(g) && /^a[0-9a-f]{32}$/.test(g.id)).map((g) => [g.id, g]));
  const wanted = new Set<string>();
  for (const block of hours) {
    const plain = googleBodyForHours(block);
    const body: GoogleEventBody = { ...plain, extendedProperties: { private: { church_managed: "yes", church_kind: "availability", church_hash: fingerprint(plain) } } };
    wanted.add(plain.id);
    const current = managed.get(plain.id);
    if (!current) ops.push({ type: "create", body });
    else if (current.extendedProperties?.private?.church_hash !== body.extendedProperties!.private!.church_hash) ops.push({ type: "update", id: plain.id, body });
  }
  for (const id of managed.keys()) if (!wanted.has(id)) ops.push({ type: "delete", id });
  return ops;
}

// ---------------------------------------------------------------------------
// The merge

export type Op =
  | { type: "site_create"; googleEventId: string; content: Content; kind: EventKind; googleUpdated: string | null }
  | { type: "site_update"; event: SiteEvent; googleEventId: string; content: Content; googleUpdated: string | null; fields: string[]; reason?: string }
  | { type: "site_delete"; event: SiteEvent; googleEventId: string }
  | { type: "google_create"; event: SiteEvent; restored?: boolean }
  | { type: "google_update"; event: SiteEvent; googleEventId: string; google: GoogleEvent; fields: string[]; restored?: boolean; reason?: string }
  | { type: "google_delete"; googleEventId: string; title: string; eventId: string | null }
  | { type: "link_set"; link: Link }
  | { type: "link_remove"; eventId: string };

export type MergeInput = {
  /** Which connection this is, so entries imported from Google can be recognised by their derived ids. */
  connectionId: string;
  site: SiteEvent[];
  google: GoogleEvent[];
  links: Link[];
  /** Linked Google ids confirmed gone by asking Google directly. */
  confirmedGone: Set<string>;
};

const isCancelled = (g: GoogleEvent | undefined) => g?.status === "cancelled";

/**
 * Linked entries absent from Google's list. Only entries lying wholly inside
 * the listed window can be called missing — outside it, absence proves
 * nothing — and even those are confirmed with a direct lookup before
 * anything is deleted on the website.
 */
export function findMissing(site: SiteEvent[], google: GoogleEvent[], links: Link[], windowStart: Date, windowEnd: Date): string[] {
  const listed = new Set(google.filter((g) => !isCancelled(g)).map((g) => g.id));
  const siteById = new Map(site.map((s) => [s.id, s]));
  const missing: string[] = [];
  for (const link of links) {
    if (listed.has(link.googleEventId)) continue;
    const event = siteById.get(link.eventId);
    if (!event) continue;
    if (new Date(event.startsAt) >= windowStart && new Date(event.endsAt) <= windowEnd) missing.push(link.googleEventId);
  }
  return missing;
}

export function mergeEvents(input: MergeInput): Op[] {
  const { connectionId, site, google, links, confirmedGone } = input;
  const ops: Op[] = [];
  const googleById = new Map(google.map((g) => [g.id, g]));
  const linkByEvent = new Map(links.map((l) => [l.eventId, l]));
  const linkByGoogle = new Map(links.map((l) => [l.googleEventId, l]));
  const siteById = new Map(site.map((s) => [s.id, s]));
  // A website row made from a Google entry has an id derived from it. If the
  // link was never saved (a crash in between), this is how the pair is found.
  const importedFrom = new Map<string, GoogleEvent>();
  for (const g of google) if (!isCancelled(g) && !linkByGoogle.has(g.id)) importedFrom.set(importedSiteEventId(connectionId, g.id), g);

  // A. Everything the website holds.
  for (const s of site) {
    let link = linkByEvent.get(s.id);
    let adopted = false;
    if (!link) {
      const existing = googleById.get(googleIdForSiteEvent(s.id)) ?? importedFrom.get(s.id);
      if (existing && !isCancelled(existing)) {
        // Already mirrored (by the earlier one-way sync, or an import whose
        // link was lost): take it over, assuming the two matched.
        link = { eventId: s.id, googleEventId: existing.id, syncedHash: hashContent(contentOfSite(s)), googleUpdated: null };
        adopted = true;
      } else {
        ops.push({ type: "google_create", event: s });
        continue;
      }
    }
    const g = googleById.get(link.googleEventId);
    if (!g || isCancelled(g)) {
      if (isCancelled(g) || confirmedGone.has(link.googleEventId)) {
        if (s.readOnly) ops.push({ type: "google_create", event: s, restored: true });
        else ops.push({ type: "site_delete", event: s, googleEventId: link.googleEventId });
      }
      continue;
    }
    const theirs = contentOfGoogle(g);
    if (!theirs) continue;
    const ours = contentOfSite(s);
    const hs = hashContent(ours);
    const hg = hashContent(theirs);
    if (hs === hg) {
      if (adopted || link.syncedHash !== hs || link.googleUpdated !== (g.updated ?? null)) {
        ops.push({ type: "link_set", link: { eventId: s.id, googleEventId: g.id, syncedHash: hs, googleUpdated: g.updated ?? null } });
      }
      continue;
    }
    if (s.readOnly) {
      ops.push({ type: "google_update", event: s, googleEventId: g.id, google: g, fields: changedFields(theirs, ours), restored: true });
      continue;
    }
    const websiteChanged = hs !== link.syncedHash;
    const googleChanged = hg !== link.syncedHash;
    if (websiteChanged && !googleChanged) {
      ops.push({ type: "google_update", event: s, googleEventId: g.id, google: g, fields: changedFields(theirs, ours) });
    } else if (googleChanged && !websiteChanged) {
      ops.push({ type: "site_update", event: s, googleEventId: g.id, content: theirs, googleUpdated: g.updated ?? null, fields: changedFields(ours, theirs) });
    } else if (new Date(g.updated ?? 0).getTime() > new Date(s.updatedAt).getTime()) {
      // Both sides changed since they last agreed: the more recent edit wins.
      ops.push({ type: "site_update", event: s, googleEventId: g.id, content: theirs, googleUpdated: g.updated ?? null, fields: changedFields(ours, theirs), reason: "both were edited; Google's edit was newer" });
    } else {
      ops.push({ type: "google_update", event: s, googleEventId: g.id, google: g, fields: changedFields(theirs, ours), reason: "both were edited; the website's edit was newer" });
    }
  }

  // B. Google entries the website does not know yet.
  for (const g of google) {
    if (isCancelled(g) || linkByGoogle.has(g.id) || isAvailabilityEntry(g)) continue;
    if (siteById.has(importedSiteEventId(connectionId, g.id))) continue; // adopted above
    const mirroredId = siteEventIdFromGoogleId(g.id);
    if (mirroredId && isManaged(g)) {
      if (siteById.has(mirroredId)) continue; // adopted above
      // Written by the platform for an entry that no longer exists: tidy it away.
      ops.push({ type: "google_delete", googleEventId: g.id, title: clean(g.summary) || TITLE_FALLBACK, eventId: mirroredId });
      continue;
    }
    if (g.transparency === "transparent") continue; // shown as "free" in Google: it does not block time
    const content = contentOfGoogle(g);
    if (!content) continue;
    ops.push({ type: "site_create", googleEventId: g.id, content, kind: kindForImport(content), googleUpdated: g.updated ?? null });
  }

  // C. Mirrors of website entries that were deleted on the website.
  for (const link of links) {
    if (siteById.has(link.eventId)) continue;
    const g = googleById.get(link.googleEventId);
    if (g && !isCancelled(g)) ops.push({ type: "google_delete", googleEventId: link.googleEventId, title: clean(g.summary) || TITLE_FALLBACK, eventId: link.eventId });
    else ops.push({ type: "link_remove", eventId: link.eventId });
  }

  return ops;
}
