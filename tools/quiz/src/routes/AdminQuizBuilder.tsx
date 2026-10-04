import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, PlusCircle, Save, Upload, CheckCircle2, AlertTriangle } from 'lucide-react';
import { AppShell } from '../components/layout/AppShell';
import { RequireHostAuth } from '../components/admin/RequireHostAuth';
import { QuestionEditor } from '../components/admin/QuestionEditor';
import { useQuizStore } from '../state/quizStore';
import { summarizeDifficulty, validateQuiz, type Quiz, type QuizQuestion, type QuestionType } from '../types/quiz';

function blankQuiz(): Quiz {
  const now = new Date().toISOString();
  return {
    id: `quiz-${Date.now().toString(36)}`,
    title: '',
    description: '',
    scripture: '',
    status: 'draft',
    timesPlayed: 0,
    createdAt: now,
    updatedAt: now,
    questions: [],
  };
}

function blankQuestion(quizId: string, questionNumber: number, type: QuestionType): QuizQuestion {
  return {
    id: `q-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    quizId,
    questionNumber,
    round: 'Round 1',
    type,
    question: '',
    options: type === 'multiple_choice' ? [{ id: 'A', text: '' }, { id: 'B', text: '' }, { id: 'C', text: '' }, { id: 'D', text: '' }] : undefined,
    correctAnswer: type === 'true_false' ? 'True' : '',
    explanation: '',
    scriptureReference: '',
    difficulty: 'medium',
    points: 2,
    timeLimit: 20,
  };
}

function AdminQuizBuilderInner() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { load, getQuiz, saveQuiz, loaded } = useQuizStore();
  const isNew = !quizId;

  const [quiz, setQuiz] = useState<Quiz | null>(isNew ? blankQuiz() : null);
  const [newType, setNewType] = useState<QuestionType>('multiple_choice');
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [showReview, setShowReview] = useState(false);
  const [saved, setSaved] = useState(false);
  const dragIndex = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!isNew && loaded && quizId) {
      const existing = getQuiz(quizId);
      if (existing) setQuiz(existing);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNew, loaded, quizId]);

  if (!quiz) {
    return <div className="game-safe-area tv-safe-area text-bb-navy">Loading…</div>;
  }

  function patch(p: Partial<Quiz>) {
    setQuiz((q) => (q ? { ...q, ...p } : q));
    setSaved(false);
  }

  function updateQuestion(id: string, next: QuizQuestion) {
    patch({ questions: quiz!.questions.map((q) => (q.id === id ? next : q)) });
  }

  function addQuestion() {
    const q = blankQuestion(quiz!.id, quiz!.questions.length + 1, newType);
    patch({ questions: [...quiz!.questions, q] });
  }

  function deleteQuestion(id: string) {
    patch({ questions: quiz!.questions.filter((q) => q.id !== id).map((q, i) => ({ ...q, questionNumber: i + 1 })) });
  }

  function duplicateQuestion(id: string) {
    const source = quiz!.questions.find((q) => q.id === id);
    if (!source) return;
    const copy = { ...source, id: `${source.id}-${Date.now().toString(36)}` };
    const idx = quiz!.questions.findIndex((q) => q.id === id);
    const next = [...quiz!.questions];
    next.splice(idx + 1, 0, copy);
    patch({ questions: next.map((q, i) => ({ ...q, questionNumber: i + 1 })) });
  }

  function reorder(from: number, to: number) {
    if (from === to) return;
    const next = [...quiz!.questions];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    patch({ questions: next.map((q, i) => ({ ...q, questionNumber: i + 1 })) });
  }

  async function handleSave(nextStatus?: Quiz['status']) {
    const toSave = nextStatus ? { ...quiz!, status: nextStatus } : quiz!;
    await saveQuiz(toSave);
    setQuiz(toSave);
    setSaved(true);
    setShowReview(false);
    if (isNew) navigate(`/admin/quizzes/${toSave.id}/edit`, { replace: true });
  }

  function runImport(text: string) {
    try {
      const parsed = JSON.parse(text) as Partial<Quiz>;
      const candidate: Quiz = {
        ...blankQuiz(),
        ...parsed,
        id: quiz!.id,
        questions: (parsed.questions ?? []).map((q, i) => ({ ...q, quizId: quiz!.id, questionNumber: q.questionNumber ?? i + 1 }) as QuizQuestion),
      };
      const issues = validateQuiz(candidate);
      if (issues.length > 0) {
        setImportErrors(issues.map((i) => i.message));
        return;
      }
      setQuiz(candidate);
      setImportErrors([]);
      setShowImport(false);
      setSaved(false);
    } catch {
      setImportErrors(['That JSON could not be parsed. Check for a missing comma or bracket.']);
    }
  }

  const validationIssues = validateQuiz(quiz);
  const breakdown = summarizeDifficulty(quiz.questions);

  return (
    <AppShell theme="light">
      <div className="game-safe-area tv-safe-area max-w-3xl mx-auto text-bb-navy pb-32">
        <button onClick={() => navigate('/admin/quizzes')} className="inline-flex items-center gap-2 text-bb-navy/60 hover:text-bb-navy mb-4">
          <ArrowLeft size={16} /> Manage Quizzes
        </button>

        <h1 className="font-display text-3xl font-black">{isNew ? 'Create Quiz' : 'Edit Quiz'}</h1>

        <div className="mt-6 space-y-4 rounded-2xl border border-bb-navy/10 bg-white/80 p-5">
          <LightField label="Quiz Name">
            <input value={quiz.title} onChange={(e) => patch({ title: e.target.value })} className="light-input" placeholder="1 Kings Chapter 1" />
          </LightField>
          <div className="grid sm:grid-cols-2 gap-4">
            <LightField label="Bible Passage">
              <input value={quiz.scripture ?? ''} onChange={(e) => patch({ scripture: e.target.value })} className="light-input" placeholder="1 Kings 1" />
            </LightField>
            <LightField label="Status">
              <select value={quiz.status} onChange={(e) => patch({ status: e.target.value as Quiz['status'] })} className="light-input">
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </LightField>
          </div>
          <LightField label="Description">
            <textarea value={quiz.description ?? ''} onChange={(e) => patch({ description: e.target.value })} className="light-input min-h-[70px]" />
          </LightField>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 mt-8 mb-3">
          <h2 className="font-display text-xl font-bold">Questions ({quiz.questions.length})</h2>
          <div className="flex items-center gap-2">
            <select value={newType} onChange={(e) => setNewType(e.target.value as QuestionType)} className="light-input py-1.5 text-sm w-auto">
              <option value="multiple_choice">Multiple Choice</option>
              <option value="short_answer">Short Answer</option>
              <option value="true_false">True or False</option>
              <option value="who_am_i">Who Am I?</option>
              <option value="fill_blank">Fill in the Blank</option>
              <option value="scripture_reference">Scripture Reference</option>
              <option value="tie_breaker">Tie Breaker</option>
            </select>
            <button onClick={addQuestion} className="flex items-center gap-1.5 rounded-full bg-bb-blue px-4 py-2 text-sm font-semibold text-white">
              <PlusCircle size={16} /> Add Question
            </button>
            <button onClick={() => setShowImport((v) => !v)} className="flex items-center gap-1.5 rounded-full border border-bb-navy/20 px-4 py-2 text-sm font-semibold">
              <Upload size={16} /> Import
            </button>
          </div>
        </div>

        {showImport && (
          <div className="rounded-2xl border border-bb-navy/10 bg-white/80 p-4 mb-4 space-y-3">
            <p className="text-sm text-bb-navy/60">Paste quiz JSON, or upload a file. Importing replaces the questions below.</p>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              className="light-input min-h-[120px] font-mono text-xs"
              placeholder='{"title": "Exodus Chapter 1", "questions": []}'
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              className="text-sm"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const text = await file.text();
                setImportText(text);
              }}
            />
            {importErrors.length > 0 && (
              <ul className="text-sm text-bb-red space-y-1">
                {importErrors.map((err, i) => (
                  <li key={i} className="flex items-start gap-1.5"><AlertTriangle size={14} className="mt-0.5 shrink-0" /> {err}</li>
                ))}
              </ul>
            )}
            <button onClick={() => runImport(importText)} className="rounded-full bg-bb-blue px-5 py-2 text-sm font-semibold text-white">
              Validate & Import
            </button>
          </div>
        )}

        <div className="space-y-3">
          {quiz.questions.map((q, i) => (
            <div
              key={q.id}
              draggable
              onDragStart={() => (dragIndex.current = i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragIndex.current !== null) reorder(dragIndex.current, i);
                dragIndex.current = null;
              }}
            >
              <QuestionEditor value={q} onChange={(next) => updateQuestion(q.id, next)} onDelete={() => deleteQuestion(q.id)} onDuplicate={() => duplicateQuestion(q.id)} />
            </div>
          ))}
          {quiz.questions.length === 0 && <p className="text-bb-navy/50 text-sm">No questions yet — add one above or import a quiz.</p>}
        </div>

        <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur border-t border-bb-navy/10 p-4 z-40">
          <div className="game-safe-area flex items-center justify-between flex-wrap gap-3">
            <div className="text-sm text-bb-navy/60">
              {saved ? <span className="text-bb-green flex items-center gap-1"><CheckCircle2 size={16} /> Saved</span> : `${validationIssues.length} issue${validationIssues.length === 1 ? '' : 's'} found`}
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleSave()} className="flex items-center gap-1.5 rounded-full border border-bb-navy/20 px-5 py-2 text-sm font-semibold">
                <Save size={16} /> Save Draft
              </button>
              <button onClick={() => setShowReview(true)} className="rounded-full bg-bb-gold px-5 py-2 text-sm font-bold text-bb-deep">
                Review & Publish
              </button>
            </div>
          </div>
        </div>

        {showReview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-w-lg w-full rounded-2xl bg-white p-6 space-y-4">
              <h3 className="font-display text-2xl font-bold">Review Quiz</h3>
              <div className="grid grid-cols-3 gap-2 text-center">
                <ReviewStat label="Questions" value={quiz.questions.length} />
                <ReviewStat label="Easy" value={breakdown.easy} />
                <ReviewStat label="Medium" value={breakdown.medium} />
                <ReviewStat label="Hard" value={breakdown.hard} />
                <ReviewStat label="Expert" value={breakdown.expert} />
                <ReviewStat label="Tie-Breakers" value={breakdown.tieBreakers} />
              </div>
              {validationIssues.length > 0 ? (
                <div>
                  <p className="font-semibold text-bb-red mb-1">Fix these before publishing:</p>
                  <ul className="text-sm text-bb-red space-y-1 max-h-40 overflow-auto">
                    {validationIssues.map((issue, i) => (
                      <li key={i}>{issue.message}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-bb-green flex items-center gap-1.5"><CheckCircle2 size={16} /> Everything looks good.</p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setShowReview(false)} className="rounded-full border border-bb-navy/20 px-5 py-2 text-sm font-semibold">
                  Cancel
                </button>
                <button
                  disabled={validationIssues.length > 0}
                  onClick={() => handleSave('published')}
                  className="rounded-full bg-bb-gold px-5 py-2 text-sm font-bold text-bb-deep disabled:opacity-40"
                >
                  Publish Quiz
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function LightField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-wide text-bb-navy/50 mb-1">{label}</span>
      {children}
    </label>
  );
}

function ReviewStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-bb-navy/5 py-2">
      <div className="font-display text-lg font-black">{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-bb-navy/50">{label}</div>
    </div>
  );
}

export function AdminQuizBuilder() {
  return (
    <RequireHostAuth>
      <AdminQuizBuilderInner />
    </RequireHostAuth>
  );
}
