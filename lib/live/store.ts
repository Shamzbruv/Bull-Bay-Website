import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { EventTemplate, Song } from "./state";

// Live Countdown keeps its templates, song library, settings and uploaded
// media in the "Bull Bay NTCOG Games" Supabase project it has always used
// (tables prefixed countdown_, bucket countdown-media), not in the church
// database. Those tables have row level security on with no policies, so
// only this server, holding that project's service-role key, can touch
// them. The key never leaves the server.
//
// Without COUNTDOWN_SUPABASE_URL / COUNTDOWN_SUPABASE_SERVICE_KEY the
// countdown still runs, from built-in templates, but nothing is saved and
// the media library is empty.

const BUCKET = "countdown-media";

export type LibraryFolder = "backgrounds" | "audio";

export type LibraryItem = {
  name: string;
  path: string;
  url: string;
  size: number;
  mimeType: string | null;
  createdAt: string | null;
};

export type CountdownStore = {
  /** `undefined` when the key has never been saved. Throws on a failed read. */
  getSetting(key: string): Promise<unknown>;
  setSetting(key: string, value: unknown): Promise<void>;
  /** Throws on a failed read, so an outage is never mistaken for "no templates". */
  loadTemplates(): Promise<EventTemplate[]>;
  saveTemplate(template: EventTemplate): Promise<void>;
  deleteTemplate(id: string): Promise<void>;
  loadSongs(): Promise<Song[]>;
  saveSong(song: Song): Promise<void>;
  deleteSong(id: string): Promise<void>;
  listLibrary(folder: LibraryFolder): Promise<LibraryItem[]>;
  uploadToLibrary(folder: LibraryFolder, filename: string, bytes: Uint8Array, mimeType: string): Promise<{ name: string; path: string; url: string }>;
  deleteFromLibrary(path: string): Promise<void>;
};

let cached: { url: string; store: CountdownStore } | null = null;

export function countdownStore(): CountdownStore | null {
  const url = process.env.COUNTDOWN_SUPABASE_URL?.replace(/\/+$/, "");
  const key = process.env.COUNTDOWN_SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  if (cached?.url === url) return cached.store;
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  cached = { url, store: supabaseStore(db, url) };
  return cached.store;
}

function fail(what: string, error: { message: string }): never {
  throw new Error(`${what}: ${error.message}`);
}

function supabaseStore(db: SupabaseClient, url: string): CountdownStore {
  const publicUrlFor = (path: string) => `${url}/storage/v1/object/public/${BUCKET}/${path}`;
  const now = () => new Date().toISOString();
  return {
    async getSetting(key) {
      const { data, error } = await db.from("countdown_settings").select("value").eq("key", key).maybeSingle();
      if (error) fail(`read setting ${key}`, error);
      return data ? data.value : undefined;
    },
    async setSetting(key, value) {
      const { error } = await db.from("countdown_settings").upsert({ key, value, updated_at: now() });
      if (error) fail(`save setting ${key}`, error);
    },
    async loadTemplates() {
      const { data, error } = await db.from("countdown_templates").select("id, data");
      if (error) fail("read templates", error);
      return (data ?? []).map((row) => row.data as EventTemplate);
    },
    async saveTemplate(template) {
      const { error } = await db.from("countdown_templates").upsert({ id: template.id, data: template, updated_at: now() });
      if (error) fail("save template", error);
    },
    async deleteTemplate(id) {
      const { error } = await db.from("countdown_templates").delete().eq("id", id);
      if (error) fail("delete template", error);
    },
    async loadSongs() {
      const { data, error } = await db.from("countdown_songs").select("id, title, artist, raw_input").order("title", { ascending: true });
      if (error) fail("read songs", error);
      return (data ?? []).map((row) => ({ id: row.id, title: row.title, artist: row.artist || "", rawInput: row.raw_input }));
    },
    async saveSong(song) {
      const { error } = await db.from("countdown_songs").upsert({
        id: song.id,
        title: song.title,
        artist: song.artist || null,
        raw_input: song.rawInput,
        updated_at: now(),
      });
      if (error) fail("save song", error);
    },
    async deleteSong(id) {
      const { error } = await db.from("countdown_songs").delete().eq("id", id);
      if (error) fail("delete song", error);
    },
    async listLibrary(folder) {
      const { data, error } = await db.storage.from(BUCKET).list(folder, { sortBy: { column: "created_at", order: "desc" } });
      if (error) fail(`list ${folder}`, error);
      return (data ?? [])
        .filter((f) => f.name && f.id) // real files, not the folder placeholder
        .map((f) => ({
          name: f.name,
          path: `${folder}/${f.name}`,
          url: publicUrlFor(`${folder}/${f.name}`),
          size: Number(f.metadata?.size) || 0,
          mimeType: (f.metadata?.mimetype as string | undefined) ?? null,
          createdAt: f.created_at ?? null,
        }));
    },
    async uploadToLibrary(folder, filename, bytes, mimeType) {
      const safeName = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const path = `${folder}/${safeName}`;
      const { error } = await db.storage.from(BUCKET).upload(path, bytes, { contentType: mimeType, upsert: false });
      if (error) fail("upload", error);
      return { name: safeName, path, url: publicUrlFor(path) };
    },
    async deleteFromLibrary(path) {
      const { error } = await db.storage.from(BUCKET).remove([path]);
      if (error) fail(`delete ${path}`, error);
    },
  };
}
