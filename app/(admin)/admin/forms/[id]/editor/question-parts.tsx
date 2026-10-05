"use client";

import { CONDITION_OPS, NEXT, SUBMIT, isQuestion, type ChoiceOption, type Condition, type FormItem, type Question, type QuestionOf, type QuizKey } from "@/lib/forms/schema";
import { NumberField, TextField, Toggle } from "./controls";

export type MakeId = (prefix: string) => string;
type SectionRef = { id: string; title: string };

/** "Go to" targets for branching. */
export function GoToSelect({ value, onChange, sections, label = "Go to" }: { value: string | undefined; onChange: (value: string | undefined) => void; sections: SectionRef[]; label?: string }) {
  return (
    <select className="fb-goto" aria-label={label} value={value ?? NEXT} onChange={(e) => onChange(e.target.value === NEXT ? undefined : e.target.value)}>
      <option value={NEXT}>Continue to the next section</option>
      {sections.map((s, i) => (
        <option key={s.id} value={s.id}>
          Go to section {i + 2}: {s.title || "Untitled section"}
        </option>
      ))}
      <option value={SUBMIT}>Submit the form</option>
    </select>
  );
}

type ChoiceQuestion = QuestionOf<"multiple_choice" | "checkboxes" | "dropdown" | "ranking">;

export function OptionsEditor({ question, onChange, makeId, sections, quizOn }: { question: ChoiceQuestion; onChange: (q: Question) => void; makeId: MakeId; sections: SectionRef[]; quizOn: boolean }) {
  const set = (patch: Partial<ChoiceQuestion>) => onChange({ ...question, ...patch } as Question);
  const setOptions = (options: ChoiceOption[]) => set({ options } as Partial<ChoiceQuestion>);
  const branching = (question.type === "multiple_choice" || question.type === "dropdown") && Boolean(question.branching);
  const limits = question.type !== "ranking" && question.options.some((o) => o.limit !== undefined);
  const correct = new Set(question.quiz?.correct ?? []);
  const marker = question.type === "checkboxes" ? "☐" : question.type === "multiple_choice" ? "◯" : question.type === "ranking" ? "≡" : "▾";
  const markCorrect = (id: string) => {
    const key = question.quiz ?? { points: 1, correct: [] };
    const next = question.type === "checkboxes" ? (correct.has(id) ? [...correct].filter((c) => c !== id) : [...correct, id]) : [id];
    set({ quiz: { ...key, correct: next } } as Partial<ChoiceQuestion>);
  };
  const addMany = (index: number, text: string) => {
    const labels = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (!labels.length) return;
    const first = { ...question.options[index]!, label: labels[0]! };
    const rest = labels.slice(1).map((label) => ({ id: makeId("o"), label }));
    setOptions([...question.options.slice(0, index), first, ...rest, ...question.options.slice(index + 1)]);
  };
  return (
    <div className="fb-options">
      {question.options.map((option, index) => (
        <div key={option.id} className="fb-option">
          <span className="fb-option-mark" aria-hidden="true">
            {question.type === "dropdown" || question.type === "ranking" ? `${index + 1}.` : marker}
          </span>
          <input
            value={option.label}
            aria-label={`Choice ${index + 1}`}
            maxLength={300}
            placeholder={`Option ${index + 1}`}
            onChange={(e) => setOptions(question.options.map((o, i) => (i === index ? { ...o, label: e.target.value } : o)))}
            onPaste={(e) => {
              const text = e.clipboardData.getData("text");
              if (/\r?\n/.test(text.trim())) {
                e.preventDefault();
                addMany(index, text);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const list = e.currentTarget.closest(".fb-options");
                const next = [...question.options];
                next.splice(index + 1, 0, { id: makeId("o"), label: "" });
                setOptions(next);
                window.requestAnimationFrame(() => list?.querySelectorAll<HTMLInputElement>(".fb-option > input:not(.fb-limit)")[index + 1]?.focus());
              }
            }}
          />
          {limits && (
            <input
              className="fb-limit"
              type="number"
              min={1}
              aria-label={`Spots for ${option.label || `choice ${index + 1}`}`}
              placeholder="No limit"
              value={option.limit ?? ""}
              onChange={(e) => setOptions(question.options.map((o, i) => (i === index ? { ...o, limit: e.target.value ? Math.max(1, Math.round(Number(e.target.value))) : undefined } : o)))}
            />
          )}
          {branching && <GoToSelect value={option.goTo} sections={sections} onChange={(goTo) => setOptions(question.options.map((o, i) => (i === index ? { ...o, goTo } : o)))} />}
          {quizOn && question.type !== "ranking" && (
            <button type="button" className={`fb-correct${correct.has(option.id) ? " is-on" : ""}`} aria-pressed={correct.has(option.id)} onClick={() => markCorrect(option.id)} title="Correct answer">
              ✓
            </button>
          )}
          <span className="fb-option-tools">
            <button type="button" aria-label="Move up" disabled={index === 0} onClick={() => { const n = [...question.options]; [n[index - 1], n[index]] = [n[index]!, n[index - 1]!]; setOptions(n); }}>
              ↑
            </button>
            <button
              type="button"
              aria-label="Remove choice"
              disabled={question.options.length <= (question.type === "ranking" ? 2 : 1)}
              onClick={() => {
                const options = question.options.filter((_, i) => i !== index);
                set({ options, ...(question.quiz ? { quiz: { ...question.quiz, correct: question.quiz.correct.filter((c) => c !== option.id) } } : {}) } as Partial<ChoiceQuestion>);
              }}
            >
              ×
            </button>
          </span>
        </div>
      ))}
      <div className="fb-option-add">
        <button type="button" className="fb-link" onClick={() => setOptions([...question.options, { id: makeId("o"), label: "" }])}>
          + Add a choice
        </button>
        {(question.type === "multiple_choice" || question.type === "checkboxes") && !question.other && (
          <button type="button" className="fb-link" onClick={() => set({ other: true } as Partial<ChoiceQuestion>)}>
            + Add &ldquo;Other&rdquo;
          </button>
        )}
        <span className="fb-hint">Tip: paste a list to add several at once.</span>
      </div>
      {(question.type === "multiple_choice" || question.type === "checkboxes") && question.other && (
        <div className="fb-option is-other">
          <span className="fb-option-mark">{marker}</span>
          <span className="fb-other">Other: (people type their own answer)</span>
          <button type="button" aria-label="Remove Other" onClick={() => set({ other: false } as Partial<ChoiceQuestion>)}>
            ×
          </button>
        </div>
      )}
      <div className="fb-toggles">
        {question.type !== "ranking" && <Toggle label="Shuffle the order of choices" checked={Boolean(question.shuffle)} onChange={(shuffle) => set({ shuffle } as Partial<ChoiceQuestion>)} />}
        {(question.type === "multiple_choice" || question.type === "dropdown") && (
          <Toggle label="Go to a section based on the answer" checked={branching} disabled={!sections.length} hint={sections.length ? undefined : "Add a section first."} onChange={(on) => set({ branching: on } as Partial<ChoiceQuestion>)} />
        )}
        {question.type !== "ranking" && (
          <Toggle
            label="Limit how many people can pick each choice"
            hint="Each choice shows the spots left, and closes when it's full."
            checked={limits}
            onChange={(on) => setOptions(question.options.map((o) => ({ ...o, limit: on ? o.limit ?? 10 : undefined })))}
          />
        )}
        {question.type === "checkboxes" && (
          <div className="fb-row">
            <Toggle label="Limit how many can be ticked" checked={Boolean(question.selection)} onChange={(on) => set({ selection: on ? { rule: "at_most", count: 2 } : undefined } as Partial<ChoiceQuestion>)} />
            {question.selection && (
              <>
                <select aria-label="Rule" value={question.selection.rule} onChange={(e) => set({ selection: { ...question.selection!, rule: e.target.value as "at_least" | "at_most" | "exactly" } } as Partial<ChoiceQuestion>)}>
                  <option value="at_least">At least</option>
                  <option value="at_most">At most</option>
                  <option value="exactly">Exactly</option>
                </select>
                <input type="number" min={1} aria-label="How many" className="fb-limit" value={question.selection.count} onChange={(e) => set({ selection: { ...question.selection!, count: Math.max(1, Math.round(Number(e.target.value) || 1)) } } as Partial<ChoiceQuestion>)} />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

type GridQuestion = QuestionOf<"grid_choice" | "grid_checkbox">;
const PRESETS: Record<string, string[]> = {
  "Agree–disagree": ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"],
  "Never–always": ["Never", "Rarely", "Sometimes", "Often", "Always"],
  "Poor–excellent": ["Poor", "Fair", "Good", "Very good", "Excellent"],
};

function Lines({ label, lines, onChange, makeId, prefix }: { label: string; lines: { id: string; label: string }[]; onChange: (lines: { id: string; label: string }[]) => void; makeId: MakeId; prefix: string }) {
  return (
    <div className="fb-lines">
      <p className="fb-sub">{label}</p>
      {lines.map((line, index) => (
        <div key={line.id} className="fb-option">
          <span className="fb-option-mark">{index + 1}.</span>
          <input
            value={line.label}
            maxLength={300}
            aria-label={`${label} ${index + 1}`}
            onChange={(e) => onChange(lines.map((l, i) => (i === index ? { ...l, label: e.target.value } : l)))}
            onPaste={(e) => {
              const text = e.clipboardData.getData("text");
              if (/\r?\n/.test(text.trim())) {
                e.preventDefault();
                const labels = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
                onChange([...lines.slice(0, index), { ...line, label: labels[0]! }, ...labels.slice(1).map((l) => ({ id: makeId(prefix), label: l })), ...lines.slice(index + 1)]);
              }
            }}
          />
          <button type="button" aria-label="Remove" disabled={lines.length <= 1} onClick={() => onChange(lines.filter((_, i) => i !== index))}>
            ×
          </button>
        </div>
      ))}
      <button type="button" className="fb-link" onClick={() => onChange([...lines, { id: makeId(prefix), label: "" }])}>
        + Add
      </button>
    </div>
  );
}

export function GridEditor({ question, onChange, makeId }: { question: GridQuestion; onChange: (q: Question) => void; makeId: MakeId }) {
  const set = (patch: Partial<GridQuestion>) => onChange({ ...question, ...patch } as Question);
  return (
    <div className="fb-grid-editor">
      <div className="fb-two">
        <Lines label="Rows" lines={question.rows} onChange={(rows) => set({ rows })} makeId={makeId} prefix="r" />
        <Lines label="Columns" lines={question.columns} onChange={(columns) => set({ columns })} makeId={makeId} prefix="c" />
      </div>
      <p className="fb-hint">
        Quick columns:{" "}
        {Object.entries(PRESETS).map(([name, labels]) => (
          <button key={name} type="button" className="fb-link" onClick={() => set({ columns: labels.map((label) => ({ id: makeId("c"), label })), ...(question.type === "grid_choice" ? { style: "likert" as const } : {}) })}>
            {name}
          </button>
        ))}
      </p>
      <div className="fb-toggles">
        <Toggle label="Require an answer in each row" checked={Boolean(question.requireEachRow)} onChange={(requireEachRow) => set({ requireEachRow })} />
        <Toggle label="Limit to one answer per column" checked={Boolean(question.oneColumnEach)} onChange={(oneColumnEach) => set({ oneColumnEach })} />
        <Toggle label="Shuffle the order of rows" checked={Boolean(question.shuffleRows)} onChange={(shuffleRows) => set({ shuffleRows })} />
        {question.type === "grid_choice" && <Toggle label="Show as a Likert scale" hint="Statements with an agree–disagree style row of choices." checked={question.style === "likert"} onChange={(on) => set({ style: on ? "likert" : "grid" })} />}
      </div>
    </div>
  );
}

const OP_LABELS: Record<(typeof CONDITION_OPS)[number], string> = {
  equals: "is",
  not_equals: "is not",
  contains: "contains",
  answered: "is answered",
  not_answered: "is not answered",
  greater_than: "is more than",
  less_than: "is less than",
};

/** "Show this only when…": conditions on earlier questions, all of which must hold. */
export function ConditionsEditor({ conditions, onChange, earlier }: { conditions: Condition[]; onChange: (c: Condition[] | undefined) => void; earlier: Question[] }) {
  if (!earlier.length) return <p className="fb-hint">Questions before this one can be used to show or hide it.</p>;
  const update = (index: number, patch: Partial<Condition>) => onChange(conditions.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  return (
    <div className="fb-conditions">
      {conditions.map((condition, index) => {
        const source = earlier.find((q) => q.id === condition.questionId);
        const needsValue = !["answered", "not_answered"].includes(condition.op);
        const choices = source && "options" in source ? source.options : null;
        return (
          <div key={index} className="fb-condition">
            <span>{index === 0 ? "Show only when" : "and"}</span>
            <select aria-label="Question" value={condition.questionId} onChange={(e) => update(index, { questionId: e.target.value, value: undefined })}>
              {earlier.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.title.slice(0, 60) || "Untitled question"}
                </option>
              ))}
            </select>
            <select aria-label="Condition" value={condition.op} onChange={(e) => update(index, { op: e.target.value as Condition["op"] })}>
              {CONDITION_OPS.filter((op) => (choices ? !["greater_than", "less_than", "contains"].includes(op) : true)).map((op) => (
                <option key={op} value={op}>
                  {OP_LABELS[op]}
                </option>
              ))}
            </select>
            {needsValue &&
              (choices ? (
                <select aria-label="Answer" value={condition.value ?? ""} onChange={(e) => update(index, { value: e.target.value })}>
                  <option value="">Choose</option>
                  {choices.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input aria-label="Answer" value={condition.value ?? ""} maxLength={300} placeholder="Answer" onChange={(e) => update(index, { value: e.target.value })} />
              ))}
            <button type="button" aria-label="Remove condition" onClick={() => onChange(conditions.length > 1 ? conditions.filter((_, i) => i !== index) : undefined)}>
              ×
            </button>
          </div>
        );
      })}
      <button type="button" className="fb-link" onClick={() => onChange([...conditions, { questionId: earlier[earlier.length - 1]!.id, op: "answered" }])}>
        + {conditions.length ? "Add another condition" : "Show this only when…"}
      </button>
    </div>
  );
}

/** Points, the right answer and feedback, when the form is a quiz. */
export function AnswerKeyEditor({ question, onChange }: { question: Question; onChange: (q: Question) => void }) {
  const key: QuizKey = question.quiz ?? { points: 0, correct: [] };
  const setKey = (patch: Partial<QuizKey>) => onChange({ ...question, quiz: { ...key, ...patch } });
  const auto = ["multiple_choice", "checkboxes", "dropdown", "short_text", "number", "linear_scale", "rating", "nps", "grid_choice", "ranking"].includes(question.type);
  return (
    <div className="fb-answer-key">
      <div className="fb-row">
        <NumberField label="Points" value={key.points} min={0} max={1000} width={80} onChange={(points) => setKey({ points: Math.max(0, points ?? 0) })} />
        {!auto && <span className="fb-hint">Marked by hand under Responses.</span>}
        {"options" in question && question.type !== "ranking" && <span className="fb-hint">Tick the correct {question.type === "checkboxes" ? "choices" : "choice"} with ✓ above.</span>}
      </div>
      {(question.type === "short_text" || question.type === "number" || question.type === "linear_scale" || question.type === "rating" || question.type === "nps") && (
        <TextField
          label="Accepted answers (one per line)"
          multiline
          value={key.correct.join("\n")}
          hint={question.type === "short_text" ? "Capitals and extra spaces don't matter." : undefined}
          onChange={(text) => setKey({ correct: text.split(/\r?\n/).map((t) => t.trim()).filter(Boolean).slice(0, 50) })}
        />
      )}
      {question.type === "grid_choice" && (
        <div className="fb-grid-key">
          {question.rows.map((row) => {
            const current = key.correct.find((pair) => pair.startsWith(`${row.id}:`))?.split(":")[1] ?? "";
            return (
              <label key={row.id} className="fb-field fb-inline">
                <span>{row.label || "Row"}</span>
                <select value={current} onChange={(e) => setKey({ correct: [...key.correct.filter((p) => !p.startsWith(`${row.id}:`)), ...(e.target.value ? [`${row.id}:${e.target.value}`] : [])] })}>
                  <option value="">No correct answer</option>
                  {question.columns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
            );
          })}
        </div>
      )}
      {question.type === "ranking" && (
        <Toggle
          label="The order above is the correct order"
          checked={key.correct.length === question.options.length && key.correct.every((id, i) => question.options[i]?.id === id)}
          onChange={(on) => setKey({ correct: on ? question.options.map((o) => o.id) : [] })}
        />
      )}
      {auto && (
        <div className="fb-two">
          <TextField label="Feedback for a right answer" value={key.feedbackCorrect} maxLength={1000} onChange={(feedbackCorrect) => setKey({ feedbackCorrect: feedbackCorrect || undefined })} />
          <TextField label="Feedback for a wrong answer" value={key.feedbackIncorrect} maxLength={1000} onChange={(feedbackIncorrect) => setKey({ feedbackIncorrect: feedbackIncorrect || undefined })} />
        </div>
      )}
    </div>
  );
}

export function earlierQuestions(items: FormItem[], index: number): Question[] {
  return items.slice(0, index).filter(isQuestion);
}
