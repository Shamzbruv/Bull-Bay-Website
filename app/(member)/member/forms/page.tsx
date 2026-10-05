import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { availability } from "@/lib/forms/logic";
import { definitionOf, type FormRow } from "@/lib/forms/server";

export const metadata: Metadata = { title: "Forms" };

const when = (iso: string) => new Date(iso).toLocaleDateString("en-JM", { timeZone: "America/Jamaica", dateStyle: "medium" });

/** A member's forms: what the office has asked them to fill in, forms open
 *  to every member, and what they've already sent. */
export default async function MemberFormsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?next=/member/forms");
  const db = createServiceRoleClient();
  const [{ data: forms }, { data: invites }, { data: mine }] = await Promise.all([
    db.from("office_forms").select("*").eq("organization_id", profile.organization_id).eq("is_active", true),
    db.from("form_assignments").select("form_id, created_at, expires_at").eq("recipient_profile_id", profile.id).is("submitted_at", null),
    db.from("form_responses").select("id, form_id, submitted_at, updated_at, score, max_score, score_released").eq("respondent_profile_id", profile.id).order("submitted_at", { ascending: false }).limit(200),
  ]);
  const byId = new Map(((forms ?? []) as unknown as FormRow[]).map((f) => [f.id, { form: f, definition: definitionOf(f) }]));
  const answered = new Set((mine ?? []).map((r) => r.form_id as string));
  const now = new Date();
  const asked = (invites ?? []).filter((i) => new Date(i.expires_at as string) > now && byId.has(i.form_id as string) && !answered.has(i.form_id as string));
  const askedIds = new Set(asked.map((i) => i.form_id as string));
  const open = [...byId.values()].filter(({ form, definition }) => {
    const s = definition.settings;
    if (!s.listInMemberPortal || askedIds.has(form.id)) return false;
    if (s.limitOneResponse && answered.has(form.id)) return false;
    return availability(s, 0, now).open;
  });

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1>Forms</h1>
          <p>Sign-ups, registrations and surveys from the church, and the ones you&apos;ve already sent.</p>
        </div>
      </div>

      {asked.length > 0 && (
        <section className="panel">
          <h2>Waiting for you</h2>
          <div className="mf-list">
            {asked.map((invite) => {
              const entry = byId.get(invite.form_id as string)!;
              return (
                <a key={entry.form.id} className="mf-card is-asked" href={`/f/${entry.form.public_id}`}>
                  <strong>{entry.definition.title}</strong>
                  <small>The church office asked you to fill this in on {when(invite.created_at as string)}.</small>
                  <span className="mf-go">Fill it in →</span>
                </a>
              );
            })}
          </div>
        </section>
      )}

      <section className="panel">
        <h2>Open to members</h2>
        {!open.length && <p className="panel-empty">Nothing open right now. Forms the church shares with members will appear here.</p>}
        <div className="mf-list">
          {open.map(({ form, definition }) => (
            <a key={form.id} className="mf-card" href={`/f/${form.public_id}`}>
              <strong>{definition.title}</strong>
              {definition.description && <small>{definition.description.slice(0, 160)}{definition.description.length > 160 ? "…" : ""}</small>}
              {definition.settings.closesAt && <small>Closes {when(definition.settings.closesAt)}</small>}
              <span className="mf-go">Open →</span>
            </a>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>What you&apos;ve sent</h2>
        {!(mine ?? []).length && <p className="panel-empty">Forms you fill in while signed in will be listed here.</p>}
        <ul className="mf-sent">
          {(mine ?? []).map((r) => {
            const entry = byId.get(r.form_id as string);
            if (!entry) return null;
            const s = entry.definition.settings;
            return (
              <li key={r.id as string}>
                <span>
                  <strong>{entry.definition.title}</strong>
                  <small>Sent {when(r.submitted_at as string)}</small>
                </span>
                {s.quiz.enabled && (r.score_released ? <span className="badge blue">Score {Number(r.score)} / {Number(r.max_score)}</span> : <span className="badge gray">Score not released yet</span>)}
                {s.allowEdit && availability(s, 0, now).open && (
                  <a className="secondary-button compact" href={`/f/${entry.form.public_id}?mine=${r.id}`}>
                    Change answers
                  </a>
                )}
                {s.showResultsSummary && (
                  <a className="secondary-button compact" href={`/f/${entry.form.public_id}/results`}>
                    See results
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
