"use client";

import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { QuestionSummary } from "@/lib/forms/summary";

// Charts for each question's answers, like Google Forms' and Microsoft
// Forms' summary view.

const PALETTE = ["#173f89", "#c9922b", "#6a7e30", "#8a4f9e", "#2b8f9e", "#c1533b", "#4c6ef5", "#d9480f", "#5c940d", "#862e9c"];

export type SummaryBlock = { id: string; title: string; type: string; summary: QuestionSummary };

const pct = (n: number, total: number) => (total ? `${Math.round((n / total) * 100)}%` : "0%");

function Responses({ n }: { n: number }) {
  return <p className="fs-count">{n === 1 ? "1 response" : `${n} responses`}</p>;
}

function ChoiceChart({ summary }: { summary: Extract<QuestionSummary, { kind: "choice" }> }) {
  const data = summary.counts.filter((c) => c.count > 0 || !summary.multi);
  const total = summary.answered;
  if (!summary.multi) {
    const pie = data.filter((d) => d.count > 0);
    return (
      <div className="fs-split">
        <div className="fs-pie">
          {pie.length ? (
            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Pie data={pie} dataKey="count" nameKey="label" innerRadius={48} outerRadius={92} paddingAngle={pie.length > 1 ? 1 : 0} stroke={pie.length > 1 ? "#fff" : "none"} isAnimationActive={false}>
                  {pie.map((d, i) => (
                    <Cell key={d.id} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} (${pct(Number(value), total)})`, ""]} />
              </PieChart>
            </ResponsiveContainer>
          ) : null}
        </div>
        <ul className="fs-legend">
          {data.map((d) => (
            <li key={d.id}>
              <span className="fs-swatch" style={{ background: d.count ? PALETTE[pie.findIndex((p) => p.id === d.id) % PALETTE.length] : "#d8dce4" }} />
              <span className="fs-legend-label">{d.label}</span>
              <span className="fs-legend-n">
                {d.count} · {pct(d.count, total)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={Math.max(120, summary.counts.length * 34 + 20)}>
      <BarChart data={summary.counts} layout="vertical" margin={{ top: 4, right: 40, left: 8, bottom: 4 }}>
        <XAxis type="number" allowDecimals={false} hide />
        <YAxis type="category" dataKey="label" width={180} tick={{ fontSize: 12, fill: "#3b4660" }} />
        <Tooltip formatter={(value) => [`${value} (${pct(Number(value), total)})`, "Chosen by"]} />
        <Bar dataKey="count" fill={PALETTE[0]} radius={[0, 6, 6, 0]} isAnimationActive={false} label={{ position: "right", fontSize: 12, fill: "#3b4660" }} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function ScaleChart({ summary }: { summary: Extract<QuestionSummary, { kind: "scale" }> }) {
  return (
    <>
      {summary.average !== null && (
        <p className="fs-stat">
          Average <strong>{summary.average.toFixed(1)}</strong>
        </p>
      )}
      {summary.nps && (
        <div className="fs-nps">
          <p className="fs-stat">
            Net Promoter Score <strong>{summary.nps.score > 0 ? `+${summary.nps.score}` : summary.nps.score}</strong>
          </p>
          <p className="fs-nps-parts">
            <span className="is-promoters">Promoters (9–10): {summary.nps.promoters}</span>
            <span>Passives (7–8): {summary.nps.passives}</span>
            <span className="is-detractors">Detractors (0–6): {summary.nps.detractors}</span>
          </p>
        </div>
      )}
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={summary.counts} margin={{ top: 16, right: 8, left: -24, bottom: 0 }}>
          <XAxis dataKey="value" tick={{ fontSize: 12, fill: "#3b4660" }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#667085" }} />
          <Tooltip formatter={(value) => [value, "Responses"]} labelFormatter={(label) => `Chose ${label}`} />
          <Bar dataKey="count" radius={[6, 6, 0, 0]} isAnimationActive={false} label={{ position: "top", fontSize: 11, fill: "#3b4660" }}>
            {summary.counts.map((c) => (
              <Cell key={c.value} fill={summary.nps ? (c.value >= 9 ? "#2f7d3a" : c.value >= 7 ? "#c9922b" : "#c1533b") : PALETTE[0]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </>
  );
}

function GridTable({ summary }: { summary: Extract<QuestionSummary, { kind: "grid" }> }) {
  const max = Math.max(1, ...summary.rows.flatMap((r) => r.counts.map((c) => c.count)));
  const columns = summary.rows[0]?.counts ?? [];
  return (
    <div className="fs-grid-wrap">
      <table className="fs-grid">
        <thead>
          <tr>
            <th />
            {columns.map((c) => (
              <th key={c.id}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {summary.rows.map((row) => (
            <tr key={row.id}>
              <th scope="row">{row.label}</th>
              {row.counts.map((c) => (
                <td key={c.id} style={{ background: `rgba(23, 63, 137, ${(c.count / max) * 0.75})`, color: c.count / max > 0.5 ? "#fff" : "#1d2b45" }}>
                  {c.count}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SummaryCharts({ blocks, showText }: { blocks: SummaryBlock[]; showText: boolean }) {
  return (
    <div className="fs-list">
      {blocks.map(({ id, title, summary }) => (
        <section key={id} className="fs-card">
          <h3>{title}</h3>
          <Responses n={summary.answered} />
          {summary.answered === 0 ? (
            <p className="fs-empty">No answers yet.</p>
          ) : summary.kind === "choice" ? (
            <>
              <ChoiceChart summary={summary} />
              {showText && summary.other.length > 0 && (
                <details className="fs-other">
                  <summary>&ldquo;Other&rdquo; answers ({summary.other.length})</summary>
                  <ul>
                    {summary.other.map((o, i) => (
                      <li key={i}>{o}</li>
                    ))}
                  </ul>
                </details>
              )}
            </>
          ) : summary.kind === "scale" ? (
            <ScaleChart summary={summary} />
          ) : summary.kind === "grid" ? (
            <GridTable summary={summary} />
          ) : summary.kind === "ranking" ? (
            <ol className="fs-rank">
              {summary.averages.map((a) => (
                <li key={a.id}>
                  <span>{a.label}</span>
                  <small>average place {a.average ? a.average.toFixed(1) : "—"}</small>
                </li>
              ))}
            </ol>
          ) : summary.kind === "number" ? (
            <>
              <p className="fs-stat">
                Average <strong>{summary.average?.toFixed(2) ?? "—"}</strong> · lowest {summary.min ?? "—"} · highest {summary.max ?? "—"}
              </p>
              {showText && <AnswerList values={summary.values.map(String)} />}
            </>
          ) : summary.kind === "text" ? (
            showText ? <AnswerList values={summary.values} /> : <p className="fs-empty">Written answers are only shown to the church office.</p>
          ) : summary.kind === "files" ? (
            <p className="fs-stat">{summary.files} {summary.files === 1 ? "file" : "files"} uploaded</p>
          ) : (
            <p className="fs-stat">{summary.answered} completed</p>
          )}
        </section>
      ))}
    </div>
  );
}

function AnswerList({ values }: { values: string[] }) {
  const shown = values.slice(0, 50);
  return (
    <ul className="fs-answers">
      {shown.map((v, i) => (
        <li key={i}>{v}</li>
      ))}
      {values.length > shown.length && <li className="fs-more">…and {values.length - shown.length} more (see Individual or download the spreadsheet)</li>}
    </ul>
  );
}
