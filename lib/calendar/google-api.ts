import type { GoogleEvent, GoogleEventBody, GooglePatch } from "@/lib/calendar/sync-core";

/**
 * The slice of the Google Calendar API the sync needs, for one calendar.
 * Kept behind a plain object so the sync engine can be tested against an
 * in-memory fake and the real calls checked separately.
 */
export type GoogleApi = {
  /** Every entry in the window, recurring ones expanded, deleted ones included as "cancelled". */
  listWindow(timeMin: string, timeMax: string): Promise<GoogleEvent[]>;
  /** The entries the platform itself wrote (recurring working hours as single master entries). */
  listManaged(): Promise<GoogleEvent[]>;
  /** One entry, or null when it no longer exists. */
  get(id: string): Promise<GoogleEvent | null>;
  insert(body: GoogleEventBody): Promise<GoogleEvent>;
  patch(id: string, patch: GooglePatch): Promise<GoogleEvent>;
  /** Replaces an entry outright; only used on entries the platform owns. */
  replace(id: string, body: GoogleEventBody): Promise<GoogleEvent>;
  remove(id: string): Promise<void>;
};

export class GoogleApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "GoogleApiError";
  }
}

const BASE = "https://www.googleapis.com/calendar/v3";
const MAX_PAGES = 10;
const RETRY_STATUSES = new Set([429, 500, 502, 503, 504]);
const RETRY_DELAYS_MS = [500, 1500, 4000];

// Only what the sync reads: keeps listings small and ignores attendee/reminder detail.
const EVENT_FIELDS =
  "id,status,summary,description,location,start,end,transparency,visibility,hangoutLink,conferenceData/entryPoints(entryPointType,uri),recurringEventId,recurrence,updated,colorId,extendedProperties/private";
const LIST_FIELDS = `nextPageToken,items(${EVENT_FIELDS})`;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function googleRestApi(calendarId: string, accessToken: string, fetchImpl: typeof fetch = fetch): GoogleApi {
  const root = `${BASE}/calendars/${encodeURIComponent(calendarId)}/events`;

  async function request(path: string, init: { method?: string; body?: unknown } = {}): Promise<Response> {
    for (let attempt = 0; ; attempt++) {
      const response = await fetchImpl(`${root}${path}`, {
        method: init.method ?? "GET",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
      });
      if (RETRY_STATUSES.has(response.status) && attempt < RETRY_DELAYS_MS.length) {
        const retryAfter = Number(response.headers.get("retry-after"));
        await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter * 1000, 8000) : RETRY_DELAYS_MS[attempt]!);
        continue;
      }
      return response;
    }
  }

  async function fail(response: Response, doing: string): Promise<never> {
    let detail = "";
    try {
      detail = ((await response.json()) as { error?: { message?: string } }).error?.message ?? "";
    } catch {
      // The body is only extra detail for the message.
    }
    const hint = response.status === 401 || response.status === 403 ? " Reconnect your Google account if access has expired." : "";
    throw new GoogleApiError(response.status, `Google Calendar could not ${doing} (${response.status}${detail ? `: ${detail}` : ""}).${hint}`);
  }

  async function list(params: Record<string, string>): Promise<GoogleEvent[]> {
    const items: GoogleEvent[] = [];
    let pageToken: string | undefined;
    for (let page = 0; page < MAX_PAGES; page++) {
      const query = new URLSearchParams({ maxResults: "2500", fields: LIST_FIELDS, ...params, ...(pageToken ? { pageToken } : {}) });
      const response = await request(`?${query}`);
      if (!response.ok) return fail(response, "list events");
      const body = (await response.json()) as { items?: GoogleEvent[]; nextPageToken?: string };
      items.push(...(body.items ?? []));
      pageToken = body.nextPageToken;
      if (!pageToken) return items;
    }
    throw new GoogleApiError(0, "Google Calendar returned more entries than can be synced at once.");
  }

  async function write(path: string, method: string, body: unknown, doing: string): Promise<GoogleEvent> {
    const response = await request(path, { method, body });
    if (!response.ok) return fail(response, doing);
    return (await response.json()) as GoogleEvent;
  }

  return {
    listWindow: (timeMin, timeMax) => list({ timeMin, timeMax, singleEvents: "true", showDeleted: "true" }),
    listManaged: () => list({ privateExtendedProperty: "church_managed=yes", singleEvents: "false" }),
    async get(id) {
      const response = await request(`/${encodeURIComponent(id)}?${new URLSearchParams({ fields: EVENT_FIELDS })}`);
      if (response.status === 404 || response.status === 410) return null;
      if (!response.ok) return fail(response, "look up an event");
      return (await response.json()) as GoogleEvent;
    },
    insert: (body) => write("", "POST", body, "create an event"),
    patch: (id, patch) => write(`/${encodeURIComponent(id)}`, "PATCH", patch, "update an event"),
    replace: (id, body) => write(`/${encodeURIComponent(id)}`, "PUT", body, "update an event"),
    async remove(id) {
      const response = await request(`/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!response.ok && response.status !== 404 && response.status !== 410) return fail(response, "delete an event");
    },
  };
}
