import { getOrganizationId, getUserPermissions } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { definitionOf, type FormRow, type ResponseRow } from "@/lib/forms/server";
import { responsesCsv } from "@/lib/forms/summary";

/** Every response as a spreadsheet (opens in Excel and Google Sheets). */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const org = await getOrganizationId();
  if (!org || !(await getUserPermissions(org)).has("forms.manage")) return new Response("Forbidden", { status: 403 });
  const { id } = await params;
  const db = createServiceRoleClient();
  const { data: form } = await db.from("office_forms").select("*").eq("organization_id", org).eq("id", id).maybeSingle();
  if (!form) return new Response("Not found", { status: 404 });
  const definition = definitionOf(form as unknown as FormRow);
  const { data } = await db.from("form_responses").select("*").eq("form_id", id).order("submitted_at", { ascending: true }).limit(50000);
  const rows = ((data ?? []) as unknown as ResponseRow[]).map((r) => ({
    submittedAt: r.submitted_at,
    name: r.respondent_name,
    email: r.respondent_email,
    score: r.score === null ? null : Number(r.score),
    maxScore: r.max_score === null ? null : Number(r.max_score),
    answers: r.answers,
  }));
  const csv = responsesCsv(definition.items, rows, { quiz: definition.settings.quiz.enabled });
  const name = `${definition.title.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "form"}-responses.csv`;
  return new Response(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "private, no-store" },
  });
}
