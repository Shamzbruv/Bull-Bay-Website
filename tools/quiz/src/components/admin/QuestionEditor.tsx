import { useState, type HTMLAttributes, type ReactNode } from 'react';
import { ChevronDown, Copy, GripVertical, Trash2 } from 'lucide-react';
import type { Difficulty, QuestionType, QuizQuestion } from '../../types/quiz';

const TYPE_OPTIONS: { value: QuestionType; label: string }[] = [
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'short_answer', label: 'Short Answer' },
  { value: 'true_false', label: 'True or False' },
  { value: 'who_am_i', label: 'Who Am I?' },
  { value: 'fill_blank', label: 'Fill in the Blank' },
  { value: 'scripture_reference', label: 'Scripture Reference' },
  { value: 'tie_breaker', label: 'Tie Breaker' },
];

const DIFFICULTY_OPTIONS: Difficulty[] = ['easy', 'medium', 'hard', 'expert'];

interface QuestionEditorProps {
  value: QuizQuestion;
  onChange: (q: QuizQuestion) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  dragHandleProps?: HTMLAttributes<HTMLButtonElement>;
}

export function QuestionEditor({ value, onChange, onDelete, onDuplicate, dragHandleProps }: QuestionEditorProps) {
  const [open, setOpen] = useState(false);

  function patch(p: Partial<QuizQuestion>) {
    onChange({ ...value, ...p });
  }

  function patchOption(id: 'A' | 'B' | 'C' | 'D', text: string) {
    const options = value.options ?? [];
    const exists = options.some((o) => o.id === id);
    const next = exists ? options.map((o) => (o.id === id ? { ...o, text } : o)) : [...options, { id, text }];
    patch({ options: next.sort((a, b) => a.id.localeCompare(b.id)) });
  }

  return (
    <div className="rounded-2xl border border-bb-navy/10 bg-bb-navy text-white overflow-hidden shadow-md">
      <div className="flex items-center gap-3 px-4 py-3">
        <button {...dragHandleProps} className="text-white/30 hover:text-white/60 cursor-grab" aria-label="Reorder">
          <GripVertical size={16} />
        </button>
        <button onClick={() => setOpen((v) => !v)} className="flex-1 flex items-center gap-3 text-left min-w-0">
          <span className="text-xs text-white/40 shrink-0">#{value.questionNumber}</span>
          <span className="truncate text-sm font-medium">{value.question || 'Untitled question'}</span>
        </button>
        <span className="text-xs uppercase tracking-wide text-white/40 hidden sm:inline">{value.type.replace('_', ' ')}</span>
        <button onClick={onDuplicate} className="text-white/40 hover:text-white" aria-label="Duplicate"><Copy size={15} /></button>
        <button onClick={onDelete} className="text-white/40 hover:text-bb-red" aria-label="Delete"><Trash2 size={15} /></button>
        <button onClick={() => setOpen((v) => !v)} className={`text-white/40 transition-transform ${open ? 'rotate-180' : ''}`}>
          <ChevronDown size={16} />
        </button>
      </div>

      {open && (
        <div className="px-4 pb-5 space-y-4 border-t border-white/10 pt-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Round">
              <input value={value.round ?? ''} onChange={(e) => patch({ round: e.target.value })} className="input" placeholder="Round 1 — Multiple Choice" />
            </Field>
            <Field label="Type">
              <select value={value.type} onChange={(e) => patch({ type: e.target.value as QuestionType })} className="input">
                {TYPE_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Question">
            <textarea value={value.question} onChange={(e) => patch({ question: e.target.value })} className="input min-h-[70px]" />
          </Field>

          {value.type === 'multiple_choice' ? (
            <div className="grid sm:grid-cols-2 gap-3">
              {(['A', 'B', 'C', 'D'] as const).map((id) => (
                <Field key={id} label={`Choice ${id}`}>
                  <input value={value.options?.find((o) => o.id === id)?.text ?? ''} onChange={(e) => patchOption(id, e.target.value)} className="input" />
                </Field>
              ))}
              <Field label="Correct Choice">
                <select value={value.correctAnswer} onChange={(e) => patch({ correctAnswer: e.target.value })} className="input">
                  {(['A', 'B', 'C', 'D'] as const).map((id) => (
                    <option key={id} value={id}>{id}</option>
                  ))}
                </select>
              </Field>
            </div>
          ) : value.type === 'true_false' ? (
            <Field label="Correct Answer">
              <select value={value.correctAnswer} onChange={(e) => patch({ correctAnswer: e.target.value })} className="input">
                <option value="True">True</option>
                <option value="False">False</option>
              </select>
            </Field>
          ) : (
            <Field label="Answer">
              <input value={value.correctAnswer} onChange={(e) => patch({ correctAnswer: e.target.value })} className="input" />
            </Field>
          )}

          <Field label="Explanation (the WHY, shown on reveal)">
            <textarea value={value.explanation} onChange={(e) => patch({ explanation: e.target.value })} className="input min-h-[60px]" />
          </Field>

          <div className="grid sm:grid-cols-4 gap-3">
            <Field label="Scripture Reference">
              <input value={value.scriptureReference ?? ''} onChange={(e) => patch({ scriptureReference: e.target.value })} className="input" placeholder="1 Kings 1:5" />
            </Field>
            <Field label="Difficulty">
              <select value={value.difficulty} onChange={(e) => patch({ difficulty: e.target.value as Difficulty })} className="input">
                {DIFFICULTY_OPTIONS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </Field>
            <Field label="Points">
              <input type="number" min={0} value={value.points} onChange={(e) => patch({ points: Number(e.target.value) })} className="input" />
            </Field>
            <Field label="Timer (s)">
              <input type="number" min={0} value={value.timeLimit ?? ''} onChange={(e) => patch({ timeLimit: e.target.value ? Number(e.target.value) : undefined })} className="input" />
            </Field>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-wide text-white/50 mb-1">{label}</span>
      {children}
    </label>
  );
}
