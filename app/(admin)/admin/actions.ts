"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { getOrganizationId } from "@/lib/auth/session";
import { SITE_URL } from "@/lib/org";
import { parseJmdToMinorUnits } from "@/lib/money";
import type { ActionState } from "@/app/(public)/actions";

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// People -----------------------------------------------------------------
export async function updateMembershipStatus(profileId: string, status: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("profiles").update({ membership_status: status }).eq("id", profileId);
  revalidatePath("/admin/people");
}

export async function updateVisitorStatus(submissionId: string, status: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("contact_submissions").update({ status }).eq("id", submissionId);
  revalidatePath("/admin/visitors");
}

// Events -------------------------------------------------------------------
export async function saveEvent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const organizationId = await getOrganizationId();
  if (!organizationId) return { status: "error", message: "Something went wrong." };
  const supabase = await createClient();

  const id = String(formData.get("id") || "");
  const title = String(formData.get("title") || "").trim();
  if (!title) return { status: "error", message: "Please enter a title." };
  const startsAt = String(formData.get("starts_at") || "");
  if (!startsAt) return { status: "error", message: "Please choose a start date/time." };

  const payload = {
    organization_id: organizationId,
    slug: slugify(String(formData.get("slug") || title)),
    title,
    category: String(formData.get("category") || "").trim() || null,
    description: String(formData.get("description") || "").trim() || null,
    location_name: String(formData.get("location_name") || "").trim() || null,
    starts_at: new Date(startsAt).toISOString(),
    status: String(formData.get("status") || "draft"),
    visibility: String(formData.get("visibility") || "public"),
  };

  const { error } = id
    ? await supabase.from("events").update(payload).eq("id", id)
    : await supabase.from("events").insert(payload);

  if (error) return { status: "error", message: "We couldn't save this event. Check the slug is unique." };
  revalidatePath("/admin/events");
  revalidatePath("/events");
  redirect("/admin/events");
}

// Groups ---------------------------------------------------------------
export async function saveGroup(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const organizationId = await getOrganizationId();
  if (!organizationId) return { status: "error", message: "Something went wrong." };
  const supabase = await createClient();

  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  if (!name) return { status: "error", message: "Please enter a name." };

  const payload = {
    organization_id: organizationId,
    slug: slugify(String(formData.get("slug") || name)),
    name,
    category: String(formData.get("category") || "").trim() || null,
    description: String(formData.get("description") || "").trim() || null,
    meeting_schedule: String(formData.get("meeting_schedule") || "").trim() || null,
    visibility: String(formData.get("visibility") || "public"),
    is_active: formData.get("is_active") === "on",
  };

  const { error } = id
    ? await supabase.from("groups").update(payload).eq("id", id)
    : await supabase.from("groups").insert(payload);

  if (error) return { status: "error", message: "We couldn't save this group. Check the slug is unique." };
  revalidatePath("/admin/groups");
  revalidatePath("/groups");
  return { status: "success", message: "Group saved." };
}

export async function respondToGroupRequest(memberId: string, approve: boolean): Promise<void> {
  const supabase = await createClient();
  if (approve) {
    await supabase.from("group_members").update({ status: "active" }).eq("id", memberId);
  } else {
    await supabase.from("group_members").delete().eq("id", memberId);
  }
  revalidatePath("/admin/groups");
}

// Volunteers -----------------------------------------------------------
export async function saveVolunteerOpportunity(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const organizationId = await getOrganizationId();
  if (!organizationId) return { status: "error", message: "Something went wrong." };
  const supabase = await createClient();

  const title = String(formData.get("title") || "").trim();
  if (!title) return { status: "error", message: "Please enter a title." };

  const { error } = await supabase.from("volunteer_opportunities").insert({
    organization_id: organizationId,
    title,
    description: String(formData.get("description") || "").trim() || null,
  });

  if (error) return { status: "error", message: "We couldn't save this opportunity." };
  revalidatePath("/admin/volunteers");
  return { status: "success", message: "Volunteer opportunity created." };
}

export async function addVolunteerShift(opportunityId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const startsAt = String(formData.get("starts_at") || "");
  if (!startsAt) return { status: "error", message: "Please choose a date/time." };

  const { error } = await supabase.from("volunteer_shifts").insert({
    opportunity_id: opportunityId,
    starts_at: new Date(startsAt).toISOString(),
    slots: Number(formData.get("slots") || 1),
  });

  if (error) return { status: "error", message: "We couldn't add this shift." };
  revalidatePath("/admin/volunteers");
  return { status: "success", message: "Shift added." };
}

// Giving -----------------------------------------------------------------
export async function saveFund(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const organizationId = await getOrganizationId();
  if (!organizationId) return { status: "error", message: "Something went wrong." };
  const supabase = await createClient();

  const name = String(formData.get("name") || "").trim();
  const code = String(formData.get("code") || "").trim();
  if (!name || !code) return { status: "error", message: "Please enter a name and short code." };

  const { error } = await supabase.from("funds").insert({ organization_id: organizationId, name, code });
  if (error) return { status: "error", message: "We couldn't create this fund. Check the code is unique." };
  revalidatePath("/admin/giving");
  return { status: "success", message: "Fund created." };
}

export async function markDonationCompleted(donationId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("donations").update({ status: "completed" }).eq("id", donationId);
  revalidatePath("/admin/giving");
}

// Shop ---------------------------------------------------------------------
export async function saveProduct(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const organizationId = await getOrganizationId();
  if (!organizationId) return { status: "error", message: "Something went wrong." };
  const supabase = await createClient();

  const name = String(formData.get("name") || "").trim();
  if (!name) return { status: "error", message: "Please enter a product name." };
  const priceMinor = parseJmdToMinorUnits(String(formData.get("price") || ""));
  if (priceMinor === null) return { status: "error", message: "Please enter a valid price." };

  const { data: product, error } = await supabase
    .from("products")
    .insert({
      organization_id: organizationId,
      slug: slugify(String(formData.get("slug") || name)),
      name,
      description: String(formData.get("description") || "").trim() || null,
      kind: String(formData.get("kind") || "physical"),
      status: String(formData.get("status") || "draft"),
      price_minor: priceMinor,
    })
    .select("id, kind")
    .single();

  if (error || !product) return { status: "error", message: "We couldn't save this product. Check the slug is unique." };

  const { data: variant } = await supabase
    .from("product_variants")
    .insert({
      product_id: product.id,
      sku: `${slugify(name).toUpperCase()}-DEFAULT-${Date.now()}`,
      name: "Default",
      track_inventory: product.kind === "physical",
    })
    .select("id")
    .single();

  const initialStock = Number(formData.get("initial_stock") || 0);
  if (variant && product.kind === "physical" && initialStock > 0) {
    await supabase.from("inventory_movements").insert({ variant_id: variant.id, quantity_delta: initialStock, reason: "initial_stock" });
  }

  revalidatePath("/admin/shop");
  revalidatePath("/shop");
  return { status: "success", message: "Product created." };
}

export async function updateOrderStatus(orderId: string, status: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("orders").update({ status }).eq("id", orderId);
  revalidatePath("/admin/shop");
}

// Roles & staff ------------------------------------------------------------
export async function inviteStaffMember(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const organizationId = await getOrganizationId();
  if (!organizationId) return { status: "error", message: "Something went wrong." };

  const email = String(formData.get("email") || "").trim();
  const roleId = String(formData.get("roleId") || "");
  if (!email || !roleId) return { status: "error", message: "Please provide an email and choose a role." };

  const admin = createServiceRoleClient();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${SITE_URL}/auth/callback?next=${encodeURIComponent("/member")}`,
  });

  if (error || !data.user) {
    return { status: "error", message: error?.message ?? "We couldn't send the invitation." };
  }

  const supabase = await createClient();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  const { error: roleError } = await supabase.from("user_roles").insert({
    organization_id: organizationId,
    user_id: data.user.id,
    role_id: roleId,
    granted_by: currentUser?.id,
  });

  if (roleError) {
    return { status: "error", message: "Invitation sent, but the role couldn't be assigned. Assign it manually below." };
  }

  revalidatePath("/admin/roles");
  return { status: "success", message: `Invitation sent to ${email}.` };
}

export async function revokeRole(userRoleId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("user_roles").delete().eq("id", userRoleId);
  revalidatePath("/admin/roles");
}

// Settings -------------------------------------------------------------
export async function saveCampusSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const id = String(formData.get("id") || "");
  if (!id) return { status: "error", message: "Something went wrong." };

  const { error } = await supabase
    .from("campuses")
    .update({
      phone: String(formData.get("phone") || "").trim() || null,
      email: String(formData.get("email") || "").trim() || null,
      livestream_url: String(formData.get("livestream_url") || "").trim() || null,
      address_line1: String(formData.get("address_line1") || "").trim() || null,
      city: String(formData.get("city") || "").trim() || null,
      parish: String(formData.get("parish") || "").trim() || null,
    })
    .eq("id", id);

  if (error) return { status: "error", message: "We couldn't save these settings." };
  revalidatePath("/admin/settings");
  revalidatePath("/");
  revalidatePath("/live");
  revalidatePath("/visit");
  return { status: "success", message: "Settings saved." };
}
