// Live Countdown: the state every sanctuary TV, OBS overlay and control panel
// shares, plus the checks applied to anything the control panel sends.
// Ported from the countdown's own server (server.js) when it moved into the
// church platform; behaviour is unchanged unless a comment says otherwise.

export type EventTemplate = {
  id: string;
  name?: string;
  subtitle?: string;
  preMessages?: string[];
  delayedMessages?: string[];
  liveMessage?: string;
  liveSubmessage?: string;
  footerText?: string;
  notices?: string[];
  hasStreamLabel?: boolean;
  [field: string]: unknown;
};

export type TextOverlayStyle = {
  fontFamily: string;
  fontSize: number;
  textColor: string;
  accentColor: string;
  align: string;
  position: string;
  background: string;
  textEffect: string;
  animation: string;
  uppercase: boolean;
  letterSpacing: number;
  showDivider: boolean;
};

export type Segment = { label: string; text: string };

export type TextOverlay = {
  visible: boolean;
  rawInput: string;
  segments: Segment[];
  currentIndex: number;
  songTitle: string;
  style: TextOverlayStyle;
};

export type OutroOverlay = { startMs: number; endMs: number; line1: string; line2: string };

export type SanctuaryOverride = {
  type: "OUTRO";
  startedAt: number;
  durationMs: number;
  endsAt: number;
  media: { kind: "audio" | "video"; src: string };
  overlays: OutroOverlay[];
  returnTo: string;
};

export type Song = { id: string; title: string; artist: string; rawInput: string };

export type LiveState = {
  activeEvent: EventTemplate | null;
  forcedState: string;
  startTime: string | null;
  isLive: boolean;
  music: { playing: boolean; volume: number; loop: boolean; restartPulse?: number };
  sanctuaryOverride: SanctuaryOverride | null;
  backgroundMedia: { url: string; kind: string; name: string; path: string } | null;
  musicTrack: { url: string; name: string; path: string } | null;
  textOverlay: TextOverlay;
};

/** The part of the countdown that used to live only in the old server's
 *  memory. It is now saved too, because this server redeploys with every
 *  website update: without it a deploy during a service would send every
 *  screen back to idle. */
export type SavedCountdown = Pick<LiveState, "activeEvent" | "forcedState" | "startTime" | "isLive"> & {
  music: { playing: boolean; volume: number; loop: boolean };
};

export const DEFAULT_TEMPLATES: EventTemplate[] = [
  {
    id: "sunday_service",
    name: "Sunday Service",
    subtitle: "Sunday Worship",
    preMessages: ["We are happy to have you with us this Sunday morning.", "Our pre-service countdown begins soon."],
    delayedMessages: ["We will begin shortly.", "Please stand by as we prepare for worship."],
    liveMessage: "We Are Now Live",
    liveSubmessage: "Please join us as worship begins",
    footerText: "",
    notices: [
      "Welcome to Bull Bay New Testament Church of God. We are glad you are here.",
      "Please prepare your heart and mind for worship.",
      "Kindly silence your phones and other devices.",
    ],
    hasStreamLabel: true,
  },
  {
    id: "prayer_meeting",
    name: "Prayer Meeting",
    subtitle: "Midweek Service",
    preMessages: ["Welcome to our Prayer Meeting.", "Please prepare your heart for prayer."],
    delayedMessages: ["We will begin our Prayer Meeting shortly.", "Thank you for waiting."],
    liveMessage: "We Are Now Live",
    liveSubmessage: "Let us unite our hearts in prayer.",
    footerText: "",
    notices: [
      "If you must move, please do so quietly.",
      "Let us maintain reverence as we begin shortly.",
      "Kindly silence your mobile devices.",
    ],
    hasStreamLabel: true,
  },
];

/** End-of-service outro, 4m 33s: blessing, scripture and send-off lines. */
export const OUTRO_DURATION_MS = 273000;
export const OUTRO_MEDIA_SRC = "/tools/live/media/Go%20in%20Peace.mp3";
export const DEFAULT_OUTRO_OVERLAYS: OutroOverlay[] = [
  { startMs: 0, endMs: 30000, line1: "Thank you for worshiping with us today.", line2: "" },
  { startMs: 30000, endMs: 60000, line1: "May the Lord bless you and keep you.", line2: "" },
  { startMs: 60000, endMs: 95000, line1: "The Lord bless thee, and keep thee: the Lord make His face shine upon thee.", line2: "— Numbers 6:24–25" },
  { startMs: 95000, endMs: 125000, line1: "May His peace go with you throughout this week.", line2: "" },
  { startMs: 125000, endMs: 160000, line1: "The Lord shall preserve thy going out and thy coming in, from this time forth.", line2: "— Psalm 121:8" },
  { startMs: 160000, endMs: 190000, line1: "Walk in faith. Walk in love. Walk in His grace.", line2: "" },
  { startMs: 190000, endMs: 225000, line1: "Let the peace of God rule in your hearts… and be ye thankful.", line2: "— Colossians 3:15" },
  { startMs: 225000, endMs: 250000, line1: "The grace of our Lord Jesus Christ be with you all.", line2: "" },
  { startMs: 250000, endMs: 273000, line1: "Go in peace.", line2: "God bless you." },
];

export const DEFAULT_TEXT_OVERLAY_STYLE: TextOverlayStyle = {
  fontFamily: "heading",
  fontSize: 2.6,
  textColor: "#f8f9fa",
  accentColor: "#d4af37",
  align: "center",
  position: "bottom",
  background: "glass",
  textEffect: "shadow",
  animation: "fade",
  uppercase: false,
  letterSpacing: 0,
  showDivider: true,
};

export function initialLiveState(): LiveState {
  return {
    activeEvent: null,
    forcedState: "idle",
    startTime: null,
    isLive: false,
    music: { playing: false, volume: 0.6, loop: true },
    sanctuaryOverride: null,
    backgroundMedia: null,
    musicTrack: null,
    textOverlay: { visible: false, rawInput: "", segments: [], currentIndex: 0, songTitle: "", style: { ...DEFAULT_TEXT_OVERLAY_STYLE } },
  };
}

const FONTS = ["heading", "elegant", "body", "bold", "impact", "script"];
const ALIGNS = ["left", "center", "right"];
const POSITIONS = ["top", "middle", "bottom"];
const BACKGROUNDS = ["glass", "solid", "none"];
const EFFECTS = ["none", "shadow", "glow", "outline", "gradient"];
const ANIMATIONS = ["none", "fade", "slide"];
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const FORCED_STATES = ["idle", "pre", "delayed", "live"];

type Loose = Record<string, unknown>;
const isObject = (value: unknown): value is Loose => Boolean(value) && typeof value === "object" && !Array.isArray(value);

/** Merges only well-formed, allow-listed fields onto `base`: the style ends
 *  up as inline CSS on a public page. */
export function sanitizeTextOverlayStyle(input: unknown, base: TextOverlayStyle): TextOverlayStyle {
  const s = { ...base };
  if (!isObject(input)) return s;
  const pick = (list: string[], value: unknown) => (typeof value === "string" && list.includes(value) ? value : null);
  s.fontFamily = pick(FONTS, input.fontFamily) ?? s.fontFamily;
  if (typeof input.fontSize === "number" && input.fontSize >= 1 && input.fontSize <= 6) s.fontSize = input.fontSize;
  if (typeof input.textColor === "string" && HEX_COLOR.test(input.textColor)) s.textColor = input.textColor;
  if (typeof input.accentColor === "string" && HEX_COLOR.test(input.accentColor)) s.accentColor = input.accentColor;
  s.align = pick(ALIGNS, input.align) ?? s.align;
  s.position = pick(POSITIONS, input.position) ?? s.position;
  s.background = pick(BACKGROUNDS, input.background) ?? s.background;
  s.textEffect = pick(EFFECTS, input.textEffect) ?? s.textEffect;
  s.animation = pick(ANIMATIONS, input.animation) ?? s.animation;
  if (typeof input.uppercase === "boolean") s.uppercase = input.uppercase;
  if (typeof input.letterSpacing === "number" && input.letterSpacing >= -0.05 && input.letterSpacing <= 0.5) s.letterSpacing = input.letterSpacing;
  if (typeof input.showDivider === "boolean") s.showDivider = input.showDivider;
  return s;
}

export function sanitizeSegments(input: unknown): Segment[] | null {
  if (!Array.isArray(input)) return null;
  return input
    .slice(0, 200)
    .map((seg: unknown) => {
      const s = isObject(seg) ? seg : {};
      return {
        label: typeof s.label === "string" ? s.label.slice(0, 60) : "Part",
        text: typeof s.text === "string" ? s.text.slice(0, 4000) : "",
      };
    })
    .filter((seg) => seg.text);
}

export function sanitizeSong(input: unknown, existingId: string | null): Song | null {
  if (!isObject(input)) return null;
  const title = typeof input.title === "string" ? input.title.trim().slice(0, 120) : "";
  const rawInput = typeof input.rawInput === "string" ? input.rawInput.trim().slice(0, 20000) : "";
  if (!title || !rawInput) return null;
  return {
    id: existingId || (typeof input.id === "string" && input.id ? input.id : `song_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`),
    title,
    artist: typeof input.artist === "string" ? input.artist.trim().slice(0, 120) : "",
    rawInput,
  };
}

/** Upgrades whatever text overlay was saved (older versions stored only
 *  `{ visible, text }`) onto the current one. */
export function restoreTextOverlay(saved: unknown, current: TextOverlay): TextOverlay {
  if (!isObject(saved)) return current;
  return {
    visible: typeof saved.visible === "boolean" ? saved.visible : current.visible,
    rawInput: typeof saved.rawInput === "string" ? saved.rawInput.slice(0, 20000) : current.rawInput,
    segments: Array.isArray(saved.segments) ? sanitizeSegments(saved.segments) ?? [] : current.segments,
    currentIndex: Number.isInteger(saved.currentIndex) ? (saved.currentIndex as number) : current.currentIndex,
    songTitle: typeof saved.songTitle === "string" ? saved.songTitle.slice(0, 120) : current.songTitle,
    style: sanitizeTextOverlayStyle(saved.style, current.style),
  };
}

export function savedCountdownOf(state: LiveState): SavedCountdown {
  return {
    activeEvent: state.activeEvent,
    forcedState: state.forcedState,
    startTime: state.startTime,
    isLive: state.isLive,
    music: { playing: state.music.playing, volume: state.music.volume, loop: state.music.loop },
  };
}

export function restoreCountdown(saved: unknown, state: LiveState) {
  if (!isObject(saved)) return;
  if (isObject(saved.activeEvent) && typeof saved.activeEvent.id === "string") state.activeEvent = saved.activeEvent as EventTemplate;
  if (typeof saved.forcedState === "string" && FORCED_STATES.includes(saved.forcedState)) state.forcedState = saved.forcedState;
  if (typeof saved.startTime === "string" && !Number.isNaN(Date.parse(saved.startTime))) state.startTime = saved.startTime;
  if (typeof saved.isLive === "boolean") state.isLive = saved.isLive;
  if (isObject(saved.music)) {
    const m = saved.music;
    if (typeof m.playing === "boolean") state.music.playing = m.playing;
    if (typeof m.volume === "number") state.music.volume = Math.min(1, Math.max(0, m.volume));
    if (typeof m.loop === "boolean") state.music.loop = m.loop;
  }
}

export function isForcedState(value: unknown): value is string {
  return typeof value === "string" && FORCED_STATES.includes(value);
}
