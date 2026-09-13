/**
 * Turns a pasted video URL into something actually embeddable — shared by
 * sermon video attachment (pastor/actions.ts) and the public Live page
 * (campuses.livestream_url), so both accept whatever someone pastes
 * straight from an address bar instead of requiring a specific format.
 */

export type EmbeddableVideo =
  | { kind: "youtube"; embedUrl: string; watchUrl: string }
  | { kind: "youtube-channel"; embedUrl: string; watchUrl: string }
  | { kind: "facebook"; embedUrl: string; watchUrl: string }
  | null;

/** Accepts a pasted YouTube URL in any common shape (watch, youtu.be,
 * embed, shorts, live) or a bare 11-character video ID, and returns just
 * the ID — so pasting the address bar URL "just works" instead of
 * requiring whoever's adding it to know how to extract the ID by hand. */
export function parseYouTubeId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    if (url.hostname.includes("youtu.be")) return url.pathname.slice(1).split("/")[0] || null;
    if (url.hostname.includes("youtube.com")) {
      if (url.searchParams.get("v")) return url.searchParams.get("v");
      const match = url.pathname.match(/\/(embed|shorts|live)\/([\w-]{11})/);
      if (match) return match[2] ?? null;
    }
  } catch {
    // Not a URL — fall through to null below.
  }
  return null;
}

/** A YouTube channel's persistent "whatever's live right now" URL —
 * .../channel/UC.../live or bare .../channel/UC... — embeds via
 * live_stream?channel=, which YouTube automatically points at whatever
 * video that channel is currently streaming. Pasting this once means the
 * church never has to update the link again week to week, unlike a
 * one-off watch link that goes stale the moment the stream ends. Custom
 * URLs (@handle, /c/name, /user/name) can't be resolved to the raw
 * channel ID without the YouTube Data API, so those fall through to a
 * plain "open link" experience instead. */
function parseYouTubeChannelId(input: string): string | null {
  try {
    const url = new URL(input.trim());
    if (!url.hostname.includes("youtube.com")) return null;
    const match = url.pathname.match(/\/channel\/([\w-]+)/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

export function resolveEmbeddableVideo(rawUrl: string | null | undefined): EmbeddableVideo {
  if (!rawUrl) return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  const videoId = parseYouTubeId(trimmed);
  if (videoId) {
    return { kind: "youtube", embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}`, watchUrl: trimmed };
  }

  const channelId = parseYouTubeChannelId(trimmed);
  if (channelId) {
    // Only documented to work on the plain youtube.com embed domain, not
    // the -nocookie one.
    return { kind: "youtube-channel", embedUrl: `https://www.youtube.com/embed/live_stream?channel=${channelId}`, watchUrl: trimmed };
  }

  try {
    const url = new URL(trimmed);
    if (url.hostname.includes("facebook.com")) {
      return {
        kind: "facebook",
        embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(trimmed)}&show_text=0`,
        watchUrl: trimmed,
      };
    }
  } catch {
    // Not a valid absolute URL at all — let the caller fall back to a
    // plain outbound link.
  }

  return null;
}
