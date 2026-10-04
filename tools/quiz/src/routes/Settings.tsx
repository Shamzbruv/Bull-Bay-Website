import { type ReactNode } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { AppShell } from '../components/layout/AppShell';
import { useSettingsStore } from '../state/settingsStore';
import { soundManager } from '../lib/sound/soundManager';

const TEAM_LABELS = ['Team 1', 'Team 2', 'Team 3', 'Team 4', 'Team 5', 'Team 6'];

export function Settings() {
  const { soundEnabled, musicEnabled, volume, buzzerKeys, setSoundEnabled, setMusicEnabled, setVolume, setBuzzerKey, resetBuzzerKeys } = useSettingsStore();

  return (
    <AppShell>
      <div className="game-safe-area tv-safe-area pb-24 max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="font-display text-4xl font-black">Settings</h1>
          <p className="text-white/60 mt-1">Sound and buzzers. Who can open the quiz is decided by church admin sign-in.</p>
        </div>

        <Section title="Sound">
          <Toggle label="Sound Effects" checked={soundEnabled} onChange={setSoundEnabled} />
          <Toggle label="Music / Sting Cues" checked={musicEnabled} onChange={setMusicEnabled} />
          <div className="flex items-center gap-3 mt-3">
            {volume === 0 ? <VolumeX size={18} className="text-white/50" /> : <Volume2 size={18} className="text-white/50" />}
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="flex-1 accent-bb-cyan"
            />
            <button
              onClick={() => soundManager.play('correct')}
              className="text-xs rounded-full border border-white/15 px-3 py-1.5 text-white/70 hover:border-bb-cyan/40"
            >
              Test
            </button>
          </div>
        </Section>

        <Section title="Buzzer Keys" description="Which keyboard key each team uses to buzz in on a shared computer.">
          <div className="grid sm:grid-cols-2 gap-3">
            {Object.entries(buzzerKeys).map(([slot, key]) => (
              <label key={slot} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-2.5">
                <span className="text-sm">{TEAM_LABELS[Number(slot)] ?? `Team ${Number(slot) + 1}`}</span>
                <input
                  value={key.toUpperCase()}
                  maxLength={1}
                  onChange={(e) => e.target.value && setBuzzerKey(Number(slot), e.target.value)}
                  className="w-12 text-center rounded-lg border border-white/15 bg-bb-deep py-1 font-display font-bold uppercase"
                />
              </label>
            ))}
          </div>
          <button onClick={resetBuzzerKeys} className="text-xs text-white/50 hover:text-white mt-2">
            Reset to defaults (Q / P / Z / M / 1 / 0)
          </button>
        </Section>

      </div>
    </AppShell>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <h2 className="font-display text-lg font-bold">{title}</h2>
      {description && <p className="text-sm text-white/50 mt-0.5 mb-3">{description}</p>}
      <div className={description ? '' : 'mt-3'}>{children}</div>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between py-1.5 cursor-pointer">
      <span className="text-sm">{label}</span>
      <button
        onClick={() => onChange(!checked)}
        className={`h-6 w-11 rounded-full transition relative ${checked ? 'bg-bb-green' : 'bg-white/15'}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${checked ? 'left-5' : 'left-0.5'}`} />
      </button>
    </label>
  );
}
