"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationId, getUserPermissions } from "@/lib/auth/session";
import type { ActionState } from "@/app/(public)/actions";

function slugify(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function saveTemplate(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const organizationId = await getOrganizationId();
  const permissions = organizationId ? await getUserPermissions(organizationId) : new Set<string>();
  if (!organizationId || !permissions.has("documents.manage")) {
    return { status: "error", message: "You don't have permission to manage document templates." };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const name = String(formData.get("name") || "").trim();
  const body = String(formData.get("body") || "").trim();
  const id = String(formData.get("id") || "");
  if (!name || !body) return { status: "error", message: "Please provide a name and the document body." };

  const payload = {
    organization_id: organizationId,
    slug: slugify(name),
    name,
    description: String(formData.get("description") || "").trim() || null,
    category: String(formData.get("category") || "").trim() || null,
    body,
  };

  const { error } = id
    ? await supabase.from("document_templates").update(payload).eq("organization_id", organizationId).eq("id", id)
    : await supabase.from("document_templates").insert({ ...payload, created_by: user?.id ?? null });

  if (error) return { status: "error", message: "We couldn't save this template. Check the name is unique." };
  revalidatePath("/admin/documents");
  revalidatePath("/member/documents");
  return { status: "success", message: id ? "Template updated." : "Template created." };
}

export async function toggleTemplateActive(templateId: string, isActive: boolean): Promise<ActionState> {
  const organizationId = await getOrganizationId();
  const permissions = organizationId ? await getUserPermissions(organizationId) : new Set<string>();
  if (!organizationId || !permissions.has("documents.manage")) {
    return { status: "error", message: "You don't have permission to change this template." };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("document_templates")
    .update({ is_active: isActive })
    .eq("organization_id", organizationId)
    .eq("id", templateId);
  if (error) return { status: "error", message: "The template status could not be changed." };
  revalidatePath("/admin/documents");
  revalidatePath("/member/documents");
  return { status: "success", message: isActive ? "Template is available to members." : "Template hidden from new requests." };
}

export async function claimRequest(requestId: string): Promise<ActionState> {
  const organizationId = await getOrganizationId();
  const permissions = organizationId ? await getUserPermissions(organizationId) : new Set<string>();
  if (!organizationId || !permissions.has("documents.manage")) {
    return { status: "error", message: "You don't have permission to prepare documents." };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("document_requests")
    .update({ status: "in_review", assigned_to: user?.id })
    .eq("organization_id", organizationId)
    .eq("id", requestId);
  if (error) return { status: "error", message: "The request could not be assigned. Try again." };
  revalidatePath("/admin/documents");
  return { status: "success", message: "Request assigned to you." };
}

export async function prepareRequest(requestId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const organizationId = await getOrganizationId();
  const permissions = organizationId ? await getUserPermissions(organizationId) : new Set<string>();
  if (!organizationId || !permissions.has("documents.manage")) {
    return { status: "error", message: "You don't have permission to prepare documents." };
  }
  const supabase = await createClient();
  const preparedBody = String(formData.get("prepared_body") || "").trim();
  if (!preparedBody) return { status: "error", message: "Please write the document body." };

  const { error } = await supabase
    .from("document_requests")
    .update({ prepared_body: preparedBody, status: "pending_pastor" })
    .eq("organization_id", organizationId)
    .eq("id", requestId);

  if (error) return { status: "error", message: "Couldn't save this document." };
  revalidatePath("/admin/documents");
  revalidatePath("/pastor/documents");
  return { status: "success", message: "Sent to the pastor's desk for review and certification." };
}

export async function denyRequest(requestId: string, reason: string): Promise<ActionState> {
  const organizationId = await getOrganizationId();
  const permissions = organizationId ? await getUserPermissions(organizationId) : new Set<string>();
  if (!organizationId || !permissions.has("documents.manage")) {
    return { status: "error", message: "You don't have permission to deny document requests." };
  }
  if (!reason.trim()) return { status: "error", message: "Add a reason for the member." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("document_requests")
    .update({ status: "denied", denial_reason: reason.trim() })
    .eq("organization_id", organizationId)
    .eq("id", requestId);
  if (error) return { status: "error", message: "The request could not be updated." };
  revalidatePath("/admin/documents");
  revalidatePath("/member/documents");
  return { status: "success", message: "Request declined and returned to the member." };
}
