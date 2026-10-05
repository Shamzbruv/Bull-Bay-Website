import { createServiceRoleClient } from "@/lib/supabase/server";
import { templateFields } from "@/lib/documents/design";
import { markBlanks, mergeTemplate } from "@/lib/documents/merge";
import { nameOnDocument } from "@/lib/documents/delivery";
import { draftDocumentPdf, pdfResponse, previewViewer } from "@/lib/documents/preview";

// "Use template" → Preview PDF: the document from what's filled in so far,
// before it's saved or sent. Blanks show as [Field name]; the name it's
// presented to is worked out exactly as sending it will
// (app/(admin)/admin/documents/templates/[id]/use/actions.ts).

export async function POST(incoming: Request, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await previewViewer();
  if (viewer instanceof Response) return viewer;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response("Not found", { status: 404 });
  const form = await incoming.formData().catch(() => null);
  if (!form) return new Response("Bad request", { status: 400 });
  const db = createServiceRoleClient();
  const { data: template } = await db.from("document_templates").select("name,body,layout,design").eq("organization_id", viewer.org).eq("id", id).maybeSingle();
  if (!template) return new Response("Not found", { status: 404 });

  const text = (key: string, max: number) => String(form.get(key) ?? "").trim().slice(0, max);
  const fields: Record<string, string> = {};
  for (const key of templateFields(template.body)) {
    const value = text(`field_${key}`, 5000);
    if (value) fields[key] = value;
  }
  const personId = text("recipient_id", 40);
  const { data: member } = /^[0-9a-f-]{36}$/.test(personId)
    ? await db.from("profiles").select("first_name,last_name").eq("organization_id", viewer.org).eq("id", personId).maybeSingle()
    : { data: null };
  const outside = text("recipient_mode", 20) === "outside";
  const recipientName = nameOnDocument(
    { requester_profile_id: member ? personId : null, recipient_name: outside ? text("outside_name", 200) || null : null, recipient_email: null, details: fields },
    member,
  );

  const bytes = await draftDocumentPdf({
    org: viewer.org,
    title: template.name,
    body: markBlanks(mergeTemplate(template.body, fields).join("\n\n")),
    recipientName,
    template,
    preparedBy: viewer.authUserId,
  });
  return pdfResponse(bytes, `${template.name}-preview.pdf`);
}
