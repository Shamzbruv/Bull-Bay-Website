import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { brand } from '../../config/brand';
import type { Team } from '../../types/game';

const TEAM_COUNT_OPTIONS = [2, 3, 4, 5, 6];

interface TeamSetupStepProps {
  teams: Team[];
  onChange: (teams: Team[]) => void;
}

function makeTeam(order: number): Team {
  const palette = brand.teamColorPalette;
  return {
    id: `team-${order}-${Math.random().toString(36).slice(2, 8)}`,
    name: `Team ${order + 1}`,
    color: palette[order % palette.length].value,
    order,
  };
}

export function TeamSetupStep({ teams, onChange }: TeamSetupStepProps) {
  const count = teams.length;

  function setCount(next: number) {
    if (next === count) return;
    if (next > count) {
      const added = Array.from({ length: next - count }, (_, i) => makeTeam(count + i));
      onChange([...teams, ...added]);
    } else {
      onChange(teams.slice(0, next));
    }
  }

  function updateTeam(id: string, patch: Partial<Team>) {
    onChange(teams.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  return (
    <div className="space-y-10">
      <div>
        <h2 className="font-display text-3xl font-bold text-center">Who's Playing Tonight?</h2>
        <p className="text-center text-white/60 mt-2">Choose how many teams are competing.</p>
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        {TEAM_COUNT_OPTIONS.map((n) => {
          const active = n === count;
          return (
            <motion.button
              key={n}
              onClick={() => setCount(n)}
              whileTap={{ scale: 0.94 }}
              className={`h-16 w-16 rounded-2xl border font-display text-2xl font-bold transition ${
                active
                  ? 'border-bb-gold bg-bb-gold/15 text-bb-gold-light shadow-glow-gold'
                  : 'border-white/15 bg-white/5 text-white/70 hover:border-bb-cyan/40'
              }`}
            >
              {n}
            </motion.button>
          );
        })}
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        {teams.map((team, i) => (
          <motion.div
            key={team.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-2xl border border-white/15 bg-white/5 p-5 space-y-4"
            style={{ boxShadow: `0 0 0 1px ${team.color}22` }}
          >
            <div className="flex items-center gap-3">
              <span className="h-9 w-9 rounded-full flex items-center justify-center font-bold text-sm" style={{ backgroundColor: team.color }}>
                {i + 1}
              </span>
              <input
                value={team.name}
                onChange={(e) => updateTeam(team.id, { name: e.target.value })}
                maxLength={28}
                className="flex-1 bg-transparent border-b border-white/20 focus:border-bb-cyan outline-none px-1 py-1 font-display text-lg font-semibold"
                placeholder={`Team ${i + 1}`}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {brand.teamColorPalette.map((c) => (
                <button
                  key={c.id}
                  aria-label={c.label}
                  onClick={() => updateTeam(team.id, { color: c.value })}
                  className="h-7 w-7 rounded-full flex items-center justify-center ring-offset-2 ring-offset-bb-deep transition"
                  style={{ backgroundColor: c.value, boxShadow: team.color === c.value ? `0 0 0 2px white` : undefined }}
                >
                  {team.color === c.value && <Check size={14} className="text-white drop-shadow" />}
                </button>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
