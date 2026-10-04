import { randomUUID } from "node:crypto";
import { countdownStore, type CountdownStore } from "./store";
import {
  DEFAULT_OUTRO_OVERLAYS,
  DEFAULT_TEMPLATES,
  OUTRO_DURATION_MS,
  OUTRO_MEDIA_SRC,
  initialLiveState,
  isForcedState,
  restoreCountdown,
  restoreTextOverlay,
  sanitizeSegments,
  sanitizeSong,
  sanitizeTextOverlayStyle,
  savedCountdownOf,
  type EventTemplate,
  type LiveState,
  type SanctuaryOverride,
  type Song,
} from "./state";

// The Live Countdown's server, ported from its own Socket.IO server into the
// church platform. Every sanctuary TV, OBS overlay and control panel holds a
// live connection (app/tools/live/api/stream) and receives the same events
// it used to get over Socket.IO; the control panel sends its changes to
// app/tools/live/api/emit. public/tools/live/live-socket.js gives the old
// pages the same `io()` they were written against.
//
// One hub per server process, kept on globalThis so every route shares it.
// The site runs as a single Railway service, so that is the whole picture.

export type Role = "sanctuary" | "overlay" | "admin";

export type Client = {
  id: string;
  role: Role;
  isAdmin: boolean;
  /** Returns false once the connection is gone. */
  send: (event: string, data?: unknown) => boolean;
};

export type Hub = {
  state: LiveState;
  templates: EventTemplate[];
  songs: Song[];
  clients: Map<string, Client>;
  store: CountdownStore | null;
  outroTimer: ReturnType<typeof setTimeout> | null;
  saveTimer: ReturnType<typeof setTimeout> | null;
};

export type IncomingEvent = { event: string; data?: unknown };

const HUB_KEY = Symbol.for("bullbay.live-countdown.hub");
type GlobalWithHub = typeof globalThis & { [HUB_KEY]?: Promise<Hub> };

export function getHub(): Promise<Hub> {
  const g = globalThis as GlobalWithHub;
  return (g[HUB_KEY] ??= bootHub(countdownStore()));
}

const log = (...args: unknown[]) => console.log("[live-countdown]", ...args);
const warn = (...args: unknown[]) => console.error("[live-countdown]", ...args);

function save(what: string, write: () => Promise<void>) {
  write().catch((error: unknown) => warn(`could not ${what}:`, error instanceof Error ? error.message : error));
}

async function withRetry<T>(read: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await read();
    } catch (error) {
      if (attempt >= 3) throw error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    }
  }
}

const isObject = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const isMediaUrl = (value: unknown): value is string => typeof value === "string" && /^(https:\/\/|\/)/.test(value);

/** Loads everything the old server loaded at start-up. A failed read falls
 *  back to the built-in defaults for this run, but is never treated as
 *  "empty": the old server re-seeded the default templates over the saved
 *  ones whenever a read failed. */
export async function bootHub(store: CountdownStore | null): Promise<Hub> {
  const hub: Hub = {
    state: initialLiveState(),
    templates: DEFAULT_TEMPLATES.map((t) => ({ ...t })),
    songs: [],
    clients: new Map(),
    store,
    outroTimer: null,
    saveTimer: null,
  };
  if (!store) {
    warn("COUNTDOWN_SUPABASE_URL / COUNTDOWN_SUPABASE_SERVICE_KEY are not set: running from built-in templates, nothing will be saved.");
    return hub;
  }
  const outcome = async <T>(read: () => Promise<T>): Promise<{ ok: true; value: T } | { ok: false; value: undefined }> => {
    try {
      return { ok: true, value: await withRetry(read) };
    } catch (error) {
      warn("start-up read failed:", error instanceof Error ? error.message : error);
      return { ok: false, value: undefined };
    }
  };
  const [templates, songs, background, music, text, override, countdown] = await Promise.all([
    outcome(() => store.loadTemplates()),
    outcome(() => store.loadSongs()),
    outcome(() => store.getSetting("backgroundMedia")),
    outcome(() => store.getSetting("musicTrack")),
    outcome(() => store.getSetting("textOverlay")),
    outcome(() => store.getSetting("sanctuaryOverride")),
    outcome(() => store.getSetting("countdownState")),
  ]);

  if (templates.ok) {
    const saved = templates.value.filter((t) => isObject(t) && typeof t.id === "string");
    if (saved.length) hub.templates = saved;
    else for (const t of hub.templates) save("seed a template", () => store.saveTemplate(t));
  }
  if (songs.ok) hub.songs = songs.value.slice().sort((a, b) => a.title.localeCompare(b.title));
  if (isObject(background.value) && isMediaUrl(background.value.url)) hub.state.backgroundMedia = background.value as LiveState["backgroundMedia"];
  if (isObject(music.value) && isMediaUrl(music.value.url)) hub.state.musicTrack = music.value as LiveState["musicTrack"];
  hub.state.textOverlay = restoreTextOverlay(text.value, hub.state.textOverlay);
  restoreCountdown(countdown.value, hub.state);
  const resumed = override.value as SanctuaryOverride | null | undefined;
  if (isObject(resumed) && typeof resumed.endsAt === "number" && resumed.endsAt > Date.now()) {
    hub.state.sanctuaryOverride = resumed;
    scheduleOutroClear(hub, resumed.endsAt - Date.now());
    log("resumed the outro that was playing before the restart");
  }
  return hub;
}

// ---------------------------------------------------------------------------
// Connections ("rooms" in the old server: sanctuary, overlay, admin)
// ---------------------------------------------------------------------------

function sendTo(hub: Hub, filter: (client: Client) => boolean, event: string, data?: unknown) {
  for (const client of [...hub.clients.values()]) {
    if (filter(client) && !client.send(event, data)) disconnect(hub, client.id);
  }
}

const everyone = () => true;
const admins = (client: Client) => client.role === "admin";
const sanctuaryAndAdmins = (client: Client) => client.role === "sanctuary" || client.role === "admin";

function broadcastState(hub: Hub) {
  sendTo(hub, everyone, "stateSync", hub.state);
}

function broadcastTemplates(hub: Hub) {
  sendTo(hub, everyone, "templatesSync", hub.templates);
}

function broadcastSanctuaryCount(hub: Hub) {
  const count = [...hub.clients.values()].filter((client) => client.role === "sanctuary").length;
  sendTo(hub, admins, "sanctuaryCount", count);
}

/** Registers a live connection and sends it everything a newly connected
 *  Socket.IO client used to receive. `isAdmin` comes from the visitor's
 *  church sign-in, checked once when the connection opens (as the old server
 *  checked its login cookie), never from anything the page sends later. */
export function connect(hub: Hub, role: Role, isAdmin: boolean, send: Client["send"]): Client {
  const client: Client = { id: randomUUID(), role, isAdmin, send };
  hub.clients.set(client.id, client);
  send("hello", { id: client.id });
  send("stateSync", hub.state);
  send("templatesSync", hub.templates);
  if (role === "admin") send("songLibrarySync", hub.songs);
  if (role !== "overlay" && hub.state.sanctuaryOverride) send("sanctuaryOverride", hub.state.sanctuaryOverride);
  if (role !== "overlay") setImmediate(() => broadcastSanctuaryCount(hub));
  return client;
}

export function disconnect(hub: Hub, clientId: string) {
  const client = hub.clients.get(clientId);
  if (!client) return;
  hub.clients.delete(clientId);
  if (client.role === "sanctuary") setImmediate(() => broadcastSanctuaryCount(hub));
}

// ---------------------------------------------------------------------------
// Saving
// ---------------------------------------------------------------------------

/** Debounced: the volume slider sends a change for every step it moves. */
function saveCountdownSoon(hub: Hub) {
  const store = hub.store;
  if (!store) return;
  if (hub.saveTimer) clearTimeout(hub.saveTimer);
  hub.saveTimer = setTimeout(() => {
    hub.saveTimer = null;
    save("save the countdown", () => store.setSetting("countdownState", savedCountdownOf(hub.state)));
  }, 1000);
}

function saveSetting(hub: Hub, key: string, value: unknown) {
  const store = hub.store;
  if (store) save(`save ${key}`, () => store.setSetting(key, value));
}

// ---------------------------------------------------------------------------
// End-of-service outro
// ---------------------------------------------------------------------------

function scheduleOutroClear(hub: Hub, msFromNow: number) {
  if (hub.outroTimer) clearTimeout(hub.outroTimer);
  hub.outroTimer = setTimeout(() => clearOutro(hub, "timer"), Math.max(0, msFromNow));
}

function clearOutro(hub: Hub, source: string) {
  if (!hub.state.sanctuaryOverride) return;
  log(`outro cleared (${source})`);
  hub.state.sanctuaryOverride = null;
  if (hub.outroTimer) {
    clearTimeout(hub.outroTimer);
    hub.outroTimer = null;
  }
  saveSetting(hub, "sanctuaryOverride", null);
  sendTo(hub, sanctuaryAndAdmins, "sanctuaryOverrideClear");
}

// ---------------------------------------------------------------------------
// What each kind of client may send
// ---------------------------------------------------------------------------

type Handler = (hub: Hub, data: unknown, client: Client) => void;

const ADMIN_EVENTS: Record<string, Handler> = {
  setEvent(hub, data) {
    if (!isObject(data) || Number.isNaN(new Date(data.startTime as string).getTime())) return;
    if (data.isOneTime && isObject(data.oneTimeData)) {
      hub.state.activeEvent = { ...data.oneTimeData, id: "one_time_custom" };
    } else {
      const template = hub.templates.find((t) => t.id === data.templateId) ?? hub.templates[0];
      hub.state.activeEvent = template ? { ...template } : null;
    }
    hub.state.startTime = new Date(data.startTime as string).toISOString();
    hub.state.isLive = Boolean(data.isLive);
    hub.state.forcedState = "pre";
    log(`event started: ${hub.state.activeEvent?.name ?? "(unnamed)"}`);
    broadcastState(hub);
    saveCountdownSoon(hub);
  },
  addDelay(hub, minutes) {
    const add = Number(minutes);
    if (!hub.state.startTime || !Number.isFinite(add)) return;
    hub.state.startTime = new Date(new Date(hub.state.startTime).getTime() + add * 60000).toISOString();
    broadcastState(hub);
    saveCountdownSoon(hub);
  },
  musicControl(hub, data) {
    if (!isObject(data)) return;
    const music = hub.state.music;
    if (typeof data.playing === "boolean") music.playing = data.playing;
    if (typeof data.volume === "number" && Number.isFinite(data.volume)) music.volume = Math.min(1, Math.max(0, data.volume));
    if (typeof data.loop === "boolean") music.loop = data.loop;
    broadcastState(hub);
    saveCountdownSoon(hub);
  },
  musicRestart(hub) {
    hub.state.music.restartPulse = Date.now();
    hub.state.music.playing = true;
    broadcastState(hub);
    saveCountdownSoon(hub);
  },
  forceState(hub, value) {
    if (!isForcedState(value)) return;
    hub.state.forcedState = value;
    broadcastState(hub);
    saveCountdownSoon(hub);
  },
  selectBackgroundMedia(hub, data) {
    if (!isObject(data) || !isMediaUrl(data.url) || (data.kind !== "video" && data.kind !== "image")) return;
    hub.state.backgroundMedia = { url: data.url, kind: data.kind, name: String(data.name ?? ""), path: String(data.path ?? "") };
    saveSetting(hub, "backgroundMedia", hub.state.backgroundMedia);
    broadcastState(hub);
  },
  selectMusicTrack(hub, data) {
    if (!isObject(data) || !isMediaUrl(data.url)) return;
    hub.state.musicTrack = { url: data.url, name: String(data.name ?? ""), path: String(data.path ?? "") };
    saveSetting(hub, "musicTrack", hub.state.musicTrack);
    broadcastState(hub);
  },
  /** Partial patch: only the field(s) that changed (new lyrics, another
   *  verse, a style tweak, show/hide). */
  updateTextOverlay(hub, patch) {
    if (!isObject(patch)) return;
    const to = hub.state.textOverlay;
    if (typeof patch.rawInput === "string") to.rawInput = patch.rawInput.slice(0, 20000);
    if (patch.segments !== undefined) {
      const segments = sanitizeSegments(patch.segments);
      if (segments) to.segments = segments;
    }
    if (Number.isInteger(patch.currentIndex)) {
      to.currentIndex = Math.max(0, Math.min(patch.currentIndex as number, Math.max(0, to.segments.length - 1)));
    }
    if (typeof patch.visible === "boolean") to.visible = patch.visible;
    if (typeof patch.songTitle === "string") to.songTitle = patch.songTitle.slice(0, 120);
    if (patch.style !== undefined) to.style = sanitizeTextOverlayStyle(patch.style, to.style);
    saveSetting(hub, "textOverlay", to);
    broadcastState(hub);
  },
  saveSong(hub, data) {
    const existing = isObject(data) && typeof data.id === "string" ? hub.songs.find((s) => s.id === data.id) : undefined;
    const song = sanitizeSong(data, existing?.id ?? null);
    if (!song) return;
    const index = hub.songs.findIndex((s) => s.id === song.id);
    if (index === -1) hub.songs.push(song);
    else hub.songs[index] = song;
    hub.songs.sort((a, b) => a.title.localeCompare(b.title));
    const store = hub.store;
    if (store) save("save a song", () => store.saveSong(song));
    sendTo(hub, admins, "songLibrarySync", hub.songs);
  },
  deleteSong(hub, id) {
    if (typeof id !== "string") return;
    hub.songs = hub.songs.filter((s) => s.id !== id);
    const store = hub.store;
    if (store) save("delete a song", () => store.deleteSong(id));
    sendTo(hub, admins, "songLibrarySync", hub.songs);
  },
  startOutro(hub) {
    // Screens ignore a second start while one is playing, so restarting here
    // would only put the timer out of step with them. Stop it first.
    if (hub.state.sanctuaryOverride) return;
    const now = Date.now();
    hub.state.sanctuaryOverride = {
      type: "OUTRO",
      startedAt: now,
      durationMs: OUTRO_DURATION_MS,
      endsAt: now + OUTRO_DURATION_MS,
      media: { kind: "audio", src: OUTRO_MEDIA_SRC },
      overlays: DEFAULT_OUTRO_OVERLAYS,
      returnTo: "IDLE",
    };
    log("outro started");
    saveSetting(hub, "sanctuaryOverride", hub.state.sanctuaryOverride);
    scheduleOutroClear(hub, OUTRO_DURATION_MS);
    sendTo(hub, sanctuaryAndAdmins, "sanctuaryOverride", hub.state.sanctuaryOverride);
  },
  clearOutro(hub) {
    clearOutro(hub, "control panel");
  },
  saveTemplate(hub, data) {
    if (!isObject(data)) return;
    const template = { ...data } as EventTemplate;
    if (typeof template.id !== "string" || !template.id) template.id = `tpl_${Date.now()}`;
    const index = hub.templates.findIndex((t) => t.id === template.id);
    if (index === -1) hub.templates.push(template);
    else hub.templates[index] = template;
    const store = hub.store;
    if (store) save("save a template", () => store.saveTemplate(template));
    broadcastTemplates(hub);
  },
  deleteTemplate(hub, id) {
    if (typeof id !== "string") return;
    hub.templates = hub.templates.filter((t) => t.id !== id);
    const store = hub.store;
    if (store) save("delete a template", () => store.deleteTemplate(id));
    broadcastTemplates(hub);
  },
};

const SANCTUARY_EVENTS: Record<string, Handler> = {
  /** A screen's outro audio reached its end. */
  sanctuaryOutroEnded(hub) {
    clearOutro(hub, "screen finished playing");
  },
  /** A screen's browser refused to start the outro audio by itself. */
  audioBlocked(hub, data, client) {
    const reason = isObject(data) && typeof data.reason === "string" ? data.reason.slice(0, 80) : undefined;
    sendTo(hub, admins, "audioBlocked", { socketId: client.id, reason });
  },
};

/** Applies events from one client in the order it sent them. Anything a
 *  client isn't allowed to send is ignored, as the old server did. */
export function handleEvents(hub: Hub, clientId: string, events: IncomingEvent[]): "ok" | "unknown-client" {
  const client = hub.clients.get(clientId);
  if (!client) return "unknown-client";
  for (const item of events) {
    if (!isObject(item) || typeof item.event !== "string") continue;
    const handler = client.isAdmin && Object.hasOwn(ADMIN_EVENTS, item.event)
      ? ADMIN_EVENTS[item.event]
      : client.role === "sanctuary" && Object.hasOwn(SANCTUARY_EVENTS, item.event)
        ? SANCTUARY_EVENTS[item.event]
        : undefined;
    try {
      handler?.(hub, item.data, client);
    } catch (error) {
      warn(`${item.event} failed:`, error instanceof Error ? error.message : error);
    }
  }
  return "ok";
}

export function isMediaInUse(hub: Hub, path: string) {
  return hub.state.backgroundMedia?.path === path || hub.state.musicTrack?.path === path;
}
