"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { getOrganizationId } from "@/lib/auth/session";
import type { ActionState } from "@/app/(public)/actions";

export async function submitDocumentRequest(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const organizationId = await getOrganizationId();
  if (!organizationId) return { status: "error", message: "Something went wrong." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Please sign in again." };

  const { data: profile } = await supabase.from("profiles").select("id").eq("auth_user_id", user.id).maybeSingle();
  if (!profile) return { status: "error", message: "We couldn't find your profile." };

  const templateId = String(formData.get("template_id") || "");
  const purpose = String(formData.get("purpose") || "").trim();
  if (!templateId || !purpose) return { status: "error", message: "Please choose a document type and describe what it's for." };

  const admin = createServiceRoleClient();
  const { data: template } = await admin
    .from("document_templates")
    .select("name")
    .eq("organization_id", organizationId)
    .eq("id", templateId)
    .eq("is_active", true)
    .maybeSingle();
  if (!template) return { status: "error", message: "Choose an available document type." };

  const { error } = await supabase.from("document_requests").insert({
    organization_id: organizationId,
    requester_profile_id: profile.id,
    template_id: templateId,
    title: template.name,
    purpose,
    status: "submitted",
  });

  if (error) return { status: "error", message: "We couldn't submit your request. Please try again." };
  revalidatePath("/member/documents");
  return { status: "success", message: "Request sent to the pastor's office. We'll notify you once it's ready." };
}
