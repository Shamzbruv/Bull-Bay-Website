import type { ReactNode } from 'react';
import { Swords, Users, Zap, ShieldAlert, Trophy } from 'lucide-react';
import type { GameMode, GameSettings, QuestionSelectionMode } from '../../types/game';
import { CHAMPIONSHIP_ORDER } from '../../lib/game/mixedMode';
import { GAME_MODE_LABEL } from '../../lib/game/gameModeLabels';

interface SettingsStepProps {
  settings: GameSettings;
  onChange: (settings: GameSettings) => void;
}

const QUESTION_TIMES = [5, 10, 15, 20, 30, 45, 60];
const ANSWER_TIMES: (number | 'unlimited')[] = [5, 10, 15, 'unlimited'];
const SELECTIONS: { value: QuestionSelectionMode; label: string }[] = [
  { value: 'all', label: 'All Questions' },
  { value: 'random_10', label: 'Random 10' },
  { value: 'random_20', label: 'Random 20' },
  { value: 'random_30', label: 'Random 30' },
];

const MODES: { value: GameMode; label: string; description: string; icon: ReactNode; special?: boolean }[] = [
  { value: 'classic', label: 'Classic', description: 'Teams take turns answering.', icon: <Users size={18} /> },
  { value: 'buzzer', label: 'Buzzer', description: 'Any team can buzz in first.', icon: <Zap size={18} /> },
  { value: 'rapid_fire', label: 'Rapid Fire', description: 'Each team gets a fixed block of questions.', icon: <Swords size={18} /> },
  { value: 'elimination', label: 'Elimination', description: 'Incorrect answers may deduct points.', icon: <ShieldAlert size={18} /> },
  {
    value: 'mixed',
    label: 'Championship',
    description: `An equal quarter of the quiz in each mode above — ${CHAMPIONSHIP_ORDER.map((m) => GAME_MODE_LABEL[m]).join(' → ')}.`,
    icon: <Trophy size={18} />,
    special: true,
  },
];

export function SettingsStep({ settings, onChange }: SettingsStepProps) {
  function patch(p: Partial<GameSettings>) {
    onChange({ ...settings, ...p });
  }

  return (
    <div className="space-y-10">
      <div>
        <h2 className="font-display text-3xl font-bold text-center">Configure the Game</h2>
        <p className="text-center text-white/60 mt-2">Set the pace and rules for tonight.</p>
      </div>

      <Section title="Question Time">
        <div className="flex flex-wrap gap-2 justify-center">
          {QUESTION_TIMES.map((t) => (
            <Pill key={t} active={settings.questionTimeSeconds === t} onClick={() => patch({ questionTimeSeconds: t })}>
              {t}s
            </Pill>
          ))}
        </div>
      </Section>

      <Section title="Answer Time" subtitle="How long teams have to buzz in after the question disappears">
        <div className="flex flex-wrap gap-2 justify-center">
          {ANSWER_TIMES.map((t) => (
            <Pill key={t} active={settings.answerTimeSeconds === t} onClick={() => patch({ answerTimeSeconds: t })}>
              {t === 'unlimited' ? 'Unlimited' : `${t}s`}
            </Pill>
          ))}
        </div>
      </Section>

      <Section title="Points">
        <div className="flex flex-wrap gap-2 justify-center">
          <Pill active={settings.pointsMode === 'quiz_defined'} onClick={() => patch({ pointsMode: 'quiz_defined' })}>
            Use quiz-defined points
          </Pill>
          <Pill active={settings.pointsMode === 'standard'} onClick={() => patch({ pointsMode: 'standard' })}>
            Standard (1 / 2 / 3 / 5)
          </Pill>
        </div>
      </Section>

      <Section title="Question Selection">
        <div className="flex flex-wrap gap-2 justify-center">
          {SELECTIONS.map((s) => (
            <Pill key={s.value} active={settings.questionSelection === s.value} onClick={() => patch({ questionSelection: s.value })}>
              {s.label}
            </Pill>
          ))}
        </div>
      </Section>

      <Section title="Game Mode">
        <div className="grid sm:grid-cols-2 gap-3">
          {MODES.map((mode) => {
            const active = settings.gameMode === mode.value;
            return (
              <button
                key={mode.value}
                onClick={() => patch({ gameMode: mode.value, penaltiesEnabled: mode.value === 'elimination' })}
                className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition ${mode.special ? 'sm:col-span-2' : ''} ${
                  active
                    ? 'border-bb-gold bg-bb-gold/10 shadow-glow-gold'
                    : mode.special
                      ? 'border-bb-gold/30 bg-gradient-to-r from-bb-gold/5 to-transparent hover:border-bb-gold/60'
                      : 'border-white/15 bg-white/5 hover:border-bb-cyan/40'
                }`}
              >
                <span className={active || mode.special ? 'text-bb-gold-light mt-0.5' : 'text-white/60 mt-0.5'}>{mode.icon}</span>
                <span>
                  <span className="flex items-center gap-2 font-semibold">
                    {mode.label}
                    {mode.special && (
                      <span className="rounded-full bg-bb-gold/20 px-2 py-0.5 text-[10px] uppercase tracking-widest text-bb-gold-light">Special</span>
                    )}
                  </span>
                  <span className="block text-sm text-white/60">{mode.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      </Section>

      {(settings.gameMode === 'rapid_fire' || settings.gameMode === 'mixed') && (
        <Section
          title="Questions Per Team"
          subtitle={
            settings.gameMode === 'mixed'
              ? "Applies within Championship's Rapid Fire quarter — leave on Auto to split it evenly"
              : 'Leave on Auto to split the quiz evenly across your teams'
          }
        >
          <div className="flex flex-wrap gap-2 justify-center">
            <Pill active={!settings.questionsPerTeam} onClick={() => patch({ questionsPerTeam: undefined })}>
              Auto (even split)
            </Pill>
            {[5, 10, 15, 20].map((n) => (
              <Pill key={n} active={settings.questionsPerTeam === n} onClick={() => patch({ questionsPerTeam: n })}>
                {n} each
              </Pill>
            ))}
          </div>
        </Section>
      )}

      {(settings.gameMode === 'buzzer' || settings.gameMode === 'elimination' || settings.gameMode === 'mixed') && (
        <Section title="Steal Rule" subtitle={settings.gameMode === 'mixed' ? "Applies during Championship's Buzzer and Elimination quarters" : undefined}>
          <div className="flex flex-wrap gap-2 justify-center items-center">
            <Pill active={settings.stealEnabled} onClick={() => patch({ stealEnabled: true })}>
              Allow steals
            </Pill>
            <Pill active={!settings.stealEnabled} onClick={() => patch({ stealEnabled: false })}>
              No steals
            </Pill>
            {settings.stealEnabled && (
              <span className="text-sm text-white/60 ml-2">
                Steal window:{' '}
                {[5, 10].map((t) => (
                  <button
                    key={t}
                    onClick={() => patch({ stealTimeSeconds: t })}
                    className={`ml-1 rounded-full px-3 py-1 ${settings.stealTimeSeconds === t ? 'bg-bb-cyan/20 text-bb-cyan' : 'hover:text-white'}`}
                  >
                    {t}s
                  </button>
                ))}
              </span>
            )}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="font-display text-lg font-semibold text-center">{title}</h3>
      {subtitle && <p className="text-center text-xs text-white/50 mt-0.5 mb-3">{subtitle}</p>}
      <div className={subtitle ? '' : 'mt-3'}>{children}</div>
    </div>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
        active ? 'border-bb-gold bg-bb-gold/15 text-bb-gold-light' : 'border-white/15 text-white/70 hover:border-bb-cyan/40'
      }`}
    >
      {children}
    </button>
  );
}
