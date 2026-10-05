"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useConfirm } from "@/components/dialog-provider";
import { answerToText } from "@/lib/forms/display";
import { isQuestion, type Answers, type FormItem, type Question } from "@/lib/forms/schema";
import { gradeResponse, type ManualGrades } from "@/lib/forms/score";
import { filesOf, gridCells, signatureOf } from "@/lib/forms/values";
import { deleteResponses, gradeFormResponse, releaseScores } from "../../actions";

export type BrowserResponse = {
  id: string;
  submittedAt: string;
  updatedAt: string;
  name: string | null;
  email: string | null;
  profileId: string | null;
  answers: Answers;
  snapshot: FormItem[];
  score: number | null;
  maxScore: number | null;
  released: boolean;
  grading: ManualGrades;
};

const when = (iso: string) => new Date(iso).toLocaleString("en-JM", { timeZone: "America/Jamaica", dateStyle: "medium", timeStyle: "short" });

function Answer({ formId, question, value }: { formId: string; question: Question; value: Answers[string] | undefined }) {
  if (value === undefined) return <p className="fb-no-answer">No answer</p>;
  if (question.type === "file_upload") {
    return (
      <ul className="fb-files">
        {filesOf(value).map((f) => (
          <li key={f.path}>
            <a href={`/admin/forms/${formId}/file?path=${encodeURIComponent(f.path)}`} target="_blank" rel="noopener">
              📎 {f.name}
            </a>{" "}
            <small>{Math.max(1, Math.round(f.size / 1024))} KB</small>
          </li>
        ))}
      </ul>
    );
  }
  if (question.type === "signature") {
    const src = signatureOf(value);
    // eslint-disable-next-line @next/next/no-img-element -- a signature drawn on the form, stored with the response
    return src ? <img className="fb-signature-view" src={src} alt="Signature" /> : null;
  }
  if (question.type === "grid_choice" || question.type === "grid_checkbox") {
    const cells = gridCells(value);
    return (
      <table className="fb-grid-answer">
        <tbody>
          {question.rows.map((row) => {
            const cell = cells[row.id];
            const label = (id: string) => question.columns.find((c) => c.id === id)?.label ?? id;
            return (
              <tr key={row.id}>
                <th scope="row">{row.label}</th>
                <td>{cell === undefined ? "—" : Array.isArray(cell) ? cell.map(label).join(", ") : label(cell)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  }
  return <p className="fb-answer">{answerToText(question, value)}</p>;
}

export function ResponseBrowser({ formId, responses, quiz, focus }: { formId: string; responses: BrowserResponse[]; quiz: boolean; focus: string | null }) {
  const router = useRouter();
  const confirm = useConfirm();
  const [index, setIndex] = useState(() => Math.max(0, focus ? responses.findIndex((r) => r.id === focus) : 0));
  const [marks, setMarks] = useState<Record<string, ManualGrades>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const response = responses[Math.min(index, responses.length - 1)];
  if (!response) return null;
  const questions = response.snapshot.filter(isQuestion);
  const grading = marks[response.id] ?? response.grading;
  const grade = quiz ? gradeResponse(response.snapshot, response.answers, grading) : null;
  const go = (to: number) => {
    setIndex(Math.max(0, Math.min(responses.length - 1, to)));
    setMessage(null);
  };
  const setMark = (questionId: string, patch: { points?: number; feedback?: string }) =>
    setMarks((m) => ({ ...m, [response.id]: { ...grading, [questionId]: { ...grading[questionId], ...patch } } }));

  return (
    <div className="fb-individual">
      <div className="fb-individual-bar">
        <button type="button" className="fb-icon-button" onClick={() => go(index - 1)} disabled={index === 0} aria-label="Newer response">
          ‹
        </button>
        <select aria-label="Choose a response" value={response.id} onChange={(e) => go(responses.findIndex((r) => r.id === e.target.value))}>
          {responses.map((r, i) => (
            <option key={r.id} value={r.id}>
              {i + 1}. {r.name || r.email || "Anonymous"} · {when(r.submittedAt)}
            </option>
          ))}
        </select>
        <button type="button" className="fb-icon-button" onClick={() => go(index + 1)} disabled={index === responses.length - 1} aria-label="Older response">
          ›
        </button>
        <span className="fb-hint">
          {index + 1} of {responses.length}
        </span>
        <span className="fb-spacer" />
        <button type="button" className="fb-button is-secondary" onClick={() => window.print()}>
          Print
        </button>
        <button
          type="button"
          className="fb-button is-danger"
          disabled={pending}
          onClick={async () => {
            if (!(await confirm({ title: "Delete this response?", message: "It's removed for good, with any files it uploaded.", confirmLabel: "Delete" }))) return;
            start(async () => {
              const result = await deleteResponses(formId, [response.id]);
              setMessage(result.message);
              setIndex((i) => Math.max(0, i - (i === responses.length - 1 ? 1 : 0)));
              router.refresh();
            });
          }}
        >
          Delete
        </button>
      </div>

      <article className="fb-response">
        <header>
          <h3>{response.name || "Anonymous response"}</h3>
          <p className="fb-hint">
            {response.email && <>{response.email} · </>}Sent {when(response.submittedAt)}
            {response.updatedAt && new Date(response.updatedAt).getTime() - new Date(response.submittedAt).getTime() > 60000 && <> · changed {when(response.updatedAt)}</>}
            {response.profileId && (
              <>
                {" "}
                · <Link href={`/admin/people/${response.profileId}`}>Member profile</Link>
              </>
            )}
          </p>
          {grade && (
            <p className="fb-score">
              Score <strong>{grade.score}</strong> / {grade.maxScore}
              {grade.needsMarking && <span className="badge gold">Needs marking</span>}
              {response.released ? <span className="badge blue">Released</span> : <span className="badge gray">Not released</span>}
            </p>
          )}
        </header>
        {questions.map((q) => {
          const g = grade?.questions[q.id];
          return (
            <section key={q.id} className={`fb-response-q${g ? (g.correct === true ? " is-right" : g.correct === false ? " is-wrong" : " is-open") : ""}`}>
              <h4>{q.title}</h4>
              <Answer formId={formId} question={q} value={response.answers[q.id]} />
              {g && (
                <div className="fb-mark">
                  <label className="fb-field fb-inline">
                    <span>Points</span>
                    <input
                      type="number"
                      min={0}
                      max={g.max}
                      step="any"
                      value={grading[q.id]?.points ?? g.points}
                      onChange={(e) => setMark(q.id, { points: e.target.value === "" ? undefined : Number(e.target.value) })}
                    />
                    <span>/ {g.max}</span>
                  </label>
                  <input className="fb-feedback" placeholder="Feedback for them (optional)" value={grading[q.id]?.feedback ?? ""} maxLength={1000} onChange={(e) => setMark(q.id, { feedback: e.target.value })} />
                </div>
              )}
            </section>
          );
        })}
        {quiz && (
          <div className="fb-row fb-mark-actions">
            <button
              type="button"
              className="fb-button"
              disabled={pending || !marks[response.id]}
              onClick={() =>
                start(async () => {
                  const result = await gradeFormResponse(formId, response.id, grading);
                  setMessage(result.message);
                  router.refresh();
                })
              }
            >
              Save marks
            </button>
            {!response.released && (
              <button
                type="button"
                className="fb-button is-secondary"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const result = await releaseScores(formId, [response.id], true);
                    setMessage(result.message);
                    router.refresh();
                  })
                }
              >
                Release this score
              </button>
            )}
          </div>
        )}
        {message && (
          <p className="fb-hint" role="status">
            {message}
          </p>
        )}
      </article>
    </div>
  );
}
