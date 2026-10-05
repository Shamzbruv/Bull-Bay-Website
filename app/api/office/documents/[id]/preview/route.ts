import { createServiceRoleClient } from "@/lib/supabase/server";
import { nameOnDocument } from "@/lib/documents/delivery";
import { markBlanks } from "@/lib/documents/merge";
import { draftDocumentPdf, pdfResponse, previewViewer } from "@/lib/documents/preview";

// A document request as a PDF. GET: as it stands (the issued PDF once it's
// certified). POST: with the text being edited on "Prepare the document",
// before it's saved or sent. Nothing is saved either way.

type Params = { params: Promise<{ id: string }> };

async function loadRequest(org: string, id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const db = createServiceRoleClient();
  const { data: request } = await db.from("document_requests").select("*").eq("organization_id", org).eq("id", id).maybeSingle();
  if (!request) return null;
  const [{ data: member }, { data: template }] = await Promise.all([
    db.from("profiles").select("first_name,last_name").eq("organization_id", org).eq("id", request.requester_profile_id ?? "").maybeSingle(),
    // Before it's prepared a request has no copy of its template yet; the
    // live one is what preparing it will copy.
    request.template_snapshot || !request.template_id
      ? Promise.resolve({ data: null })
      : db.from("document_templates").select("layout,design").eq("organization_id", org).eq("id", request.template_id).maybeSingle(),
  ]);
  return { request, member, template: (request.template_snapshot ?? template) as { layout?: string; design?: unknown } | null };
}

export async function GET(_: Request, { params }: Params) {
  const viewer = await previewViewer();
  if (viewer instanceof Response) return viewer;
  const loaded = await loadRequest(viewer.org, (await params).id);
  if (!loaded) return new Response("Not found", { status: 404 });
  const { request, member, template } = loaded;
  if (request.status === "completed" && request.pdf_path) {
    const { data, error } = await createServiceRoleClient().storage.from("member-resources").download(request.pdf_path);
    if (error || !data) return new Response("PDF unavailable", { status: 503 });
    return pdfResponse(Buffer.from(await data.arrayBuffer()), `${request.document_number || "church-document"}.pdf`);
  }
  // Until it's sent to the Pastor, it's prepared by whoever took it on.
  const bytes = await draftDocumentPdf({
    org: viewer.org,
    title: request.title,
    body: markBlanks(request.prepared_body || ""),
    recipientName: nameOnDocument(request, member),
    template,
    preparedBy: request.prepared_by ?? request.assigned_to,
  });
  return pdfResponse(bytes, "document-preview.pdf");
}

export async function POST(incoming: Request, { params }: Params) {
  const viewer = await previewViewer();
  if (viewer instanceof Response) return viewer;
  const loaded = await loadRequest(viewer.org, (await params).id);
  if (!loaded) return new Response("Not found", { status: 404 });
  const form = await incoming.formData().catch(() => null);
  if (!form) return new Response("Bad request", { status: 400 });
  const { request, member, template } = loaded;
  // Whoever sends it to the Pastor becomes the one who prepared it.
  const bytes = await draftDocumentPdf({
    org: viewer.org,
    title: request.title,
    body: markBlanks(String(form.get("prepared_body") ?? "").trim().slice(0, 30000)),
    recipientName: nameOnDocument(request, member),
    template,
    preparedBy: viewer.authUserId,
  });
  return pdfResponse(bytes, "document-preview.pdf");
}
