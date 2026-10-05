import Link from "next/link";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { SummaryCharts, type SummaryBlock } from "@/components/forms/summary-charts";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { isQuestion, type FormDefinition } from "@/lib/forms/schema";
import { gradeResponse } from "@/lib/forms/score";
import type { FormRow, ResponseRow } from "@/lib/forms/server";
import { summarize } from "@/lib/forms/summary";
import { AcceptingToggle, DeleteAllResponses, ReleaseAllScores } from "./response-actions";
import { ResponseBrowser, type BrowserResponse } from "./response-browser";

/** Responses: a summary with charts, or one response at a time. */
export async function ResponsesPanel({ form, definition, view, focus }: { form: FormRow; definition: FormDefinition; view: "summary" | "individual"; focus: string | null }) {
  const { data } = await createServiceRoleClient().from("form_responses").select("*").eq("form_id", form.id).order("submitted_at", { ascending: false }).limit(2000);
  const rows = (data ?? []) as unknown as ResponseRow[];
  const questions = definition.items.filter(isQuestion);
  const quiz = definition.settings.quiz.enabled;
  const unreleased = quiz ? rows.filter((r) => !r.score_released).length : 0;
  const base = `/admin/forms/${form.id}?tab=responses`;

  let insights: React.ReactNode = null;
  if (quiz && rows.length) {
    const scored = rows.filter((r) => r.max_score);
    const percents = scored.map((r) => (Number(r.score) / Number(r.max_score)) * 100);
    const average = percents.length ? percents.reduce((a, b) => a + b, 0) / percents.length : 0;
    const missed = questions
      .filter((q) => q.quiz?.points)
      .map((q) => {
        const graded = rows.map((r) => gradeResponse(r.form_snapshot, r.answers, r.grading).questions[q.id]).filter(Boolean);
        const right = graded.filter((g) => g!.correct === true).length;
        return { id: q.id, title: q.title, rate: graded.length ? right / graded.length : 0 };
      })
      .sort((a, b) => a.rate - b.rate)
      .slice(0, 3);
    insights = (
      <section className="fs-card fs-insights">
        <h3>Quiz insights</h3>
        <p className="fs-stat">
          Average <strong>{Math.round(average)}%</strong> · highest {percents.length ? Math.round(Math.max(...percents)) : 0}% · lowest {percents.length ? Math.round(Math.min(...percents)) : 0}%
        </p>
        {missed.length > 0 && (
          <>
            <p className="fb-sub">Most often missed</p>
            <ul className="fs-answers">
              {missed.map((m) => (
                <li key={m.id}>
                  {m.title} <small>({Math.round(m.rate * 100)}% right)</small>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    );
  }

  const profileIds = [...new Set(rows.flatMap((r) => (r.respondent_profile_id ? [r.respondent_profile_id] : [])))];
  const browser: BrowserResponse[] = rows.map((r) => ({
    id: r.id,
    submittedAt: r.submitted_at,
    updatedAt: r.updated_at,
    name: r.respondent_name,
    email: r.respondent_email,
    profileId: r.respondent_profile_id,
    answers: r.answers,
    snapshot: Array.isArray(r.form_snapshot) && r.form_snapshot.length ? r.form_snapshot : definition.items,
    score: r.score === null ? null : Number(r.score),
    maxScore: r.max_score === null ? null : Number(r.max_score),
    released: r.score_released,
    grading: r.grading ?? {},
  }));

  return (
    <div className="fb-responses">
      <RealtimeRefresh tables={["form_responses"]} />
      <div className="fb-responses-bar">
        <h2>
          {rows.length} {rows.length === 1 ? "response" : "responses"}
        </h2>
        <AcceptingToggle formId={form.id} accepting={definition.settings.accepting} />
        <span className="fb-spacer" />
        {rows.length > 0 && (
          <a className="fb-button is-secondary" href={`/admin/forms/${form.id}/export`}>
            Download spreadsheet
          </a>
        )}
        {unreleased > 0 && <ReleaseAllScores formId={form.id} count={unreleased} />}
        {rows.length > 0 && <DeleteAllResponses formId={form.id} count={rows.length} />}
      </div>
      {profileIds.length > 0 && <p className="fb-hint">{profileIds.length} of these came from signed-in members; open a response to see their profile.</p>}
      <nav className="fb-view-switch" aria-label="View">
        <Link href={base} className={view === "summary" ? "is-on" : ""} aria-current={view === "summary" ? "page" : undefined}>
          Summary
        </Link>
        <Link href={`${base}&view=individual`} className={view === "individual" ? "is-on" : ""} aria-current={view === "individual" ? "page" : undefined}>
          Individual
        </Link>
      </nav>
      {rows.length === 0 ? (
        <section className="fs-card">
          <p className="fs-empty">No responses yet. Share the form from the Share tab; responses appear here as they arrive.</p>
        </section>
      ) : view === "summary" ? (
        <>
          {insights}
          <SummaryCharts
            showText
            blocks={questions.map<SummaryBlock>((q) => ({ id: q.id, title: q.title, type: q.type, summary: summarize(q, rows.map((r) => ({ answers: r.answers, snapshot: r.form_snapshot }))) }))}
          />
        </>
      ) : (
        <ResponseBrowser formId={form.id} responses={browser} quiz={quiz} focus={focus} />
      )}
    </div>
  );
}
