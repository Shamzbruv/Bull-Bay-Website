"use client";

import { useState } from "react";
import { TYPE_GROUPS, TYPE_LABELS, convertQuestion, idsIn } from "@/lib/forms/builder";
import { FILE_KINDS, PREFILL_FIELDS, TEXT_RULES, isQuestion, type FormItem, type Question, type QuestionType, type TextValidation } from "@/lib/forms/schema";
import { FILE_TYPES } from "@/lib/forms/validate";
import { NumberField, SelectField, TextField, Toggle } from "./controls";
import { ImageField } from "./image-field";
import { AnswerKeyEditor, ConditionsEditor, GoToSelect, GridEditor, OptionsEditor, earlierQuestions, type MakeId } from "./question-parts";

type Props = {
  item: FormItem;
  index: number;
  items: FormItem[];
  formId: string;
  selected: boolean;
  quizOn: boolean;
  sections: { id: string; title: string }[];
  makeId: MakeId;
  onSelect: () => void;
  onChange: (item: FormItem) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onMove: (delta: number) => void;
  dragProps: React.HTMLAttributes<HTMLDivElement>;
};

const RULE_LABELS: Record<(typeof TEXT_RULES)[number], string> = {
  email: "Is an email address",
  url: "Is a web address",
  number: "Is a number",
  integer: "Is a whole number",
  between: "Is a number between",
  greater_than: "Is a number greater than",
  less_than: "Is a number less than",
  min_length: "Has at least this many characters",
  max_length: "Has at most this many characters",
  contains: "Contains",
  not_contains: "Doesn't contain",
  pattern: "Matches a pattern (regular expression)",
};
const PREFILL_LABELS: Record<(typeof PREFILL_FIELDS)[number], string> = {
  full_name: "their full name",
  first_name: "their first name",
  last_name: "their last name",
  email: "their email address",
  phone: "their phone number",
};

function TextRuleEditor({ question, onChange }: { question: Question & { validation?: TextValidation }; onChange: (q: Question) => void }) {
  const rule = question.validation;
  const set = (validation: TextValidation | undefined) => onChange({ ...question, validation } as Question);
  const rules = question.type === "long_text" ? (["min_length", "max_length", "contains", "not_contains", "pattern"] as const) : TEXT_RULES;
  return (
    <div className="fb-rule">
      <Toggle label="Check the answer" hint="Like Google Forms' response validation." checked={Boolean(rule)} onChange={(on) => set(on ? { rule: rules[0]! } : undefined)} />
      {rule && (
        <div className="fb-row">
          <select aria-label="Rule" value={rule.rule} onChange={(e) => set({ ...rule, rule: e.target.value as TextValidation["rule"], value: undefined, value2: undefined })}>
            {rules.map((r) => (
              <option key={r} value={r}>
                {RULE_LABELS[r]}
              </option>
            ))}
          </select>
          {!["email", "url", "number", "integer"].includes(rule.rule) && <input aria-label="Value" placeholder={rule.rule === "pattern" ? "e.g. [A-Z]{3}\\d{4}" : "Value"} value={rule.value ?? ""} onChange={(e) => set({ ...rule, value: e.target.value })} />}
          {rule.rule === "between" && <input aria-label="and" placeholder="and" value={rule.value2 ?? ""} onChange={(e) => set({ ...rule, value2: e.target.value })} />}
          <input aria-label="Message if it doesn't match" placeholder="Message if it doesn't match (optional)" value={rule.message ?? ""} onChange={(e) => set({ ...rule, message: e.target.value || undefined })} />
        </div>
      )}
    </div>
  );
}

function TypeSettings({ question, onChange, makeId, sections, quizOn }: { question: Question; onChange: (q: Question) => void; makeId: MakeId; sections: { id: string; title: string }[]; quizOn: boolean }) {
  const set = (patch: Record<string, unknown>) => onChange({ ...question, ...patch } as Question);
  switch (question.type) {
    case "short_text":
      return (
        <>
          <div className="fb-preview-line">Short answer text</div>
          <TextRuleEditor question={question} onChange={onChange} />
          <SelectField
            label="For signed-in members, fill in"
            inline
            value={question.prefill ?? "none"}
            options={[{ value: "none", label: "nothing" }, ...PREFILL_FIELDS.map((f) => ({ value: f, label: PREFILL_LABELS[f] }))]}
            onChange={(v) => set({ prefill: v === "none" ? undefined : v })}
          />
        </>
      );
    case "long_text":
      return (
        <>
          <div className="fb-preview-line is-long">Long answer text</div>
          <TextRuleEditor question={question} onChange={onChange} />
        </>
      );
    case "email":
    case "phone":
      return <Toggle label={`Fill in the member's own ${question.type === "email" ? "email address" : "phone number"} when they're signed in`} checked={Boolean(question.prefill)} onChange={(prefill) => set({ prefill })} />;
    case "number":
      return (
        <div className="fb-row">
          <NumberField label="Lowest" value={question.min} width={90} onChange={(min) => set({ min })} />
          <NumberField label="Highest" value={question.max} width={90} onChange={(max) => set({ max })} />
          <Toggle label="Whole numbers only" checked={Boolean(question.integer)} onChange={(integer) => set({ integer })} />
        </div>
      );
    case "multiple_choice":
    case "checkboxes":
    case "dropdown":
    case "ranking":
      return <OptionsEditor question={question} onChange={onChange} makeId={makeId} sections={sections} quizOn={quizOn} />;
    case "linear_scale":
      return (
        <div className="fb-scale-editor">
          <div className="fb-row">
            <select aria-label="From" value={question.min} onChange={(e) => set({ min: Number(e.target.value) as 0 | 1 })}>
              <option value={0}>0</option>
              <option value={1}>1</option>
            </select>
            <span>to</span>
            <select aria-label="To" value={question.max} onChange={(e) => set({ max: Number(e.target.value) })}>
              {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="fb-two">
            <TextField label={`Label for ${question.min} (optional)`} value={question.minLabel} maxLength={100} onChange={(minLabel) => set({ minLabel: minLabel || undefined })} />
            <TextField label={`Label for ${question.max} (optional)`} value={question.maxLabel} maxLength={100} onChange={(maxLabel) => set({ maxLabel: maxLabel || undefined })} />
          </div>
        </div>
      );
    case "rating":
      return (
        <div className="fb-row">
          <SelectField label="Levels" inline value={String(question.levels)} options={[3, 4, 5, 6, 7, 8, 9, 10].map((n) => ({ value: String(n), label: String(n) }))} onChange={(v) => set({ levels: Number(v) })} />
          <SelectField
            label="Shown as"
            inline
            value={question.icon}
            options={[
              { value: "star", label: "★ Stars" },
              { value: "heart", label: "♥ Hearts" },
              { value: "thumb", label: "👍 Thumbs" },
              { value: "number", label: "Numbers" },
            ]}
            onChange={(icon) => set({ icon })}
          />
        </div>
      );
    case "nps":
      return (
        <>
          <div className="fb-preview-line">0 – 10, grouped into detractors (0–6), passives (7–8) and promoters (9–10)</div>
          <div className="fb-two">
            <TextField label="Label for 0" value={question.minLabel} maxLength={100} onChange={(minLabel) => set({ minLabel: minLabel || undefined })} />
            <TextField label="Label for 10" value={question.maxLabel} maxLength={100} onChange={(maxLabel) => set({ maxLabel: maxLabel || undefined })} />
          </div>
        </>
      );
    case "grid_choice":
    case "grid_checkbox":
      return <GridEditor question={question} onChange={onChange} makeId={makeId} />;
    case "date":
      return (
        <div className="fb-toggles">
          <Toggle label="Include the year" checked={question.includeYear} onChange={(includeYear) => set({ includeYear })} />
          <Toggle label="Include a time" checked={question.includeTime} onChange={(includeTime) => set({ includeTime })} />
        </div>
      );
    case "time":
      return <Toggle label="A length of time (hours, minutes, seconds) instead of a time of day" checked={Boolean(question.duration)} onChange={(duration) => set({ duration })} />;
    case "file_upload":
      return (
        <div className="fb-file-editor">
          <p className="fb-hint">Uploaded files are kept privately for the church office.</p>
          <div className="fb-row">
            <SelectField label="Up to" inline value={String(question.maxFiles)} options={[1, 2, 3, 5, 10].map((n) => ({ value: String(n), label: `${n} file${n === 1 ? "" : "s"}` }))} onChange={(v) => set({ maxFiles: Number(v) })} />
            <SelectField label="Each up to" inline value={String(question.maxSizeMb)} options={[1, 5, 10, 25].map((n) => ({ value: String(n), label: `${n} MB` }))} onChange={(v) => set({ maxSizeMb: Number(v) })} />
          </div>
          <p className="fb-sub">Accept only</p>
          <div className="fb-chips">
            {FILE_KINDS.map((kind) => (
              <label key={kind} className="fb-chip">
                <input type="checkbox" checked={question.accept.includes(kind)} onChange={(e) => set({ accept: e.target.checked ? [...question.accept, kind] : question.accept.filter((k) => k !== kind) })} />
                {FILE_TYPES[kind].label}
              </label>
            ))}
          </div>
          {!question.accept.length && <p className="fb-hint">Nothing ticked: any kind of file.</p>}
        </div>
      );
    case "signature":
      return <div className="fb-preview-line is-signature">People sign with a finger, pen or mouse.</div>;
    case "consent":
      return <TextField label="What they're agreeing to" multiline value={question.statement} maxLength={2000} onChange={(statement) => set({ statement })} />;
  }
}

function summaryOf(item: FormItem): { title: string; kind: string; badges: string[] } {
  if (item.kind === "section") return { title: item.title || "Untitled section", kind: "Section", badges: item.next ? ["Branches"] : [] };
  if (item.kind === "text") return { title: item.title || "Text", kind: "Title and description", badges: item.showIf?.length ? ["Conditional"] : [] };
  if (item.kind === "image") return { title: item.title || "Image", kind: "Image", badges: [] };
  if (item.kind === "video") return { title: item.title || "Video", kind: "Video", badges: [] };
  const badges = [
    ...(item.required ? ["Required"] : []),
    ...(item.showIf?.length ? ["Conditional"] : []),
    ...("options" in item && item.options.some((o) => o.limit) ? ["Spot limits"] : []),
    ...("branching" in item && item.branching ? ["Branches"] : []),
    ...(item.quiz?.points ? [`${item.quiz.points} pt${item.quiz.points === 1 ? "" : "s"}`] : []),
  ];
  return { title: item.title || "Untitled question", kind: TYPE_LABELS[item.type], badges };
}

export function ItemEditor(props: Props) {
  const { item, index, items, selected } = props;
  const summary = summaryOf(item);
  const [showDescription, setShowDescription] = useState(Boolean("description" in item && item.description));

  if (!selected) {
    return (
      <div className={`fb-item is-collapsed is-${item.kind}`} {...props.dragProps}>
        <button type="button" className="fb-item-open" onClick={props.onSelect} aria-label={`Edit: ${summary.title}`}>
          <span className="fb-item-kind">{summary.kind}</span>
          <span className="fb-item-title">{summary.title}</span>
          {summary.badges.length > 0 && (
            <span className="fb-badges">
              {summary.badges.map((b) => (
                <span key={b} className="fb-badge">
                  {b}
                </span>
              ))}
            </span>
          )}
        </button>
      </div>
    );
  }

  const tools = (
    <div className="fb-item-tools">
      {isQuestion(item) && <Toggle label="Required" checked={item.required} onChange={(required) => props.onChange({ ...item, required })} />}
      <span className="fb-spacer" />
      <button type="button" className="fb-icon-button" onClick={() => props.onMove(-1)} disabled={index === 0} aria-label="Move up" title="Move up">
        ↑
      </button>
      <button type="button" className="fb-icon-button" onClick={() => props.onMove(1)} disabled={index === items.length - 1} aria-label="Move down" title="Move down">
        ↓
      </button>
      <button type="button" className="fb-icon-button" onClick={props.onDuplicate} aria-label="Duplicate" title="Duplicate">
        ⧉
      </button>
      <button type="button" className="fb-icon-button is-danger" onClick={props.onRemove} aria-label="Delete" title="Delete">
        🗑
      </button>
    </div>
  );

  if (item.kind === "section") {
    return (
      <div className="fb-item is-open is-section" {...props.dragProps}>
        <p className="fb-section-tag">Section</p>
        <input className="fb-title-input" value={item.title} placeholder="Section title" maxLength={1000} onChange={(e) => props.onChange({ ...item, title: e.target.value })} />
        <textarea className="fb-desc-input" value={item.description ?? ""} placeholder="Description (optional)" maxLength={5000} onChange={(e) => props.onChange({ ...item, description: e.target.value || undefined })} />
        <label className="fb-field fb-inline">
          <span>After this section</span>
          <GoToSelect value={item.next} sections={props.sections.filter((s) => s.id !== item.id)} onChange={(next) => props.onChange({ ...item, next })} />
        </label>
        {tools}
      </div>
    );
  }
  if (item.kind === "text") {
    return (
      <div className="fb-item is-open" {...props.dragProps}>
        <input className="fb-title-input" value={item.title} placeholder="Title" maxLength={1000} onChange={(e) => props.onChange({ ...item, title: e.target.value })} />
        <textarea className="fb-desc-input" value={item.description ?? ""} placeholder="Description (links become clickable)" maxLength={5000} onChange={(e) => props.onChange({ ...item, description: e.target.value || undefined })} />
        <details className="fb-more" open={Boolean(item.showIf?.length)}>
          <summary>Show only when…</summary>
          <ConditionsEditor conditions={item.showIf ?? []} earlier={earlierQuestions(items, index)} onChange={(showIf) => props.onChange({ ...item, showIf })} />
        </details>
        {tools}
      </div>
    );
  }
  if (item.kind === "image" || item.kind === "video") {
    return (
      <div className="fb-item is-open" {...props.dragProps}>
        <input className="fb-title-input is-small" value={item.title ?? ""} placeholder={item.kind === "image" ? "Image title (optional)" : "Video title (optional)"} maxLength={1000} onChange={(e) => props.onChange({ ...item, title: e.target.value || undefined })} />
        {item.kind === "image" ? (
          <>
            <ImageField formId={props.formId} value={item.url} onChange={(url) => props.onChange({ ...item, url })} />
            <TextField label="Describe the image for people who can't see it" value={item.alt} maxLength={300} onChange={(alt) => props.onChange({ ...item, alt: alt || undefined })} />
          </>
        ) : (
          <TextField label="YouTube link" placeholder="https://www.youtube.com/watch?v=…" value={item.url} maxLength={2000} onChange={(url) => props.onChange({ ...item, url: url.trim() })} />
        )}
        {tools}
      </div>
    );
  }

  const question = item;
  const earlier = earlierQuestions(items, index);
  return (
    <div className="fb-item is-open is-question" {...props.dragProps}>
      <div className="fb-q-head">
        <textarea
          className="fb-title-input"
          rows={1}
          value={question.title}
          placeholder="Question"
          maxLength={1000}
          onChange={(e) => props.onChange({ ...question, title: e.target.value })}
        />
        <select
          className="fb-type"
          aria-label="Question type"
          value={question.type}
          onChange={(e) => props.onChange(convertQuestion(question, e.target.value as QuestionType, idsIn(items)))}
        >
          {TYPE_GROUPS.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.types.map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABELS[t]}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
      {showDescription ? (
        <textarea className="fb-desc-input" value={question.description ?? ""} placeholder="Description (optional; links become clickable)" maxLength={5000} onChange={(e) => props.onChange({ ...question, description: e.target.value || undefined })} />
      ) : (
        <button type="button" className="fb-link" onClick={() => setShowDescription(true)}>
          + Add a description
        </button>
      )}
      <div className="fb-type-settings">
        <TypeSettings question={question} onChange={(q) => props.onChange(q)} makeId={props.makeId} sections={props.sections} quizOn={props.quizOn} />
      </div>
      <details className="fb-more" open={Boolean(question.showIf?.length)}>
        <summary>Show only when… {question.showIf?.length ? `(${question.showIf.length})` : ""}</summary>
        <ConditionsEditor conditions={question.showIf ?? []} earlier={earlier} onChange={(showIf) => props.onChange({ ...question, showIf })} />
      </details>
      {props.quizOn && (
        <details className="fb-more" open>
          <summary>Answer key</summary>
          <AnswerKeyEditor question={question} onChange={props.onChange} />
        </details>
      )}
      {tools}
    </div>
  );
}
