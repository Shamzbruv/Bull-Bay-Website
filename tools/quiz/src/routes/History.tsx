import { useEffect, useState } from 'react';
import { Trophy, ChevronDown } from 'lucide-react';
import { AppShell } from '../components/layout/AppShell';
import { getDataAdapter } from '../lib/storage';
import type { GameHistoryEntry } from '../types/game';

export function History() {
  const [entries, setEntries] = useState<GameHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    getDataAdapter()
      .listHistory()
      .then(setEntries)
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell>
      <div className="game-safe-area tv-safe-area pb-24 max-w-3xl mx-auto">
        <h1 className="font-display text-4xl font-black">Game History</h1>
        <p className="text-white/60 mt-1">Every completed Quiz Night.</p>

        <div className="mt-8 space-y-3">
          {loading && <p className="text-white/50">Loading…</p>}
          {!loading && entries.length === 0 && <p className="text-white/50">No games have been completed yet.</p>}
          {entries.map((entry) => {
            const open = expanded === entry.id;
            const durationMins = Math.max(1, Math.round((new Date(entry.completedAt).getTime() - new Date(entry.startedAt).getTime()) / 60000));
            return (
              <div key={entry.id} className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
                <button onClick={() => setExpanded(open ? null : entry.id)} className="w-full flex items-center gap-4 px-5 py-4 text-left">
                  <Trophy size={20} className="text-bb-gold-light shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-bold truncate">{entry.quizTitle}</div>
                    <div className="text-xs text-white/50">{new Date(entry.completedAt).toLocaleString()} · {entry.questionCount} questions · {durationMins} min</div>
                  </div>
                  {entry.winnerName && <span className="text-sm font-semibold text-bb-gold-light hidden sm:inline">{entry.winnerName}</span>}
                  <ChevronDown size={16} className={`text-white/40 transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>
                {open && (
                  <div className="px-5 pb-4 space-y-2 border-t border-white/10 pt-3">
                    {[...entry.teams].sort((a, b) => b.score - a.score).map((t) => (
                      <div key={t.id} className="flex items-center justify-between text-sm">
                        <span>{t.name}{entry.winnerName === t.name && ' 🏆'}</span>
                        <span className="font-display font-bold">{t.score}</span>
                      </div>
                    ))}
                    <p className="text-xs text-white/40 pt-1 capitalize">{entry.gameMode.replace('_', ' ')} mode</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
