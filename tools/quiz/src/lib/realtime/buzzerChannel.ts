import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../storage/supabaseClient';
import type { GamePhase, Team } from '../../types/game';

/**
 * Phone buzzers over Supabase Realtime Broadcast (no table needed — pure
 * ephemeral pub/sub scoped to one game). This is the only piece of the app
 * that needs a real network relay: phones are separate devices from the
 * host laptop, so the same-browser BroadcastChannel trick used for the
 * host↔display sync can't reach them. Inactive until VITE_SUPABASE_URL /
 * VITE_SUPABASE_ANON_KEY are configured — see isSupabaseConfigured.
 */

export interface BuzzerRoster {
  teams: Pick<Team, 'id' | 'name' | 'color' | 'order'>[];
  phase: GamePhase;
  round?: string;
  questionNumber?: number;
  buzzedTeamId?: string;
}

export interface BuzzerBuzz {
  teamId: string;
  clientId: string;
  timestamp: number;
}

export const buzzerRelayAvailable = isSupabaseConfigured;

export function buzzerJoinPath(gameId: string): string {
  return `${import.meta.env.BASE_URL}game/${gameId}/buzzer`;
}

interface BuzzerChannelHandlers {
  onRoster?: (roster: BuzzerRoster) => void;
  onBuzz?: (buzz: BuzzerBuzz) => void;
}

/**
 * Supabase Realtime broadcast listeners are registered once up front (there's
 * no per-listener unsubscribe in the SDK) — pass every handler you need to
 * `connect()`, and tear the whole channel down with `close()` when done.
 */
export class BuzzerChannel {
  private channel: RealtimeChannel | null = null;
  private gameId: string;

  constructor(gameId: string) {
    this.gameId = gameId;
  }

  connect(handlers: BuzzerChannelHandlers = {}) {
    if (!supabase || this.channel) return;
    const channel = supabase.channel(`buzzer-${this.gameId}`, { config: { broadcast: { self: false } } });
    if (handlers.onRoster) {
      channel.on('broadcast', { event: 'roster' }, ({ payload }) => handlers.onRoster!(payload as BuzzerRoster));
    }
    if (handlers.onBuzz) {
      channel.on('broadcast', { event: 'buzz' }, ({ payload }) => handlers.onBuzz!(payload as BuzzerBuzz));
    }
    channel.subscribe();
    this.channel = channel;
  }

  sendRoster(roster: BuzzerRoster) {
    void this.channel?.send({ type: 'broadcast', event: 'roster', payload: roster });
  }

  sendBuzz(buzz: BuzzerBuzz) {
    void this.channel?.send({ type: 'broadcast', event: 'buzz', payload: buzz });
  }

  close() {
    if (this.channel) {
      void supabase?.removeChannel(this.channel);
      this.channel = null;
    }
  }
}

export function getOrCreatePhoneClientId(): string {
  const key = 'bbntcog-phone-client-id';
  try {
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(key, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}
