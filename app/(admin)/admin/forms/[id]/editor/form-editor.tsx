"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TYPE_GROUPS, TYPE_LABELS, definitionProblems, duplicateItem, idsIn, moveItem, newId, newQuestion, removeItem } from "@/lib/forms/builder";
import { type FormDefinition, type FormItem, type QuestionType } from "@/lib/forms/schema";
import { useConfirm } from "@/components/dialog-provider";
import { saveFormDefinition } from "../../actions";
import { ItemEditor } from "./item-editor";
import { GoToSelect } from "./question-parts";
import { SettingsEditor } from "./settings-editor";

// The form builder. Changes save themselves a moment after typing stops,
// as in Google Forms; a form with a problem (an empty choice, a branch to
// a deleted section) isn't saved until it's fixed, and the problem is
// named.

type Props = {
  formId: string;
  publicId: string;
  initial: FormDefinition;
  version: number;
  staff: { id: string; name: string; email: string | null }[];
  tab: "questions" | "settings";
  responseCount: number;
};

export function FormEditor(props: Props) {
  const confirm = useConfirm();
  const [def, setDef] = useState<FormDefinition>(props.initial);
  const [saved, setSaved] = useState<FormDefinition>(props.initial);
  const [version, setVersion] = useState(props.version);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [tab, setTab] = useState(props.tab);
  const [selected, setSelected] = useState<string | null>(props.initial.items[0]?.id ?? null);
  const [adding, setAdding] = useState(false);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const listEnd = useRef<HTMLDivElement>(null);

  const problems = useMemo(() => definitionProblems(def), [def]);
  const dirty = def !== saved;

  useEffect(() => {
    if (!dirty || problems.length || saving) return;
    const timer = window.setTimeout(async () => {
      const snapshot = def;
      setSaving(true);
      const result = await saveFormDefinition(props.formId, version, JSON.stringify(snapshot)).catch(() => ({ status: "error" as const, message: "Couldn't reach the website. Your changes will be saved when the connection is back.", version: undefined }));
      setSaving(false);
      if (result.status === "success" && result.version) {
        setSaved(snapshot);
        setVersion(result.version);
        setSaveError(null);
      } else setSaveError(result.message);
    }, 800);
    return () => window.clearTimeout(timer);
  }, [def, dirty, problems, saving, version, props.formId]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const items = def.items;
  const sections = items.filter((i) => i.kind === "section").map((s) => ({ id: s.id, title: s.title }));
  const makeId = (prefix: string) => newId(prefix, idsIn(items));
  const setItems = (next: FormItem[]) => setDef((d) => ({ ...d, items: next }));
  const update = (index: number, item: FormItem) => setDef((d) => ({ ...d, items: d.items.map((it, i) => (i === index ? item : it)) }));
  const insert = (item: FormItem) => {
    const at = selected ? items.findIndex((i) => i.id === selected) + 1 : items.length;
    setItems([...items.slice(0, at), item, ...items.slice(at)]);
    setSelected(item.id);
    setAdding(false);
    window.requestAnimationFrame(() => document.getElementById(`fb-${item.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }));
  };
  const addQuestion = (type: QuestionType) => insert(newQuestion(type, idsIn(items)));

  const status = saving
    ? "Saving…"
    : problems.length
      ? "Not saved yet: fix the problem below"
      : saveError
        ? saveError
        : dirty
          ? "Unsaved changes…"
          : "All changes saved";

  const leaveTo = async (href: string) => {
    if (dirty && !(await confirm({ title: "Leave with unsaved changes?", message: problems.length ? `This change can't be saved yet: ${problems[0]}` : "Your last change is still saving.", confirmLabel: "Leave anyway" }))) return;
    window.location.href = href;
  };

  return (
    <div className="fb">
      <div className="fb-bar">
        <nav className="fb-tabs" aria-label="Form">
          <button type="button" className={tab === "questions" ? "is-on" : ""} aria-current={tab === "questions" ? "page" : undefined} onClick={() => setTab("questions")}>
            Questions
          </button>
          <button type="button" onClick={() => void leaveTo(`/admin/forms/${props.formId}?tab=responses`)}>
            Responses{props.responseCount ? ` (${props.responseCount})` : ""}
          </button>
          <button type="button" className={tab === "settings" ? "is-on" : ""} aria-current={tab === "settings" ? "page" : undefined} onClick={() => setTab("settings")}>
            Settings
          </button>
          <button type="button" onClick={() => void leaveTo(`/admin/forms/${props.formId}?tab=share`)}>
            Share
          </button>
        </nav>
        <span className={`fb-status${problems.length || saveError ? " is-problem" : dirty || saving ? " is-busy" : " is-ok"}`} role="status">
          {status}
        </span>
        <a className="fb-button is-secondary" href={`/f/${props.publicId}?preview=1`} target="_blank" rel="noopener">
          Preview
        </a>
      </div>

      {problems.length > 0 && (
        <div className="fb-problems" role="alert">
          {problems.slice(0, 3).map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      )}

      {tab === "settings" ? (
        <SettingsEditor settings={def.settings} onChange={(settings) => setDef((d) => ({ ...d, settings }))} staff={props.staff} formId={props.formId} />
      ) : (
        <div className="fb-canvas" style={{ ["--fb-accent" as string]: def.settings.theme.accent } as React.CSSProperties}>
          <div className="fb-item is-open is-header">
            <input className="fb-form-title" value={def.title} maxLength={300} aria-label="Form title" placeholder="Form title" onChange={(e) => setDef((d) => ({ ...d, title: e.target.value }))} />
            <textarea className="fb-desc-input" value={def.description} maxLength={10000} aria-label="Form description" placeholder="Form description (links become clickable)" onChange={(e) => setDef((d) => ({ ...d, description: e.target.value }))} />
            {sections.length > 0 && (
              <label className="fb-field fb-inline">
                <span>After the first page</span>
                <GoToSelect value={def.settings.startNext} sections={sections} onChange={(startNext) => setDef((d) => ({ ...d, settings: { ...d.settings, startNext } }))} />
              </label>
            )}
            {def.settings.quiz.enabled && <p className="fb-hint">This is a quiz: give each question points and an answer key.</p>}
          </div>

          {items.map((item, index) => (
            <div key={item.id} id={`fb-${item.id}`} className={`fb-slot${dragFrom !== null && dragFrom !== index ? " is-drop" : ""}`}>
              <ItemEditor
                item={item}
                index={index}
                items={items}
                formId={props.formId}
                selected={selected === item.id}
                quizOn={def.settings.quiz.enabled}
                sections={sections}
                makeId={makeId}
                onSelect={() => setSelected(item.id)}
                onChange={(next) => update(index, next)}
                onRemove={async () => {
                  const used = items.some((other) => ("showIf" in other && other.showIf?.some((c) => c.questionId === item.id)) || (other.kind === "section" && other.next === item.id));
                  if (used && !(await confirm({ title: "Delete this?", message: "Other questions depend on it; those conditions or branches will be removed too.", confirmLabel: "Delete" }))) return;
                  setItems(removeItem(items, item.id));
                  setSelected(items[index + 1]?.id ?? items[index - 1]?.id ?? null);
                }}
                onDuplicate={() => {
                  const next = duplicateItem(items, item.id);
                  setItems(next);
                  setSelected(next[index + 1]?.id ?? null);
                }}
                onMove={(delta) => setItems(moveItem(items, index, index + delta))}
                dragProps={{
                  draggable: true,
                  onDragStart: (e) => {
                    if ((e.target as HTMLElement).closest("input, textarea, select")) return e.preventDefault();
                    setDragFrom(index);
                  },
                  onDragOver: (e) => e.preventDefault(),
                  onDrop: () => {
                    if (dragFrom !== null) setItems(moveItem(items, dragFrom, index));
                    setDragFrom(null);
                  },
                  onDragEnd: () => setDragFrom(null),
                }}
              />
            </div>
          ))}
          <div ref={listEnd} />

          <div className="fb-add" role="toolbar" aria-label="Add to the form">
            <button type="button" className="fb-button" aria-expanded={adding} onClick={() => setAdding((a) => !a)}>
              + Question
            </button>
            <button type="button" className="fb-button is-secondary" onClick={() => insert({ kind: "text", id: makeId("b"), title: "Title", description: undefined })}>
              + Text
            </button>
            <button type="button" className="fb-button is-secondary" onClick={() => insert({ kind: "image", id: makeId("b"), url: "" })}>
              + Image
            </button>
            <button type="button" className="fb-button is-secondary" onClick={() => insert({ kind: "video", id: makeId("b"), url: "" })}>
              + Video
            </button>
            <button type="button" className="fb-button is-secondary" onClick={() => insert({ kind: "section", id: makeId("s"), title: "" })}>
              + Section
            </button>
          </div>
          {adding && (
            <div className="fb-type-picker">
              {TYPE_GROUPS.map((group) => (
                <div key={group.label}>
                  <p className="fb-sub">{group.label}</p>
                  <div className="fb-type-grid">
                    {group.types.map((t) => (
                      <button key={t} type="button" onClick={() => addQuestion(t)}>
                        {TYPE_LABELS[t]}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
