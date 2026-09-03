"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationId } from "@/lib/auth/session";
import type { ActionState } from "@/app/(public)/actions";

function slugify(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function saveTemplate(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const organizationId = await getOrganizationId();
  if (!organizationId) return { status: "error", message: "Something went wrong." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const name = String(formData.get("name") || "").trim();
  const body = String(formData.get("body") || "").trim();
  if (!name || !body) return { status: "error", message: "Please provide a name and the document body." };

  const { error } = await supabase.from("document_templates").insert({
    organization_id: organizationId,
    slug: slugify(name),
    name,
    description: String(formData.get("description") || "").trim() || null,
    category: String(formData.get("category") || "").trim() || null,
    body,
    created_by: user?.id ?? null,
  });

  if (error) return { status: "error", message: "We couldn't save this template. Check the name is unique." };
  revalidatePath("/admin/documents");
  return { status: "success", message: "Template saved." };
}

export async function toggleTemplateActive(templateId: string, isActive: boolean): Promise<void> {
  const supabase = await createClient();
  await supabase.from("document_templates").update({ is_active: isActive }).eq("id", templateId);
  revalidatePath("/admin/documents");
}

export async function claimRequest(requestId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await supabase.from("document_requests").update({ status: "in_review", assigned_to: user?.id }).eq("id", requestId);
  revalidatePath("/admin/documents");
}

export async function prepareRequest(requestId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const preparedBody = String(formData.get("prepared_body") || "").trim();
  if (!preparedBody) return { status: "error", message: "Please write the document body." };

  const { error } = await supabase
    .from("document_requests")
    .update({ prepared_body: preparedBody, status: "pending_pastor" })
    .eq("id", requestId);

  if (error) return { status: "error", message: "Couldn't save this document." };
  revalidatePath("/admin/documents");
  revalidatePath("/pastor/documents");
  return { status: "success", message: "Sent to the pastor's desk for review and certification." };
}

export async function denyRequest(requestId: string, reason: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("document_requests").update({ status: "denied", denial_reason: reason }).eq("id", requestId);
  revalidatePath("/admin/documents");
}
