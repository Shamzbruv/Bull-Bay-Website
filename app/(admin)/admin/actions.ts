"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { getOrganizationId, getUserPermissions } from "@/lib/auth/session";
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

// Church direction (movements, goals, priorities) --------------------------
export async function toggleGoalVisibility(goalId: string, publicVisible: boolean): Promise<void> {
  const supabase = await createClient();
  await supabase.from("strategic_goals").update({ public_visible: publicVisible }).eq("id", goalId);
  revalidatePath("/admin/direction");
  revalidatePath("/direction");
}

export async function updateGoalStatus(goalId: string, status: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("strategic_goals").update({ status }).eq("id", goalId);
  revalidatePath("/admin/direction");
  revalidatePath("/pastor/direction");
}

export async function togglePriorityVisibility(priorityId: string, publicVisible: boolean): Promise<void> {
  const supabase = await createClient();
  await supabase.from("strategic_priorities").update({ public_visible: publicVisible }).eq("id", priorityId);
  revalidatePath("/admin/direction");
  revalidatePath("/direction");
}

// Ministry assignments -------------------------------------------------
export async function toggleAssignmentVisibility(assignmentId: string, publicVisible: boolean): Promise<void> {
  const supabase = await createClient();
  await supabase.from("ministry_assignments").update({ public_visible: publicVisible }).eq("id", assignmentId);
  revalidatePath("/admin/ministry-assignments");
  revalidatePath("/ministries");
}

export async function toggleAssignmentActive(assignmentId: string, isActive: boolean): Promise<void> {
  const supabase = await createClient();
  await supabase.from("ministry_assignments").update({ is_active: isActive }).eq("id", assignmentId);
  revalidatePath("/admin/ministry-assignments");
}

/** Deliberately requires a staff member to type the exact email of the
 * profile they intend to link — never an automatic name match. */
export async function linkAssignmentToProfile(assignmentId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") || "").trim();
  if (!email) return { status: "error", message: "Enter the member's email address." };

  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("id, first_name, last_name").eq("email", email).maybeSingle();
  if (!profile) return { status: "error", message: "No profile found with that email." };

  const { error } = await supabase.from("ministry_assignments").update({ profile_id: profile.id }).eq("id", assignmentId);
  if (error) return { status: "error", message: "Couldn't link this row." };
  revalidatePath("/admin/ministry-assignments");
  const name = `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim();
  return { status: "success", message: name ? `Linked to ${name}.` : "Linked." };
}

export async function unlinkAssignmentFromProfile(assignmentId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("ministry_assignments").update({ profile_id: null }).eq("id", assignmentId);
  revalidatePath("/admin/ministry-assignments");
}

// Annual plan --------------------------------------------------------------
export async function saveAnnualPlanItem(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const organizationId = await getOrganizationId();
  if (!organizationId) return { status: "error", message: "Something went wrong." };
  const supabase = await createClient();
  const { data: churchYear } = await supabase.from("church_years").select("id").eq("status", "active").maybeSingle();
  if (!churchYear) return { status: "error", message: "No active church year found." };

  const title = String(formData.get("title") || "").trim();
  if (!title) return { status: "error", message: "Please enter a title." };

  const { error } = await supabase.from("annual_plan_items").insert({
    organization_id: organizationId,
    church_year_id: churchYear.id,
    title,
    description: String(formData.get("description") || "").trim() || null,
    category: String(formData.get("category") || "").trim() || null,
    month: String(formData.get("month") || "").trim(),
  });

  if (error) return { status: "error", message: "We couldn't save this plan item." };
  revalidatePath("/admin/annual-plan");
  return { status: "success", message: "Plan item added." };
}

export async function updateAnnualPlanItemStatus(itemId: string, status: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("annual_plan_items").update({ status }).eq("id", itemId);
  revalidatePath("/admin/annual-plan");
}

/** The only path from an internal plan item to a real, manageable event —
 * staff must supply the exact date/time before anything can be published. */
export async function promoteAnnualPlanItemToEvent(itemId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const organizationId = await getOrganizationId();
  if (!organizationId) return { status: "error", message: "Something went wrong." };
  const supabase = await createClient();

  const { data: item } = await supabase.from("annual_plan_items").select("*").eq("id", itemId).single();
  if (!item) return { status: "error", message: "Plan item not found." };

  const startsAt = String(formData.get("starts_at") || "");
  if (!startsAt) return { status: "error", message: "Please choose a date and time." };

  function slugify(input: string) {
    return input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  }

  const { data: event, error } = await supabase
    .from("events")
    .insert({
      organization_id: organizationId,
      slug: slugify(`${item.title}-${item.month}`),
      title: item.title,
      description: item.description,
      category: item.category,
      location_name: String(formData.get("location_name") || "").trim() || null,
      starts_at: new Date(startsAt).toISOString(),
      status: "draft",
      visibility: String(formData.get("visibility") || "public"),
    })
    .select("id")
    .single();

  if (error || !event) return { status: "error", message: "We couldn't create the event. Check the title/date." };

  await supabase.from("annual_plan_items").update({ status: "ready_to_publish", event_id: event.id }).eq("id", itemId);
  revalidatePath("/admin/annual-plan");
  revalidatePath("/admin/events");
  return { status: "success", message: "Draft event created — review and publish it from Admin → Events." };
}

// Conference document --------------------------------------------------
const CONFERENCE_DOCUMENT_PATH = "conference/Bull_Bay_Church_Members_Conference_2026-2027.pptx";

export async function uploadConferenceDocument(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const organizationId = await getOrganizationId();
  const permissions = organizationId ? await getUserPermissions(organizationId) : new Set<string>();
  if (!permissions.has("direction.manage")) return { status: "error", message: "You don't have permission to do this." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { status: "error", message: "Please choose a file." };

  const admin = createServiceRoleClient();
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await admin.storage.from("member-resources").upload(CONFERENCE_DOCUMENT_PATH, buffer, {
    contentType: file.type || "application/octet-stream",
    upsert: true,
  });

  if (error) return { status: "error", message: "Upload failed. Please try again." };
  revalidatePath("/admin/conference-document");
  return { status: "success", message: "Conference document updated." };
}
