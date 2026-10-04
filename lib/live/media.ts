import type { LibraryFolder } from "./store";

/** The control panel's "kind" → the folder in the countdown-media bucket. */
export const LIBRARY_FOLDERS: Record<string, LibraryFolder | undefined> = {
  background: "backgrounds",
  music: "audio",
};

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export function isAllowedUpload(kind: string, mimeType: string) {
  return kind === "music" ? mimeType.startsWith("audio/") : mimeType.startsWith("video/") || mimeType.startsWith("image/");
}
