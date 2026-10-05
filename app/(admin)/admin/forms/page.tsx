import type { Metadata } from "next";
import Link from "next/link";
import { AccessDenied } from "@/components/access-denied";
import { getOrganizationId, getUserPermissions } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { availability } from "@/lib/forms/logic";
import { isQuestion } from "@/lib/forms/schema";
import { definitionOf, type FormRow } from "@/lib/forms/server";
import { FORM_TEMPLATES } from "@/lib/forms/templates";
import { FormCardActions, NewFormGallery } from "./forms-list-client";

export const metadata: Metadata = { title: "Forms" };

const when = (iso: string) => new Date(iso).toLocaleDateString("en-JM", { timeZone: "America/Jamaica", dateStyle: "medium" });

export default async function FormsPage() {
  const org = await getOrganizationId();
  if (!org || !(await getUserPermissions(org)).has("forms.manage")) return <AccessDenied />;
  const db = createServiceRoleClient();
  const [{ data: forms }, { data: responses }] = await Promise.all([
    db.from("office_forms").select("*").eq("organization_id", org).order("updated_at", { ascending: false }),
    db.from("form_responses").select("form_id, submitted_at").eq("organization_id", org).order("submitted_at", { ascending: false }).limit(20000),
  ]);
  const stats = new Map<string, { count: number; latest: string }>();
  for (const r of responses ?? []) {
    const s = stats.get(r.form_id as string);
    if (s) s.count++;
    else stats.set(r.form_id as string, { count: 1, latest: r.submitted_at as string });
  }
  const rows = ((forms ?? []) as unknown as FormRow[]).map((form) => {
    const definition = definitionOf(form);
    const s = stats.get(form.id);
    const open = availability(definition.settings, s?.count ?? 0);
    return { form, definition, count: s?.count ?? 0, latest: s?.latest ?? null, open };
  });

  return (
    <>
      <div className="dashboard-header">
        <div>
          <p className="section-kicker">Church office</p>
          <h1>Forms</h1>
          <p>Sign-ups, registrations, surveys, applications and quizzes, with every response in one place.</p>
        </div>
      </div>

      <section className="panel">
        <h2>Start a new form</h2>
        <NewFormGallery templates={FORM_TEMPLATES.map((t) => ({ id: t.id, name: t.name, description: t.description, icon: t.icon }))} />
      </section>

      <section className="panel">
        <h2>Your forms</h2>
        {!rows.length && <p className="panel-empty">No forms yet. Start one above.</p>}
        <div className="fl-list">
          {rows.map(({ form, definition, count, latest, open }) => (
            <article key={form.id} className="fl-card">
              <Link href={`/admin/forms/${form.id}`} className="fl-main" style={{ ["--fl-accent" as string]: definition.settings.theme.accent } as React.CSSProperties}>
                <span className="fl-stripe" aria-hidden="true" />
                <span className="fl-title">{definition.title}</span>
                <span className="fl-meta">
                  {definition.items.filter(isQuestion).length} questions · edited {when(form.updated_at)}
                  {definition.settings.quiz.enabled && " · quiz"}
                </span>
                <span className="fl-badges">
                  <span className={`badge ${open.open ? "blue" : "gray"}`}>{open.open ? "Accepting" : open.reason === "not_yet_open" ? "Opens later" : "Closed"}</span>
                  {definition.settings.listInMemberPortal && <span className="badge">In member portal</span>}
                  {definition.settings.requireSignIn && <span className="badge">Members only</span>}
                </span>
              </Link>
              <div className="fl-side">
                <Link href={`/admin/forms/${form.id}?tab=responses`} className="fl-count">
                  <strong>{count}</strong> {count === 1 ? "response" : "responses"}
                  {latest && <small>latest {when(latest)}</small>}
                </Link>
                <FormCardActions formId={form.id} publicId={form.public_id} title={definition.title} responseCount={count} />
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
