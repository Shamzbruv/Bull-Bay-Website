import type { DataAdapter } from './repository';
import { LocalStorageAdapter } from './localAdapter';
import { SupabaseAdapter } from './supabaseAdapter';
import { isSupabaseConfigured } from './supabaseClient';

let adapter: DataAdapter | null = null;

/**
 * Returns the active persistence adapter. Uses Supabase automatically once
 * VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are set; otherwise falls back to
 * localStorage so the app is fully playable offline (spec §46).
 */
export function getDataAdapter(): DataAdapter {
  if (!adapter) {
    adapter = isSupabaseConfigured ? new SupabaseAdapter() : new LocalStorageAdapter();
  }
  return adapter;
}

export type { DataAdapter, QuizRepository, GameHistoryRepository } from './repository';
