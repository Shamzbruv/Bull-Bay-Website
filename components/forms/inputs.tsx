"use client";

import { useMemo, useRef, useState } from "react";
import { seededShuffle } from "@/lib/forms/logic";
import type { ChoiceOption, FileAnswer, Question, QuestionOf } from "@/lib/forms/schema";
import { FILE_TYPES, fileAllowed } from "@/lib/forms/validate";
import { choiceIds, filesOf, gridCells, objectOf, otherText, signatureOf } from "@/lib/forms/values";
import { SignaturePad } from "./signature-pad";

// One input per question type, as the respondent sees them. Each takes the
// raw value and reports changes; lib/forms/validate.ts decides what's valid.

export type InputProps<T extends Question = Question> = {
  question: T;
  value: unknown;
  onChange: (value: unknown) => void;
  /** id of the element naming the question, for aria-labelledby. */
  labelledBy: string;
  describedBy?: string;
  seed: string;
  /** Spots left on each spot-limited choice. */
  remaining?: Record<string, number>;
  disabled?: boolean;
  upload?: (question: Question, file: File) => Promise<FileAnswer>;
};

function ordered(question: { id: string; options: ChoiceOption[]; shuffle?: boolean }, seed: string) {
  return question.shuffle ? seededShuffle(question.options, `${seed}:${question.id}`) : question.options;
}

function SpotNote({ option, remaining }: { option: ChoiceOption; remaining?: Record<string, number> }) {
  if (!option.limit) return null;
  const left = remaining?.[option.id] ?? option.limit;
  return <span className={`fr-spots${left <= 0 ? " is-full" : ""}`}>{left <= 0 ? "Full" : `${left} ${left === 1 ? "spot" : "spots"} left`}</span>;
}

const isFull = (option: ChoiceOption, remaining?: Record<string, number>) => Boolean(option.limit && (remaining?.[option.id] ?? option.limit) <= 0);

export function TextInput({ question, value, onChange, labelledBy, describedBy, disabled }: InputProps<QuestionOf<"short_text" | "email" | "phone" | "number">>) {
  const kind = question.type === "email" ? "email" : question.type === "phone" ? "tel" : question.type === "number" ? "number" : "text";
  return (
    <input
      className="fr-text"
      type={kind}
      inputMode={question.type === "number" ? (question.integer ? "numeric" : "decimal") : undefined}
      autoComplete={question.type === "email" ? "email" : question.type === "phone" ? "tel" : question.type === "short_text" && question.prefill === "full_name" ? "name" : undefined}
      step={question.type === "number" ? (question.integer ? 1 : "any") : undefined}
      min={question.type === "number" ? question.min : undefined}
      max={question.type === "number" ? question.max : undefined}
      maxLength={question.type === "number" ? undefined : 10000}
      value={typeof value === "string" || typeof value === "number" ? String(value) : ""}
      onChange={(e) => onChange(e.target.value)}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      disabled={disabled}
      placeholder="Your answer"
    />
  );
}

export function LongTextInput({ value, onChange, labelledBy, describedBy, disabled }: InputProps<QuestionOf<"long_text">>) {
  return (
    <textarea
      className="fr-text fr-long"
      rows={4}
      maxLength={10000}
      value={typeof value === "string" ? value : ""}
      onChange={(e) => onChange(e.target.value)}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      disabled={disabled}
      placeholder="Your answer"
    />
  );
}

export function ChoiceInput({ question, value, onChange, labelledBy, describedBy, seed, remaining, disabled }: InputProps<QuestionOf<"multiple_choice">>) {
  const options = useMemo(() => ordered(question, seed), [question, seed]);
  const other = objectOf(value) && "other" in objectOf(value)! ? String(objectOf(value)!.other ?? "") : null;
  return (
    <div role="radiogroup" aria-labelledby={labelledBy} aria-describedby={describedBy} className="fr-choices">
      {options.map((option) => (
        <label key={option.id} className={`fr-choice${isFull(option, remaining) && value !== option.id ? " is-disabled" : ""}`}>
          <input type="radio" name={question.id} checked={value === option.id} disabled={disabled || (isFull(option, remaining) && value !== option.id)} onChange={() => onChange(option.id)} />
          <span>{option.label}</span>
          <SpotNote option={option} remaining={remaining} />
        </label>
      ))}
      {question.other && (
        <label className="fr-choice fr-other">
          <input type="radio" name={question.id} checked={other !== null} disabled={disabled} onChange={() => onChange({ other: other ?? "" })} />
          <span>Other:</span>
          <input
            className="fr-text fr-other-text"
            value={other ?? ""}
            maxLength={1000}
            aria-label="Other answer"
            disabled={disabled}
            onFocus={() => other === null && onChange({ other: "" })}
            onChange={(e) => onChange({ other: e.target.value })}
          />
        </label>
      )}
      {!question.required && value !== undefined && value !== null && value !== "" && (
        <button type="button" className="fr-clear" onClick={() => onChange(undefined)} disabled={disabled}>
          Clear selection
        </button>
      )}
    </div>
  );
}

export function CheckboxesInput({ question, value, onChange, labelledBy, describedBy, seed, remaining, disabled }: InputProps<QuestionOf<"checkboxes">>) {
  const options = useMemo(() => ordered(question, seed), [question, seed]);
  const ids = choiceIds(value as never);
  const otherValue = objectOf(value)?.other;
  const otherOn = typeof otherValue === "string";
  const set = (nextIds: string[], nextOther: string | undefined) => onChange(nextIds.length || nextOther !== undefined ? { ids: nextIds, ...(nextOther !== undefined ? { other: nextOther } : {}) } : undefined);
  const s = question.selection;
  return (
    <div role="group" aria-labelledby={labelledBy} aria-describedby={describedBy} className="fr-choices">
      {s && <p className="fr-hint">{s.rule === "at_least" ? `Select at least ${s.count}` : s.rule === "at_most" ? `Select at most ${s.count}` : `Select exactly ${s.count}`}</p>}
      {options.map((option) => {
        const checked = ids.includes(option.id);
        const blocked = isFull(option, remaining) && !checked;
        return (
          <label key={option.id} className={`fr-choice is-check${blocked ? " is-disabled" : ""}`}>
            <input type="checkbox" checked={checked} disabled={disabled || blocked} onChange={(e) => set(e.target.checked ? [...ids, option.id] : ids.filter((id) => id !== option.id), otherOn ? String(otherValue) : undefined)} />
            <span>{option.label}</span>
            <SpotNote option={option} remaining={remaining} />
          </label>
        );
      })}
      {question.other && (
        <label className="fr-choice is-check fr-other">
          <input type="checkbox" checked={otherOn} disabled={disabled} onChange={(e) => set(ids, e.target.checked ? "" : undefined)} />
          <span>Other:</span>
          <input className="fr-text fr-other-text" value={otherOn ? String(otherValue) : ""} maxLength={1000} aria-label="Other answer" disabled={disabled} onChange={(e) => set(ids, e.target.value)} />
        </label>
      )}
    </div>
  );
}

export function DropdownInput({ question, value, onChange, labelledBy, describedBy, seed, remaining, disabled }: InputProps<QuestionOf<"dropdown">>) {
  const options = useMemo(() => ordered(question, seed), [question, seed]);
  return (
    <select className="fr-select" value={typeof value === "string" ? value : ""} onChange={(e) => onChange(e.target.value || undefined)} aria-labelledby={labelledBy} aria-describedby={describedBy} disabled={disabled}>
      <option value="">Choose</option>
      {options.map((option) => (
        <option key={option.id} value={option.id} disabled={isFull(option, remaining) && value !== option.id}>
          {option.label}
          {option.limit ? ` (${Math.max(0, remaining?.[option.id] ?? option.limit)} left)` : ""}
        </option>
      ))}
    </select>
  );
}

function NumberRow({ name, low, high, value, onChange, labelledBy, describedBy, minLabel, maxLabel, disabled, render }: {
  name: string;
  low: number;
  high: number;
  value: unknown;
  onChange: (v: number) => void;
  labelledBy: string;
  describedBy?: string;
  minLabel?: string;
  maxLabel?: string;
  disabled?: boolean;
  render?: (n: number, selected: boolean) => React.ReactNode;
}) {
  const current = typeof value === "number" ? value : Number.isFinite(Number(value)) && value !== "" && value !== undefined ? Number(value) : null;
  return (
    <div className="fr-scale" role="radiogroup" aria-labelledby={labelledBy} aria-describedby={describedBy}>
      {minLabel && <span className="fr-scale-end">{minLabel}</span>}
      <div className="fr-scale-points">
        {Array.from({ length: high - low + 1 }, (_, i) => low + i).map((n) => (
          <label key={n} className={`fr-point${current === n ? " is-on" : ""}${render ? " is-icon" : ""}`}>
            <input type="radio" name={name} checked={current === n} disabled={disabled} onChange={() => onChange(n)} />
            <span aria-hidden={render ? "true" : undefined}>{render ? render(n, current !== null && n <= current) : n}</span>
            {render && <span className="sr-only">{n}</span>}
          </label>
        ))}
      </div>
      {maxLabel && <span className="fr-scale-end">{maxLabel}</span>}
    </div>
  );
}

export function ScaleInput({ question, value, onChange, labelledBy, describedBy, disabled }: InputProps<QuestionOf<"linear_scale">>) {
  return <NumberRow name={question.id} low={question.min} high={question.max} value={value} onChange={onChange} labelledBy={labelledBy} describedBy={describedBy} minLabel={question.minLabel} maxLabel={question.maxLabel} disabled={disabled} />;
}

const ICONS = { star: "★", heart: "♥", thumb: "👍" } as const;

export function RatingInput({ question, value, onChange, labelledBy, describedBy, disabled }: InputProps<QuestionOf<"rating">>) {
  if (question.icon === "number") return <NumberRow name={question.id} low={1} high={question.levels} value={value} onChange={onChange} labelledBy={labelledBy} describedBy={describedBy} disabled={disabled} />;
  const icon = ICONS[question.icon];
  return (
    <NumberRow
      name={question.id}
      low={1}
      high={question.levels}
      value={value}
      onChange={onChange}
      labelledBy={labelledBy}
      describedBy={describedBy}
      disabled={disabled}
      render={(_, lit) => <span className={`fr-icon is-${question.icon}${lit ? " is-lit" : ""}`}>{icon}</span>}
    />
  );
}

export function NpsInput({ question, value, onChange, labelledBy, describedBy, disabled }: InputProps<QuestionOf<"nps">>) {
  return (
    <div className="fr-nps">
      <NumberRow name={question.id} low={0} high={10} value={value} onChange={onChange} labelledBy={labelledBy} describedBy={describedBy} disabled={disabled} />
      <div className="fr-nps-ends">
        <span>{question.minLabel || "Not at all likely"}</span>
        <span>{question.maxLabel || "Extremely likely"}</span>
      </div>
    </div>
  );
}

export function GridInput({ question, value, onChange, labelledBy, describedBy, seed, disabled }: InputProps<QuestionOf<"grid_choice" | "grid_checkbox">>) {
  const rows = useMemo(() => (question.shuffleRows ? seededShuffle(question.rows, `${seed}:${question.id}`) : question.rows), [question, seed]);
  const cells = gridCells(value as never);
  const multi = question.type === "grid_checkbox";
  const set = (rowId: string, cell: string | string[] | undefined) => {
    const next = { ...cells };
    if (cell === undefined || (Array.isArray(cell) && !cell.length)) delete next[rowId];
    else next[rowId] = cell;
    onChange(Object.keys(next).length ? next : undefined);
  };
  const likert = question.type === "grid_choice" && question.style === "likert";
  return (
    <div className={`fr-grid${likert ? " is-likert" : ""}`} role="group" aria-labelledby={labelledBy} aria-describedby={describedBy} style={{ ["--fr-cols" as string]: question.columns.length }}>
      <div className="fr-grid-head" aria-hidden="true">
        <span />
        {question.columns.map((c) => (
          <span key={c.id}>{c.label}</span>
        ))}
      </div>
      {rows.map((row) => {
        const cell = cells[row.id];
        return (
          <div key={row.id} className="fr-grid-row" role={multi ? "group" : "radiogroup"} aria-label={row.label}>
            <span className="fr-grid-label">{row.label}</span>
            {question.columns.map((column) => {
              const on = Array.isArray(cell) ? cell.includes(column.id) : cell === column.id;
              const takenElsewhere = question.oneColumnEach && !on && Object.entries(cells).some(([r, c]) => r !== row.id && (Array.isArray(c) ? c.includes(column.id) : c === column.id));
              return (
                <label key={column.id} className={`fr-grid-cell${on ? " is-on" : ""}`}>
                  <input
                    type={multi ? "checkbox" : "radio"}
                    name={`${question.id}-${row.id}`}
                    checked={on}
                    disabled={disabled || takenElsewhere}
                    onChange={(e) => {
                      if (!multi) return set(row.id, column.id);
                      const list = Array.isArray(cell) ? cell : [];
                      set(row.id, e.target.checked ? [...list, column.id] : list.filter((c) => c !== column.id));
                    }}
                  />
                  <span className="fr-grid-cell-label">{column.label}</span>
                </label>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

export function RankingInput({ question, value, onChange, labelledBy, describedBy, seed, disabled }: InputProps<QuestionOf<"ranking">>) {
  const start = useMemo(() => seededShuffle(question.options, `${seed}:${question.id}`).map((o) => o.id), [question, seed]);
  const order = Array.isArray(value) && value.length === question.options.length ? (value as string[]) : start;
  const touched = Array.isArray(value) && value.length === question.options.length;
  const [dragging, setDragging] = useState<number | null>(null);
  const move = (from: number, to: number) => {
    if (to < 0 || to >= order.length || from === to) return;
    const next = [...order];
    const [id] = next.splice(from, 1);
    next.splice(to, 0, id!);
    onChange(next);
  };
  const label = (id: string) => question.options.find((o) => o.id === id)?.label ?? id;
  return (
    <div aria-labelledby={labelledBy} aria-describedby={describedBy} role="group">
      <p className="fr-hint">Put these in order, the first being your top choice. Use the arrows, or drag on a computer.</p>
      <ol className="fr-rank">
        {order.map((id, index) => (
          <li
            key={id}
            className={`fr-rank-item${dragging === index ? " is-dragging" : ""}`}
            draggable={!disabled}
            onDragStart={() => setDragging(index)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragging !== null) move(dragging, index);
              setDragging(null);
            }}
            onDragEnd={() => setDragging(null)}
          >
            <span className="fr-rank-n">{index + 1}</span>
            <span className="fr-rank-label">{label(id)}</span>
            <span className="fr-rank-moves">
              <button type="button" aria-label={`Move ${label(id)} up`} disabled={disabled || index === 0} onClick={() => move(index, index - 1)}>
                ↑
              </button>
              <button type="button" aria-label={`Move ${label(id)} down`} disabled={disabled || index === order.length - 1} onClick={() => move(index, index + 1)}>
                ↓
              </button>
            </span>
          </li>
        ))}
      </ol>
      {!touched && (
        <button type="button" className="fr-clear" onClick={() => onChange(order)} disabled={disabled}>
          Keep this order
        </button>
      )}
    </div>
  );
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function DateInput({ question, value, onChange, labelledBy, describedBy, disabled }: InputProps<QuestionOf<"date">>) {
  const text = typeof value === "string" ? value : "";
  const [datePart = "", timePart = ""] = text.split("T");
  const combine = (date: string, time: string) => onChange(date ? (question.includeTime && time ? `${date}T${time}` : question.includeTime ? `${date}T` : date) : undefined);
  const [month = "", day = ""] = question.includeYear ? [] : datePart.split("-");
  return (
    <div className="fr-date" role="group" aria-labelledby={labelledBy} aria-describedby={describedBy}>
      {question.includeYear ? (
        <input className="fr-text" type="date" value={datePart} disabled={disabled} aria-label="Date" onChange={(e) => combine(e.target.value, timePart)} />
      ) : (
        <>
          <select className="fr-select" value={month} disabled={disabled} aria-label="Month" onChange={(e) => combine(e.target.value ? `${e.target.value}-${day || "01"}` : "", timePart)}>
            <option value="">Month</option>
            {MONTHS.map((m, i) => (
              <option key={m} value={String(i + 1).padStart(2, "0")}>
                {m}
              </option>
            ))}
          </select>
          <select className="fr-select" value={day} disabled={disabled} aria-label="Day" onChange={(e) => combine(month && e.target.value ? `${month}-${e.target.value}` : "", timePart)}>
            <option value="">Day</option>
            {Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0")).map((d) => (
              <option key={d} value={d}>
                {Number(d)}
              </option>
            ))}
          </select>
        </>
      )}
      {question.includeTime && <input className="fr-text" type="time" value={timePart} disabled={disabled} aria-label="Time" onChange={(e) => combine(datePart, e.target.value)} />}
    </div>
  );
}

export function TimeInput({ question, value, onChange, labelledBy, describedBy, disabled }: InputProps<QuestionOf<"time">>) {
  const text = typeof value === "string" ? value : "";
  if (!question.duration) {
    return <input className="fr-text fr-short" type="time" value={text} disabled={disabled} onChange={(e) => onChange(e.target.value || undefined)} aria-labelledby={labelledBy} aria-describedby={describedBy} />;
  }
  const [h = "", m = "", s = ""] = text ? text.split(":") : [];
  const set = (hh: string, mm: string, ss: string) => onChange(hh || mm || ss ? `${Number(hh) || 0}:${String(Number(mm) || 0).padStart(2, "0")}:${String(Number(ss) || 0).padStart(2, "0")}` : undefined);
  return (
    <div className="fr-duration" role="group" aria-labelledby={labelledBy} aria-describedby={describedBy}>
      <label>
        <input className="fr-text" type="number" min={0} max={999} inputMode="numeric" value={h} disabled={disabled} onChange={(e) => set(e.target.value, m, s)} />
        hours
      </label>
      <label>
        <input className="fr-text" type="number" min={0} max={59} inputMode="numeric" value={m} disabled={disabled} onChange={(e) => set(h, e.target.value, s)} />
        minutes
      </label>
      <label>
        <input className="fr-text" type="number" min={0} max={59} inputMode="numeric" value={s} disabled={disabled} onChange={(e) => set(h, m, e.target.value)} />
        seconds
      </label>
    </div>
  );
}

function humanSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function FileInput({ question, value, onChange, labelledBy, describedBy, disabled, upload }: InputProps<QuestionOf<"file_upload">>) {
  const files = filesOf(value as never);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const picker = useRef<HTMLInputElement>(null);
  const accept = question.accept.flatMap((k) => FILE_TYPES[k].extensions).join(",");
  const add = async (list: FileList | null) => {
    if (!list?.length || !upload) return;
    setProblem(null);
    const room = question.maxFiles - files.length;
    const chosen = [...list].slice(0, room);
    if (list.length > room) setProblem(`Only ${question.maxFiles} file${question.maxFiles === 1 ? "" : "s"} can be added here.`);
    setBusy(true);
    const done: FileAnswer[] = [];
    try {
      for (const file of chosen) {
        if (file.size > question.maxSizeMb * 1024 * 1024) {
          setProblem(`"${file.name}" is over ${question.maxSizeMb} MB.`);
          continue;
        }
        if (!fileAllowed(question.accept, file.name, file.type)) {
          setProblem(`"${file.name}" isn't a kind of file this question accepts.`);
          continue;
        }
        done.push(await upload(question, file));
      }
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "The upload didn't finish. Please try again.");
    } finally {
      setBusy(false);
      if (done.length) onChange([...files, ...done]);
      if (picker.current) picker.current.value = "";
    }
  };
  return (
    <div className="fr-files" role="group" aria-labelledby={labelledBy} aria-describedby={describedBy}>
      {files.length > 0 && (
        <ul>
          {files.map((f) => (
            <li key={f.path}>
              <span>📎 {f.name}</span>
              <small>{humanSize(f.size)}</small>
              <button type="button" className="fr-clear" disabled={disabled} onClick={() => onChange(files.filter((x) => x.path !== f.path))}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      {files.length < question.maxFiles && (
        <label className={`fr-upload${busy ? " is-busy" : ""}${disabled || !upload ? " is-disabled" : ""}`}>
          <input ref={picker} type="file" accept={accept || undefined} multiple={question.maxFiles - files.length > 1} disabled={disabled || busy || !upload} onChange={(e) => void add(e.target.files)} />
          <span>{busy ? "Uploading…" : files.length ? "Add another file" : "Add file"}</span>
        </label>
      )}
      <p className="fr-hint">
        {question.accept.length ? question.accept.map((k) => FILE_TYPES[k].label).join(", ") : "Any file"} · up to {question.maxFiles} file{question.maxFiles === 1 ? "" : "s"}, {question.maxSizeMb} MB each
        {!upload && " · uploads are switched off in this preview"}
      </p>
      {problem && <p className="fr-error" role="alert">{problem}</p>}
    </div>
  );
}

export function SignatureInput({ value, onChange, labelledBy, describedBy, disabled }: InputProps<QuestionOf<"signature">>) {
  const saved = signatureOf(value as never);
  return <SignaturePad value={saved ?? null} onChange={(dataUrl) => onChange(dataUrl ? { dataUrl } : undefined)} labelledBy={labelledBy} describedBy={describedBy} disabled={disabled} />;
}

export function ConsentInput({ question, value, onChange, describedBy, disabled }: InputProps<QuestionOf<"consent">>) {
  return (
    <label className="fr-choice is-check fr-consent">
      <input type="checkbox" checked={value === true} disabled={disabled} onChange={(e) => onChange(e.target.checked ? true : undefined)} aria-describedby={describedBy} />
      <span>{question.statement}</span>
    </label>
  );
}

export function QuestionInput(props: InputProps) {
  const q = props.question;
  switch (q.type) {
    case "short_text":
    case "email":
    case "phone":
    case "number":
      return <TextInput {...props} question={q} />;
    case "long_text":
      return <LongTextInput {...props} question={q} />;
    case "multiple_choice":
      return <ChoiceInput {...props} question={q} />;
    case "checkboxes":
      return <CheckboxesInput {...props} question={q} />;
    case "dropdown":
      return <DropdownInput {...props} question={q} />;
    case "linear_scale":
      return <ScaleInput {...props} question={q} />;
    case "rating":
      return <RatingInput {...props} question={q} />;
    case "nps":
      return <NpsInput {...props} question={q} />;
    case "grid_choice":
    case "grid_checkbox":
      return <GridInput {...props} question={q} />;
    case "ranking":
      return <RankingInput {...props} question={q} />;
    case "date":
      return <DateInput {...props} question={q} />;
    case "time":
      return <TimeInput {...props} question={q} />;
    case "file_upload":
      return <FileInput {...props} question={q} />;
    case "signature":
      return <SignatureInput {...props} question={q} />;
    case "consent":
      return <ConsentInput {...props} question={q} />;
  }
}

export { otherText };
