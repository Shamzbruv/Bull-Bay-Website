"use client";

import { Fragment, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { submitForm, type SubmitFormResult } from "@/app/f/[publicId]/actions";
import { useConfirm } from "@/components/dialog-provider";
import { createClient } from "@/lib/supabase/client";
import { isAnswered, isShown, nextPage, pagesOf, questionMap, seededShuffle } from "@/lib/forms/logic";
import { SUBMIT, isQuestion, type Answers, type FileAnswer, type FormItem, type FormSettings, type Question } from "@/lib/forms/schema";
import type { QuizOutcome } from "@/lib/forms/server";
import { checkAnswer } from "@/lib/forms/validate";
import { QuestionInput } from "./inputs";

// The form as a respondent sees it, page by page. Shared by the public
// link (/f/…), emailed invitations (/forms/…), the staff preview and the
// member portal.

export type RendererForm = {
  publicId: string;
  version: number;
  title: string;
  description: string;
  items: FormItem[];
  settings: FormSettings;
};

export type RendererProps = {
  form: RendererForm;
  initialAnswers: Record<string, unknown>;
  /** Spots left: question → option → count. */
  remaining: Record<string, Record<string, number>>;
  respondent: { name: string; email: string | null } | null;
  mode: "live" | "preview" | "edit";
  editToken?: string | null;
  editOwn?: boolean;
  editResponseId?: string | null;
  inviteToken?: string | null;
  seed: string;
  uploadSession: string;
};

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const URL_PART = /(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])/g;

/** Plain text with line breaks and clickable links. */
export function RichText({ text, className }: { text?: string; className?: string }) {
  if (!text?.trim()) return null;
  return (
    <p className={className} style={{ whiteSpace: "pre-wrap" }}>
      {text.split(URL_PART).map((part, i) =>
        /^https?:\/\//.test(part) ? (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer">
            {part}
          </a>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </p>
  );
}

function youtubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return match?.[1] ?? null;
}

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeStorage(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Private browsing or storage switched off: answers just aren't kept.
  }
}
const subscribeStorage = (callback: () => void) => {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
};

type Draft = { answers: Record<string, unknown>; history: number[]; seed: string; uploadSession: string; email: string };

export function FormRenderer(props: RendererProps) {
  const { form, mode } = props;
  const { settings } = form;
  const confirm = useConfirm();
  const pages = useMemo(() => pagesOf(form.items), [form.items]);
  const questions = useMemo(() => questionMap(form.items), [form.items]);
  const [answers, setAnswers] = useState<Record<string, unknown>>(props.initialAnswers);
  const [history, setHistory] = useState<number[]>([0]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [phase, setPhase] = useState<"filling" | "sending" | "done">("filling");
  const [result, setResult] = useState<Extract<SubmitFormResult, { ok: true }> | null>(null);
  const [seed, setSeed] = useState(props.seed);
  const [uploadSession, setUploadSession] = useState(props.uploadSession);
  const [email, setEmail] = useState(props.respondent?.email ?? "");
  const [wantsReceipt, setWantsReceipt] = useState(false);
  const [started, setStarted] = useState(false);
  const startedAt = useRef(0);
  const honeypot = useRef<HTMLInputElement>(null);
  const top = useRef<HTMLDivElement>(null);
  const current = history[history.length - 1] ?? 0;
  const page = pages[current];
  const live = mode !== "preview";

  // Keep answers on this device as they're typed (never in edit or preview
  // mode), and offer them back if the page is opened again.
  const draftKey = `bbntcog-form:${form.publicId}:v${form.version}`;
  const keepDraft = settings.autosave && mode === "live" && !settings.kiosk;
  const storedDraft = useSyncExternalStore(subscribeStorage, () => (keepDraft ? readStorage(draftKey) : null), () => null);
  const draft = useMemo<Draft | null>(() => {
    if (!storedDraft) return null;
    try {
      const parsed = JSON.parse(storedDraft) as Draft;
      return parsed && typeof parsed === "object" && Object.keys(parsed.answers ?? {}).length ? parsed : null;
    } catch {
      return null;
    }
  }, [storedDraft]);
  useEffect(() => {
    startedAt.current = Date.now();
  }, []);
  useEffect(() => {
    if (!keepDraft || !started || phase !== "filling") return;
    const timer = window.setTimeout(() => writeStorage(draftKey, JSON.stringify({ answers, history, seed, uploadSession, email } satisfies Draft)), 400);
    return () => window.clearTimeout(timer);
  }, [answers, history, seed, uploadSession, email, keepDraft, started, phase, draftKey]);

  const typed = answers as Answers;
  const shownItems = (index: number) => {
    const items = (pages[index]?.items ?? []).filter((item) => isShown(item, questions, typed));
    if (!settings.shuffleQuestions) return items;
    const slots = items.map((item, i) => (isQuestion(item) ? i : -1)).filter((i) => i >= 0);
    const shuffled = seededShuffle(slots.map((i) => items[i]!), `${seed}:page${index}`);
    const out = [...items];
    slots.forEach((slot, i) => (out[slot] = shuffled[i]!));
    return out;
  };
  const visible = shownItems(current);
  const destination = nextPage(pages, current, typed, form.items, settings.startNext);

  const setAnswer = (id: string, value: unknown) => {
    setStarted(true);
    setAnswers((prev) => {
      const next = { ...prev };
      if (value === undefined) delete next[id];
      else next[id] = value;
      return next;
    });
    if (errors[id]) {
      setErrors((prev) => {
        const rest = { ...prev };
        delete rest[id];
        return rest;
      });
    }
  };

  const pageErrors = (index: number) => {
    const found: Record<string, string> = {};
    for (const item of shownItems(index)) {
      if (!isQuestion(item)) continue;
      const checked = checkAnswer(item, answers[item.id]);
      if (!checked.ok) found[item.id] = checked.error;
      else if (item.required && (checked.value === undefined || !isAnswered(checked.value))) found[item.id] = item.type === "consent" ? "Please agree to continue." : "This question is required.";
    }
    if (index === 0 && settings.collectEmail === "input" && !EMAIL.test(email.trim())) found.__email = "Enter a valid email address.";
    return found;
  };

  const focusFirst = (found: Record<string, string>) => {
    const first = Object.keys(found)[0];
    if (!first) return;
    window.requestAnimationFrame(() => document.getElementById(first === "__email" ? "fr-email" : `q-${first}`)?.scrollIntoView({ behavior: "smooth", block: "center" }));
  };

  const goTo = (index: number) => {
    setHistory((h) => [...h, index]);
    window.requestAnimationFrame(() => top.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const upload = async (question: Question, file: File): Promise<FileAnswer> => {
    const response = await fetch(`/api/forms/${form.publicId}/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: question.id, name: file.name, size: file.size, type: file.type, session: uploadSession }),
    });
    const data = (await response.json().catch(() => ({}))) as { path?: string; token?: string; error?: string };
    if (!response.ok || !data.path || !data.token) throw new Error(data.error || "The upload couldn't start. Please try again.");
    const { error } = await createClient().storage.from("form-uploads").uploadToSignedUrl(data.path, data.token, file, { contentType: file.type || "application/octet-stream" });
    if (error) throw new Error("The upload didn't finish. Please try again.");
    setStarted(true);
    return { path: data.path, name: file.name, size: file.size, type: file.type || "application/octet-stream" };
  };

  const resetAll = () => {
    writeStorage(draftKey, null);
    setAnswers(props.initialAnswers);
    setHistory([0]);
    setErrors({});
    setBanner(null);
    setResult(null);
    setPhase("filling");
    setStarted(false);
    setWantsReceipt(false);
    setUploadSession(crypto.randomUUID());
    startedAt.current = Date.now();
    window.requestAnimationFrame(() => top.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const send = async () => {
    if (mode === "preview") {
      setResult({ ok: true, responseId: "", editToken: null, quiz: null, scorePending: false, preview: true });
      setPhase("done");
      return;
    }
    setPhase("sending");
    setBanner(null);
    let outcome: SubmitFormResult;
    try {
      outcome = await submitForm(form.publicId, {
        answers,
        email: email.trim(),
        receipt: wantsReceipt,
        uploadSession,
        editToken: props.editToken ?? null,
        editOwn: Boolean(props.editOwn),
        editResponseId: props.editResponseId ?? null,
        inviteToken: props.inviteToken ?? null,
        website: honeypot.current?.value ?? "",
        startedAt: startedAt.current,
      });
    } catch {
      outcome = { ok: false, error: "We couldn't reach the church website. Check your connection and try again; your answers are still here." };
    }
    if (outcome.ok) {
      writeStorage(draftKey, null);
      setResult(outcome);
      setPhase("done");
      window.requestAnimationFrame(() => top.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
      if (settings.kiosk) window.setTimeout(resetAll, 9000);
      return;
    }
    setPhase("filling");
    // Problems with particular answers are shown on those questions, and the
    // note at the bottom goes once they're fixed; anything else stays.
    if (!outcome.fieldErrors) setBanner(outcome.error);
    if (outcome.fieldErrors) {
      setErrors(outcome.fieldErrors);
      // Go back to the page with the first problem.
      const firstId = Object.keys(outcome.fieldErrors)[0];
      const at = firstId === "__email" ? 0 : pages.findIndex((p) => p.items.some((i) => i.id === firstId));
      if (at >= 0 && at !== current) {
        const position = history.indexOf(at);
        setHistory(position >= 0 ? history.slice(0, position + 1) : [...history, at]);
      }
      focusFirst(outcome.fieldErrors);
    }
  };

  const next = () => {
    const found = pageErrors(current);
    setErrors(found);
    setBanner(null);
    if (Object.keys(found).length) {
      focusFirst(found);
      return;
    }
    if (destination === SUBMIT) void send();
    else goTo(destination);
  };

  const theme = settings.theme;
  const style = { ["--fr-accent" as string]: theme.accent, ["--fr-bg" as string]: theme.background } as React.CSSProperties;
  const quizOn = settings.quiz.enabled;
  const pointsOf = (q: Question) => (quizOn && q.quiz?.points ? q.quiz.points : 0);

  if (phase === "done" && result) {
    return (
      <div className={`fr-page font-${theme.font}`} style={style} ref={top}>
        <Header form={form} headerImage={theme.headerImage} />
        <section className="fr-card fr-done" aria-live="polite">
          {result.preview && <p className="fr-banner is-preview">Preview finished: nothing was saved.</p>}
          <h2>{mode === "edit" || props.editOwn ? "Your changes were saved" : "Response sent"}</h2>
          <RichText text={settings.confirmationMessage} className="fr-done-message" />
          {result.quiz && <QuizResult quiz={result.quiz} />}
          {result.scorePending && <p className="fr-hint">Your score will be shared once the church office has marked your answers.</p>}
          {result.editToken && (
            <p className="fr-edit-link">
              Need to change something later? <a href={`/f/${form.publicId}?edit=${result.editToken}`}>Edit your response</a>. Keep this link: it&apos;s the only way back to your answers.
            </p>
          )}
          <div className="fr-done-actions">
            {settings.showSubmitAnother && !settings.limitOneResponse && !settings.kiosk && (
              <button type="button" className="fr-button is-secondary" onClick={resetAll}>
                Submit another response
              </button>
            )}
            {settings.showResultsSummary && !result.preview && (
              <a className="fr-button is-secondary" href={`/f/${form.publicId}/results`}>
                See how others answered
              </a>
            )}
            {settings.kiosk && (
              <button type="button" className="fr-button" onClick={resetAll}>
                Start again for the next person
              </button>
            )}
          </div>
          {settings.kiosk && <p className="fr-hint">This form starts over by itself in a few seconds.</p>}
        </section>
      </div>
    );
  }

  const position = history.length - 1;
  const firstPage = current === 0;
  return (
    <div className={`fr-page font-${theme.font}`} style={style} ref={top}>
      {mode === "preview" && <p className="fr-banner is-preview">Preview: this is how people see the form. Nothing you enter here is saved.</p>}
      {(mode === "edit" || props.editOwn) && <p className="fr-banner">You&apos;re changing the response you sent earlier.</p>}
      {draft && !started && phase === "filling" && (
        <div className="fr-banner is-restore">
          <span>You started this form earlier on this device.</span>
          <button
            type="button"
            className="fr-button is-small"
            onClick={() => {
              setAnswers(draft.answers);
              setHistory(Array.isArray(draft.history) && draft.history.length ? draft.history : [0]);
              if (draft.seed) setSeed(draft.seed);
              if (draft.uploadSession) setUploadSession(draft.uploadSession);
              if (draft.email) setEmail(draft.email);
              setStarted(true);
            }}
          >
            Continue where I left off
          </button>
          <button type="button" className="fr-clear" onClick={() => writeStorage(draftKey, null)}>
            Start fresh
          </button>
        </div>
      )}
      <Header form={form} headerImage={firstPage ? theme.headerImage : null} compact={!firstPage}>
        {firstPage && <RichText text={form.description} className="fr-desc" />}
        {firstPage && form.items.some((i) => isQuestion(i) && i.required) && <p className="fr-required-note"><span className="fr-req">*</span> Required</p>}
        {firstPage && props.respondent && settings.collectEmail === "verified" && (
          <p className="fr-who">
            Responding as <strong>{props.respondent.name}</strong>
            {props.respondent.email ? ` (${props.respondent.email})` : ""}. Your email address is recorded with your response.
          </p>
        )}
        {firstPage && settings.collectEmail === "input" && (
          <label className="fr-email" id="fr-email">
            <span>
              Email address <span className="fr-req">*</span>
            </span>
            <input
              className="fr-text"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setStarted(true);
                if (errors.__email) {
                  setErrors((prev) => {
                    const rest = { ...prev };
                    delete rest.__email;
                    return rest;
                  });
                }
              }}
              aria-describedby={errors.__email ? "fr-email-error" : undefined}
            />
            {errors.__email && <span className="fr-error" id="fr-email-error">{errors.__email}</span>}
          </label>
        )}
      </Header>

      {page?.section && (
        <section className="fr-card fr-section-head">
          <h2>{page.section.title}</h2>
          <RichText text={page.section.description} className="fr-desc" />
        </section>
      )}

      {visible.map((item) => {
        if (item.kind === "text") {
          return (
            <section key={item.id} className="fr-card fr-text-block">
              {item.title && <h3>{item.title}</h3>}
              <RichText text={item.description} className="fr-desc" />
            </section>
          );
        }
        if (item.kind === "image") {
          return (
            <figure key={item.id} className="fr-card fr-media">
              {item.title && <figcaption>{item.title}</figcaption>}
              {/* eslint-disable-next-line @next/next/no-img-element -- an image the form's author added by address */}
              <img src={item.url} alt={item.alt ?? item.title ?? ""} loading="lazy" />
            </figure>
          );
        }
        if (item.kind === "video") {
          const id = youtubeId(item.url);
          return (
            <figure key={item.id} className="fr-card fr-media">
              {item.title && <figcaption>{item.title}</figcaption>}
              {id ? (
                <div className="fr-video">
                  <iframe src={`https://www.youtube-nocookie.com/embed/${id}`} title={item.title ?? "Video"} allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowFullScreen loading="lazy" />
                </div>
              ) : (
                <a href={item.url} target="_blank" rel="noopener noreferrer">
                  Watch the video
                </a>
              )}
            </figure>
          );
        }
        if (!isQuestion(item)) return null;
        const error = errors[item.id];
        const titleId = `q-${item.id}-title`;
        const points = pointsOf(item);
        return (
          <section key={item.id} id={`q-${item.id}`} className={`fr-card fr-question${error ? " has-error" : ""}`}>
            <h3 className="fr-q-title" id={titleId}>
              {item.title}
              {item.required && <span className="fr-req" aria-label="(required)"> *</span>}
              {points > 0 && <span className="fr-points">{points} {points === 1 ? "point" : "points"}</span>}
            </h3>
            <RichText text={item.description} className="fr-q-desc" />
            <QuestionInput
              question={item}
              value={answers[item.id]}
              onChange={(value) => setAnswer(item.id, value)}
              labelledBy={titleId}
              describedBy={error ? `q-${item.id}-error` : undefined}
              seed={seed}
              remaining={props.remaining[item.id]}
              disabled={phase === "sending"}
              upload={live ? upload : undefined}
            />
            {error && (
              <p className="fr-error" id={`q-${item.id}-error`} role="alert">
                {error}
              </p>
            )}
          </section>
        );
      })}

      {destination === SUBMIT && settings.receipts === "requested" && (settings.collectEmail !== "none" || props.respondent?.email || form.items.some((i) => isQuestion(i) && i.type === "email")) && (
        <label className="fr-card fr-receipt">
          <input type="checkbox" checked={wantsReceipt} onChange={(e) => setWantsReceipt(e.target.checked)} />
          <span>Email me a copy of my responses</span>
        </label>
      )}

      {(banner || Object.keys(errors).length > 0) && (
        <p className="fr-banner is-error" role="alert">
          {banner ?? "Some answers need attention."}
        </p>
      )}

      {/* Never shown to people; fills in only for automated spam. */}
      <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" }}>
        <label>
          Website
          <input ref={honeypot} type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>

      <nav className="fr-nav" aria-label="Form pages">
        <div className="fr-nav-buttons">
          {position > 0 && (
            <button type="button" className="fr-button is-secondary" disabled={phase === "sending"} onClick={() => setHistory((h) => h.slice(0, -1))}>
              Back
            </button>
          )}
          <button type="button" className="fr-button" disabled={phase === "sending"} onClick={next}>
            {phase === "sending" ? "Sending…" : destination === SUBMIT ? (mode === "edit" || props.editOwn ? "Save changes" : "Submit") : "Next"}
          </button>
        </div>
        {settings.showProgressBar && pages.length > 1 && (
          <div className="fr-progress" aria-label={`Page ${position + 1} of about ${pages.length}`}>
            <span style={{ width: `${Math.min(100, Math.round(((destination === SUBMIT ? pages.length : position + 1) / pages.length) * 100))}%` }} />
            <small>
              Page {position + 1} of {pages.length}
            </small>
          </div>
        )}
        <button
          type="button"
          className="fr-clear"
          disabled={phase === "sending"}
          onClick={async () => {
            if (await confirm({ title: "Clear the whole form?", message: "Every answer you've given will be removed.", confirmLabel: "Clear form" })) resetAll();
          }}
        >
          Clear form
        </button>
      </nav>
    </div>
  );
}

function Header({ form, headerImage, compact, children }: { form: RendererForm; headerImage: string | null; compact?: boolean; children?: React.ReactNode }) {
  return (
    <header className={`fr-card fr-head${compact ? " is-compact" : ""}`}>
      {headerImage && (
        // eslint-disable-next-line @next/next/no-img-element -- the form's own header picture
        <img className="fr-head-image" src={headerImage} alt="" />
      )}
      <div className="fr-head-body">
        <p className="fr-kicker">New Testament Church of God · Bull Bay</p>
        <h1>{form.title}</h1>
        {children}
      </div>
    </header>
  );
}

function QuizResult({ quiz }: { quiz: QuizOutcome }) {
  return (
    <div className="fr-quiz">
      {quiz.showPoints && (
        <p className="fr-quiz-score">
          <strong>
            {quiz.score} / {quiz.maxScore}
          </strong>{" "}
          points
        </p>
      )}
      <ol className="fr-quiz-list">
        {quiz.questions.map((q) => (
          <li key={q.id} className={q.correct === true ? "is-right" : q.correct === false ? "is-wrong" : ""}>
            <p className="fr-quiz-q">
              <span aria-hidden="true">{q.correct === true ? "✓" : q.correct === false ? "✗" : "•"}</span> {q.title}
              {quiz.showPoints && (
                <small>
                  {" "}
                  {q.points}/{q.max}
                </small>
              )}
            </p>
            {q.yourAnswer && <p className="fr-quiz-a">Your answer: {q.yourAnswer}</p>}
            {q.correctAnswer && <p className="fr-quiz-a">Correct answer: {q.correctAnswer}</p>}
            {q.feedback && <p className="fr-quiz-feedback">{q.feedback}</p>}
          </li>
        ))}
      </ol>
    </div>
  );
}
