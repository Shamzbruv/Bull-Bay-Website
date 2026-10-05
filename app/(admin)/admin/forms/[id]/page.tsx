import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AccessDenied } from "@/components/access-denied";
import { getOrganizationId, getUserPermissions } from "@/lib/auth/session";
import { fullName } from "@/lib/members/name";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { availability } from "@/lib/forms/logic";
import { definitionOf, type FormRow } from "@/lib/forms/server";
import { FormEditor } from "./editor/form-editor";
import { ResponsesPanel } from "./responses/responses-panel";
import { SharePanel } from "./share/share-panel";

export const metadata: Metadata = { title: "Form" };

type Params = { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string; view?: string; response?: string }> };

export default async function FormPage({ params, searchParams }: Params) {
  const { id } = await params;
  const query = await searchParams;
  const org = await getOrganizationId();
  if (!org || !(await getUserPermissions(org)).has("forms.manage")) return <AccessDenied />;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const db = createServiceRoleClient();
  const { data } = await db.from("office_forms").select("*").eq("organization_id", org).eq("id", id).maybeSingle();
  if (!data) notFound();
  const form = data as unknown as FormRow;
  const definition = definitionOf(form);
  const { count } = await db.from("form_responses").select("id", { count: "exact", head: true }).eq("form_id", id);
  const responseCount = count ?? 0;
  const open = availability(definition.settings, responseCount);
  const tab = query.tab === "responses" || query.tab === "settings" || query.tab === "share" ? query.tab : "questions";

  let editor: React.ReactNode = null;
  if (tab === "questions" || tab === "settings") {
    // Staff who could be emailed each response: anyone holding a staff role.
    const { data: roles } = await db.from("roles").select("id, code").eq("organization_id", org).not("code", "in", "(member,group_leader)");
    const { data: grants } = await db.from("user_roles").select("user_id").eq("organization_id", org).in("role_id", (roles ?? []).map((r) => r.id));
    const userIds = [...new Set((grants ?? []).map((g) => g.user_id as string))];
    const { data: people } = userIds.length ? await db.from("profiles").select("id, first_name, last_name, email").eq("organization_id", org).in("auth_user_id", userIds) : { data: [] };
    const staff = (people ?? []).map((p) => ({ id: p.id as string, name: fullName(p) || (p.email as string) || "Staff member", email: (p.email as string | null) ?? null })).sort((a, b) => a.name.localeCompare(b.name));
    editor = <FormEditor key={form.version} formId={form.id} publicId={form.public_id} initial={definition} version={form.version} staff={staff} tab={tab} responseCount={responseCount} />;
  }

  return (
    <>
      <div className="dashboard-header fb-page-head">
        <div>
          <p className="section-kicker">
            <Link href="/admin/forms">← All forms</Link>
          </p>
          <h1>{definition.title}</h1>
          <p>
            <span className={`badge ${open.open ? "blue" : "gray"}`}>{open.open ? "Accepting responses" : open.reason === "not_yet_open" ? "Opens later" : "Closed"}</span>{" "}
            {responseCount} {responseCount === 1 ? "response" : "responses"}
          </p>
        </div>
      </div>
      {editor ?? (
        <>
          <nav className="fb-tabs is-links" aria-label="Form">
            <Link href={`/admin/forms/${id}`}>Questions</Link>
            <Link href={`/admin/forms/${id}?tab=responses`} className={tab === "responses" ? "is-on" : ""} aria-current={tab === "responses" ? "page" : undefined}>
              Responses{responseCount ? ` (${responseCount})` : ""}
            </Link>
            <Link href={`/admin/forms/${id}?tab=settings`}>Settings</Link>
            <Link href={`/admin/forms/${id}?tab=share`} className={tab === "share" ? "is-on" : ""} aria-current={tab === "share" ? "page" : undefined}>
              Share
            </Link>
          </nav>
          {tab === "responses" ? (
            <ResponsesPanel form={form} definition={definition} view={query.view === "individual" ? "individual" : "summary"} focus={query.response ?? null} />
          ) : (
            <SharePanel form={form} definition={definition} />
          )}
        </>
      )}
    </>
  );
}
